import { describe, expect, it } from 'vitest';
import { filterProducts, getStockStatus, summarizeInventory, toCsv } from './data.js';
const items = [
  { id:'1', name:'Keyboard', sku:'TEC-1', category:'Electronics', price:100, stock:4, reorderAt:5 },
  { id:'2', name:'Bottle', sku:'ACC-1', category:'Accessories', price:20, stock:0, reorderAt:3 },
  { id:'3', name:'Backpack', sku:'ACC-2', category:'Accessories', price:50, stock:10, reorderAt:3 }
];
describe('inventory data helpers', () => {
  it('classifies low, empty and healthy stock', () => {
    expect(getStockStatus(items[0])).toBe('Low stock');
    expect(getStockStatus(items[1])).toBe('Out of stock');
    expect(getStockStatus(items[2])).toBe('In stock');
  });
  it('filters by query, category and status', () => {
    expect(filterProducts(items, { query:'tec-' })).toHaveLength(1);
    expect(filterProducts(items, { category:'Accessories' })).toHaveLength(2);
    expect(filterProducts(items, { status:'Low stock' }).map(p => p.name)).toEqual(['Keyboard']);
  });
  it('calculates total units and inventory value', () => {
    expect(summarizeInventory(items)).toEqual({ units:14, value:900, lowStock:1, outOfStock:1 });
  });
  it('escapes quotes in CSV data', () => {
    expect(toCsv([{ ...items[0], name:'A "special" keyboard' }])).toContain('"A ""special"" keyboard"');
  });
});
