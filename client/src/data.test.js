import { describe, expect, it } from 'vitest';
import { filterProducts, getStockStatus, summarizeInventory, toCsv } from './data.js';

const products = [
  { id: '1', name: 'Keyboard', sku: 'TEC-1', category: 'Electronics', price: 100, stock: 4, reorderAt: 5 },
  { id: '2', name: 'Bottle', sku: 'ACC-1', category: 'Accessories', price: 20, stock: 0, reorderAt: 3 },
  { id: '3', name: 'Backpack', sku: 'ACC-2', category: 'Accessories', price: 50, stock: 10, reorderAt: 3 }
];

describe('inventory data helpers', () => {
  it('derives stock states, including the zero-stock boundary', () => {
    expect(getStockStatus(products[0])).toBe('Low stock');
    expect(getStockStatus(products[1])).toBe('Out of stock');
    expect(getStockStatus(products[2])).toBe('In stock');
  });
  it('filters by case-insensitive query, category, and status', () => {
    expect(filterProducts(products, { query: 'tec-' })).toHaveLength(1);
    expect(filterProducts(products, { category: 'Accessories' })).toHaveLength(2);
    expect(filterProducts(products, { status: 'Low stock' }).map(p => p.name)).toEqual(['Keyboard']);
  });
  it('calculates totals without confusing stock units with product count', () => {
    expect(summarizeInventory(products)).toEqual({ units: 14, value: 900, lowStock: 1, outOfStock: 1 });
  });
  it('escapes quotes and exports a CSV header', () => {
    const csv = toCsv([{ ...products[0], name: 'A "special" keyboard' }]);
    expect(csv).toContain('"Name","SKU","Category"');
    expect(csv).toContain('"A ""special"" keyboard"');
  });
});
