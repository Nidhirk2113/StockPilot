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

export function createApp({ prisma, clientOrigin = 'http://localhost:5173' }) {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: clientOrigin.split(',').map(value => value.trim()), methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'stockpilot-api' }));

  app.get('/api/products', async (req, res, next) => {
    try {
      const { q, category, status } = req.query;
      const where = {};
      if (typeof q === 'string' && q.trim()) {
        where.OR = [
          { name: { contains: q.trim(), mode: 'insensitive' } },
          { sku: { contains: q.trim(), mode: 'insensitive' } }
        ];
      }
      if (typeof category === 'string' && category !== 'All categories') where.category = category;
      if (status === 'Out of stock') where.stock = 0;
      let products = await prisma.product.findMany({ where, orderBy: { updatedAt: 'desc' } });
      if (status === 'Low stock') products = products.filter(product => product.stock > 0 && product.stock <= product.reorderAt);
      return res.json({ data: products });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/products', async (req, res, next) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    try {
      const product = await prisma.product.create({ data: parsed.data });
      return res.status(201).json({ data: product });
    } catch (error) {
      if (error.code === 'P2002') return res.status(409).json({ error: 'SKU already exists' });
      return next(error);
    }
  });

  app.patch('/api/products/:id/stock', async (req, res, next) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid product id' });
    const parsed = z.object({ delta: z.number().int().min(-100000000).max(100000000) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'delta must be a whole number' });
    try {
      const current = await prisma.product.findUnique({ where: { id: req.params.id } });
      if (!current) return res.status(404).json({ error: 'Product not found' });
      const stock = current.stock + parsed.data.delta;
      if (stock < 0) return res.status(400).json({ error: 'Stock cannot be negative' });
      const product = await prisma.product.update({ where: { id: current.id }, data: { stock } });
      return res.json({ data: product });
    } catch (error) {
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
      return next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    if (error.code === 'P2002') return res.status(409).json({ error: 'A product with this SKU already exists' });
    return res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}
