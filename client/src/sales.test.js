import { describe, expect, it } from 'vitest';
import { aggregateSalesByMonth, demoSales, normalizeSalesRows, topSellingProducts } from './sales.js';

describe('sales data utilities', () => {
  it('ships demo electronics sales across multiple months', () => {
    expect(demoSales.length).toBeGreaterThan(10);
    expect(new Set(demoSales.map(row => row.category)).size).toBeGreaterThan(2);
    expect(aggregateSalesByMonth(demoSales)).toHaveLength(6);
  });
  it('normalizes a standard sales CSV row', () => {
    const result = normalizeSalesRows([{ date: '2026-10-01', product: 'Wireless Mouse', category: 'Electronics', units_sold: '12', revenue: '$479.88' }]);
    expect(result.errors).toHaveLength(0);
    expect(result.records[0]).toMatchObject({ product: 'Wireless Mouse', unitsSold: 12, revenue: 479.88 });
  });
  it('supports the uploaded vgsales schema without pretending global sales are revenue', () => {
    const result = normalizeSalesRows([{ Name: 'Wii Sports', Genre: 'Sports', Year: '2006', Global_Sales: '82.74' }]);
    expect(result.errors).toHaveLength(0);
    expect(result.records[0].date).toBe('2006-01-01');
    expect(result.records[0].unitsSold).toBe(82740000);
    expect(result.records[0].revenue).toBeNull();
    expect(result.records[0].source).toBe('vgsales.csv');
  });
  it('reports invalid rows instead of silently dropping them', () => {
    const result = normalizeSalesRows([{ product: 'Mouse', date: 'not-a-date', units_sold: 4 }]);
    expect(result.records).toHaveLength(0);
    expect(result.errors[0].row).toBe(2);
  });
  it('aggregates by month and ranks products by units sold', () => {
    expect(aggregateSalesByMonth(demoSales)[0].month).toBe('2026-05');
    expect(topSellingProducts(demoSales, 1)[0].product).toBe('Wireless Mouse');
  });
});
