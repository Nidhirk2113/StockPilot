import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/, 'SKU may contain letters, numbers, hyphens, and underscores'),
  category: z.string().trim().min(1).max(60),
  price: z.coerce.number().finite().min(0).max(100000000),
  stock: z.coerce.number().int().min(0).max(100000000),
  reorderAt: z.coerce.number().int().min(0).max(100000000).default(5)
});
const idSchema = z.string().min(1).max(100);
const salesRecordSchema = z.object({
  date: z.string().date(),
  product: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80).default('Uncategorized'),
  unitsSold: z.number().int().min(0).max(2147483647),
  revenue: z.number().finite().min(0).max(1000000000000).nullable().optional(),
  source: z.string().trim().min(1).max(120).default('CSV upload')
});

const productPayload = product => ({ ...product, price: Number(product.price) });
const salesPayload = record => ({
  id: record.id,
  date: record.saleDate.toISOString().slice(0, 10),
  productId: record.productId,
  product: record.productName,
  category: record.category,
  unitsSold: record.unitsSold,
  revenue: record.revenue === null ? null : Number(record.revenue),
  source: record.source
});

export function createApp({ prisma, clientOrigin = 'http://localhost:5173' }) {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: clientOrigin.split(',').map(value => value.trim()), methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'stockpilot-api' }));

  app.get('/api/products', async (req, res, next) => {
    try {
      const { q, category, status } = req.query;
      const where = {};
      if (typeof q === 'string' && q.trim()) where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { sku: { contains: q.trim(), mode: 'insensitive' } }
      ];
      if (typeof category === 'string' && category !== 'All categories') where.category = category;
      if (status === 'Out of stock') where.stock = 0;
      if (status === 'In stock') where.stock = { gt: 0 };
      let products = await prisma.product.findMany({ where, orderBy: { updatedAt: 'desc' } });
      if (status === 'Low stock') products = products.filter(product => product.stock > 0 && product.stock <= product.reorderAt);
      return res.json({ data: products.map(productPayload) });
    } catch (error) { return next(error); }
  });

  app.get('/api/sales', async (_req, res, next) => {
    try {
      const records = await prisma.salesRecord.findMany({ orderBy: { saleDate: 'asc' }, take: 20000 });
      return res.json({ data: records.map(salesPayload) });
    } catch (error) { return next(error); }
  });

  app.post('/api/sales/import', async (req, res, next) => {
    const parsed = z.object({
      idempotencyKey: z.string().min(16).max(128),
      fileName: z.string().trim().min(1).max(255).default('sales-upload.csv'),
      records: z.array(salesRecordSchema).min(1).max(20000)
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Sales import validation failed', details: parsed.error.flatten() });
    try {
      const result = await prisma.$transaction(async tx => {
        const batch = await tx.salesImport.create({
          data: { idempotencyKey: parsed.data.idempotencyKey, fileName: parsed.data.fileName, recordCount: parsed.data.records.length }
        });
        const imported = [];
        for (const row of parsed.data.records) {
          const product = await tx.product.findFirst({
            where: { OR: [
              { name: { equals: row.product, mode: 'insensitive' } },
              { sku: { equals: row.product, mode: 'insensitive' } }
            ] }
          });
          let productId = null;
          if (product) {
            const updated = await tx.product.updateMany({
              where: { id: product.id, stock: { gte: row.unitsSold } },
              data: { stock: { decrement: row.unitsSold } }
            });
            if (updated.count !== 1) {
              const error = new Error(`Insufficient stock for ${product.name}; import was rolled back.`);
              error.status = 409;
              throw error;
            }
            productId = product.id;
            await tx.stockMovement.create({ data: {
              productId, type: 'SALE', quantity: -row.unitsSold,
              stockBefore: product.stock, stockAfter: product.stock - row.unitsSold,
              reference: batch.id, note: `Sales import: ${row.product}`
            } });
          }
          const saved = await tx.salesRecord.create({ data: {
            saleDate: new Date(`${row.date}T00:00:00.000Z`),
            productId, productName: product?.name ?? row.product, category: row.category,
            unitsSold: row.unitsSold, revenue: row.revenue ?? null,
            source: row.source, importId: batch.id
          } });
          imported.push(saved);
        }
        return { batch, records: imported };
      });
      return res.status(201).json({
        imported: result.records.length,
        matchedProducts: result.records.filter(record => record.productId).length,
        unmatchedProducts: result.records.filter(record => !record.productId).map(record => record.productName),
        data: result.records.map(salesPayload)
      });
    } catch (error) {
      if (error.code === 'P2002') return res.status(409).json({ error: 'This CSV file has already been imported.' });
      if (error.status === 409) return res.status(409).json({ error: error.message });
      return next(error);
    }
  });

  app.get('/api/stock-movements', async (req, res, next) => {
    try {
      const take = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const movements = await prisma.stockMovement.findMany({
        include: { product: { select: { id: true, name: true, sku: true } } },
        orderBy: { createdAt: 'desc' }, take
      });
      return res.json({ data: movements });
    } catch (error) { return next(error); }
  });

  app.post('/api/products', async (req, res, next) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    try {
      const product = await prisma.$transaction(async tx => {
        const created = await tx.product.create({ data: parsed.data });
        if (created.stock > 0) await tx.stockMovement.create({ data: {
          productId: created.id, type: 'OPENING', quantity: created.stock,
          stockBefore: 0, stockAfter: created.stock, note: 'Opening stock'
        } });
        return created;
      });
      return res.status(201).json({ data: productPayload(product) });
    } catch (error) {
      if (error.code === 'P2002') return res.status(409).json({ error: 'SKU already exists' });
      return next(error);
    }
  });

  app.patch('/api/products/:id/stock', async (req, res, next) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid product id' });
    const parsed = z.object({ delta: z.number().int().min(-100000000).max(100000000) }).safeParse(req.body);
    if (!parsed.success || parsed.data.delta === 0) return res.status(400).json({ error: 'delta must be a non-zero whole number' });
    try {
      const product = await prisma.$transaction(async tx => {
        const current = await tx.product.findUnique({ where: { id: req.params.id } });
        if (!current) return null;
        const nextStock = current.stock + parsed.data.delta;
        if (nextStock < 0) {
          const error = new Error('Stock cannot be negative');
          error.status = 400;
          throw error;
        }
        const updated = await tx.product.update({ where: { id: current.id }, data: { stock: nextStock } });
        await tx.stockMovement.create({ data: {
          productId: current.id, type: parsed.data.delta > 0 ? 'RECEIPT' : 'ADJUSTMENT',
          quantity: parsed.data.delta, stockBefore: current.stock, stockAfter: nextStock,
          note: 'Manual stock adjustment'
        } });
        return updated;
      });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.json({ data: productPayload(product) });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      return next(error);
    }
  });

  app.delete('/api/products/:id', async (req, res, next) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid product id' });
    try {
      await prisma.product.delete({ where: { id: req.params.id } });
      return res.status(204).end();
    } catch (error) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
      if (error.code === 'P2003') return res.status(409).json({ error: 'Product has stock movement history and cannot be deleted. Keep it for audit history.' });
      return next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    if (error.code === 'P2002') return res.status(409).json({ error: 'A record with this unique value already exists' });
    return res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}
