import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from './app.js';

function fixture() {
  const items = [{ id: 'prod-1', name: 'Keyboard', sku: 'KEY-1', category: 'Electronics', price: 50, stock: 10, reorderAt: 5, updatedAt: new Date() }];
  const sales = [];
  const imports = new Set();
  const movements = [];
  const prisma = {
    $transaction: async callback => callback(prisma),
    salesImport: {
      create: async ({ data }) => {
        if (imports.has(data.idempotencyKey)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
        imports.add(data.idempotencyKey);
        return { id: 'batch-1', ...data };
      }
    },
    salesRecord: {
      findMany: async () => sales,
      create: async ({ data }) => { const saved = { id: `sale-${sales.length + 1}`, ...data }; sales.push(saved); return saved; }
    },
    stockMovement: {
      create: async ({ data }) => { const saved = { id: `move-${movements.length + 1}`, createdAt: new Date(), ...data }; movements.push(saved); return saved; },
      findMany: async () => movements.map(move => ({ ...move, product: items.find(item => item.id === move.productId) }))
    },
    product: {
      findMany: async ({ where = {} } = {}) => items.filter(item => {
        if (where.category && item.category !== where.category) return false;
        if (where.stock === 0 && item.stock !== 0) return false;
        if (where.stock?.gt && item.stock <= 0) return false;
        if (where.OR && !where.OR.some(rule => Object.entries(rule).some(([key, spec]) => item[key].toLowerCase().includes(spec.contains.toLowerCase())))) return false;
        return true;
      }),
      findFirst: async ({ where }) => items.find(item => where.OR.some(rule => Object.entries(rule).some(([key, spec]) => item[key].toLowerCase() === spec.equals.toLowerCase()))) ?? null,
      create: async ({ data }) => { const item = { id: 'prod-new', ...data, updatedAt: new Date() }; items.push(item); return item; },
      findUnique: async ({ where }) => items.find(item => item.id === where.id) ?? null,
      update: async ({ where, data }) => { const item = items.find(entry => entry.id === where.id); Object.assign(item, data); return item; },
      updateMany: async ({ where, data }) => {
        const item = items.find(entry => entry.id === where.id && entry.stock >= where.stock.gte);
        if (!item) return { count: 0 };
        item.stock -= data.stock.decrement;
        return { count: 1 };
      },
      delete: async ({ where }) => { const index = items.findIndex(item => item.id === where.id); if (index < 0) throw Object.assign(new Error('not found'), { code: 'P2025' }); if (movements.some(move => move.productId === where.id)) throw Object.assign(new Error('restricted'), { code: 'P2003' }); items.splice(index, 1); }
    }
  };
  return { app: createApp({ prisma }), items, sales, movements };
}
const payload = (records, key = 'phase-one-import-key-0001') => ({ idempotencyKey: key, fileName: 'sales.csv', records });

test('health endpoint responds with service status', async () => { const { app } = fixture(); const response = await request(app).get('/api/health').expect(200); assert.equal(response.body.status, 'ok'); });
test('lists products and supports text filtering', async () => { const { app } = fixture(); const response = await request(app).get('/api/products?q=key').expect(200); assert.equal(response.body.data.length, 1); assert.equal(response.body.data[0].sku, 'KEY-1'); });
test('validates product input and rejects invalid SKU', async () => { const { app } = fixture(); await request(app).post('/api/products').send({ name: 'Item', sku: 'bad sku', category: 'Office', price: 1, stock: 2 }).expect(400); });
test('creates a valid product and records opening stock', async () => { const { app, movements } = fixture(); const response = await request(app).post('/api/products').send({ name: 'Mouse', sku: 'MOU-2', category: 'Electronics', price: 29.5, stock: 8, reorderAt: 3 }).expect(201); assert.equal(response.body.data.name, 'Mouse'); assert.equal(movements[0].type, 'OPENING'); });
test('prevents stock from becoming negative', async () => { const { app } = fixture(); await request(app).patch('/api/products/prod-1/stock').send({ delta: -20 }).expect(400); });
test('manual stock adjustments create ledger entries', async () => { const { app, movements } = fixture(); await request(app).patch('/api/products/prod-1/stock').send({ delta: 3 }).expect(200); assert.equal(movements[0].stockBefore, 10); assert.equal(movements[0].stockAfter, 13); });
test('imports matched sales and atomically deducts inventory', async () => {
  const { app, items, sales, movements } = fixture();
  const response = await request(app).post('/api/sales/import').send(payload([{ date: '2026-10-01', product: 'Keyboard', category: 'Electronics', unitsSold: 3, revenue: 150 }])).expect(201);
  assert.equal(response.body.matchedProducts, 1);
  assert.equal(sales[0].productId, 'prod-1');
  assert.equal(items[0].stock, 7);
  assert.equal(movements[0].type, 'SALE');
  assert.equal(movements[0].quantity, -3);
});
test('rejects duplicate CSV import keys without deducting stock twice', async () => {
  const { app, items } = fixture();
  const body = payload([{ date: '2026-10-01', product: 'Keyboard', unitsSold: 2 }]);
  await request(app).post('/api/sales/import').send(body).expect(201);
  await request(app).post('/api/sales/import').send(body).expect(409);
  assert.equal(items[0].stock, 8);
});
test('rolls back the whole import when a matched product has insufficient stock', async () => {
  const { app, items } = fixture();
  await request(app).post('/api/sales/import').send(payload([{ date: '2026-10-01', product: 'Keyboard', unitsSold: 11 }])).expect(409);
  assert.equal(items[0].stock, 10);
});
test('keeps unmatched products in sales history without changing stock', async () => {
  const { app, sales, items } = fixture();
  const response = await request(app).post('/api/sales/import').send(payload([{ date: '2026-10-01', product: 'Unlisted Product', unitsSold: 100 }])).expect(201);
  assert.equal(response.body.matchedProducts, 0);
  assert.equal(sales[0].productId, null);
  assert.equal(items[0].stock, 10);
});
test('lists stock movement history', async () => {
  const { app, movements } = fixture();
  movements.push({ id: 'move-1', productId: 'prod-1', type: 'RECEIPT', quantity: 2, stockBefore: 10, stockAfter: 12, createdAt: new Date() });
  const response = await request(app).get('/api/stock-movements').expect(200);
  assert.equal(response.body.data.length, 1);
});
test('deletes products without movements and blocks deletion with movement history', async () => {
  const { app } = fixture();
  await request(app).delete('/api/products/prod-1').expect(204);
  const second = fixture();
  second.movements.push({ productId: 'prod-1' });
  await request(second.app).delete('/api/products/prod-1').expect(409);
});
