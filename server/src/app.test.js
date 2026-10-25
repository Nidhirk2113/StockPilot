import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from './app.js';

function fixture() {
  const items = [{ id: 'prod-1', name: 'Keyboard', sku: 'KEY-1', category: 'Electronics', price: 50, stock: 4, reorderAt: 5, updatedAt: new Date() }];
  const sales = [];
  const prisma = {
    salesRecord: {
      findMany: async () => sales,
      createManyAndReturn: async ({ data }) => {
        const created = data.map((record, index) => ({ id: `sale-${index + 1}`, ...record }));
        sales.push(...created);
        return created;
      }
    },
    product: {
      findMany: async ({ where = {} } = {}) => items.filter(item => {
        if (where.category && item.category !== where.category) return false;
        if (where.stock === 0 && item.stock !== 0) return false;
        if (where.OR && !where.OR.some(rule => {
          const [key, spec] = Object.entries(rule)[0];
          return item[key].toLowerCase().includes(spec.contains.toLowerCase());
        })) return false;
        return true;
      }),
      create: async ({ data }) => { const item = { id: 'prod-new', ...data, updatedAt: new Date() }; items.push(item); return item; },
      findUnique: async ({ where }) => items.find(item => item.id === where.id) ?? null,
      update: async ({ where, data }) => { const item = items.find(entry => entry.id === where.id); Object.assign(item, data); return item; },
      delete: async ({ where }) => { const index = items.findIndex(item => item.id === where.id); if (index < 0) throw Object.assign(new Error('not found'), { code: 'P2025' }); items.splice(index, 1); }
    }
  };
  return { app: createApp({ prisma }), items };
}
test('health endpoint responds with service status', async () => { const { app } = fixture(); const response = await request(app).get('/api/health').expect(200); assert.equal(response.body.status, 'ok'); });
test('lists products and supports text filtering', async () => { const { app } = fixture(); const response = await request(app).get('/api/products?q=key').expect(200); assert.equal(response.body.data.length, 1); assert.equal(response.body.data[0].sku, 'KEY-1'); });
test('validates product input and rejects invalid SKU', async () => { const { app } = fixture(); await request(app).post('/api/products').send({ name: 'Item', sku: 'bad sku', category: 'Office', price: 1, stock: 2 }).expect(400); });
test('creates a valid product', async () => { const { app } = fixture(); const response = await request(app).post('/api/products').send({ name: 'Mouse', sku: 'MOU-2', category: 'Electronics', price: 29.5, stock: 8, reorderAt: 3 }).expect(201); assert.equal(response.body.data.name, 'Mouse'); });
test('prevents stock from becoming negative', async () => { const { app } = fixture(); const response = await request(app).patch('/api/products/prod-1/stock').send({ delta: -10 }).expect(400); assert.match(response.body.error, /negative/); });
test('returns 404 for an unknown product during stock adjustment', async () => { const { app } = fixture(); await request(app).patch('/api/products/missing/stock').send({ delta: 1 }).expect(404); });
test('deletes an existing product', async () => { const { app, items } = fixture(); await request(app).delete('/api/products/prod-1').expect(204); assert.equal(items.length, 0); });

test('imports validated sales records and returns normalized data', async () => {
  const { app } = fixture();
  const response = await request(app).post('/api/sales/import').send({ records: [
    { date: '2026-10-01', product: 'Wireless Mouse', category: 'Electronics', unitsSold: 12, revenue: 479.88, source: 'CSV upload' }
  ] }).expect(201);
  assert.equal(response.body.imported, 1);
  assert.equal(response.body.data[0].product, 'Wireless Mouse');
  assert.equal(response.body.data[0].revenue, 479.88);
});

test('rejects sales imports with invalid quantities', async () => {
  const { app } = fixture();
  await request(app).post('/api/sales/import').send({ records: [
    { date: '2026-10-01', product: 'Wireless Mouse', category: 'Electronics', unitsSold: -2, revenue: 10 }
  ] }).expect(400);
});

test('lists sales records for monitoring', async () => {
  const { app } = fixture();
  await request(app).post('/api/sales/import').send({ records: [
    { date: '2026-10-01', product: 'Wireless Mouse', category: 'Electronics', unitsSold: 12, revenue: 479.88 }
  ] }).expect(201);
  const response = await request(app).get('/api/sales').expect(200);
  assert.equal(response.body.data[0].product, 'Wireless Mouse');
});
