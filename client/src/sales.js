export const demoSales = [
  { id: 's-001', date: '2026-05-04', product: 'Studio Headphones', category: 'Audio', unitsSold: 24, revenue: 3599.76, source: 'Demo electronics' },
  { id: 's-002', date: '2026-05-12', product: 'Mechanical Keyboard', category: 'Computer Accessories', unitsSold: 31, revenue: 3999.00, source: 'Demo electronics' },
  { id: 's-003', date: '2026-05-21', product: 'Portable SSD 1TB', category: 'Storage', unitsSold: 19, revenue: 2089.81, source: 'Demo electronics' },
  { id: 's-004', date: '2026-06-03', product: 'Wireless Mouse', category: 'Computer Accessories', unitsSold: 42, revenue: 1679.58, source: 'Demo electronics' },
  { id: 's-005', date: '2026-06-11', product: 'USB-C Dock', category: 'Computer Accessories', unitsSold: 16, revenue: 1424.00, source: 'Demo electronics' },
  { id: 's-006', date: '2026-06-22', product: 'Studio Headphones', category: 'Audio', unitsSold: 29, revenue: 4349.71, source: 'Demo electronics' },
  { id: 's-007', date: '2026-07-02', product: 'Mechanical Keyboard', category: 'Computer Accessories', unitsSold: 35, revenue: 4515.00, source: 'Demo electronics' },
  { id: 's-008', date: '2026-07-09', product: 'Portable SSD 1TB', category: 'Storage', unitsSold: 27, revenue: 2969.73, source: 'Demo electronics' },
  { id: 's-009', date: '2026-07-18', product: 'Webcam HD', category: 'Video', unitsSold: 21, revenue: 1889.79, source: 'Demo electronics' },
  { id: 's-010', date: '2026-08-05', product: 'Studio Headphones', category: 'Audio', unitsSold: 38, revenue: 5699.62, source: 'Demo electronics' },
  { id: 's-011', date: '2026-08-14', product: 'Wireless Mouse', category: 'Computer Accessories', unitsSold: 56, revenue: 2239.44, source: 'Demo electronics' },
  { id: 's-012', date: '2026-08-26', product: 'USB-C Dock', category: 'Computer Accessories', unitsSold: 23, revenue: 2047.00, source: 'Demo electronics' },
  { id: 's-013', date: '2026-09-04', product: 'Mechanical Keyboard', category: 'Computer Accessories', unitsSold: 47, revenue: 6063.00, source: 'Demo electronics' },
  { id: 's-014', date: '2026-09-13', product: 'Portable SSD 1TB', category: 'Storage', unitsSold: 34, revenue: 3739.66, source: 'Demo electronics' },
  { id: 's-015', date: '2026-09-25', product: 'Studio Headphones', category: 'Audio', unitsSold: 45, revenue: 6749.55, source: 'Demo electronics' },
  { id: 's-016', date: '2026-10-02', product: 'Wireless Mouse', category: 'Computer Accessories', unitsSold: 63, revenue: 2519.37, source: 'Demo electronics' },
  { id: 's-017', date: '2026-10-12', product: 'USB-C Dock', category: 'Computer Accessories', unitsSold: 28, revenue: 2492.00, source: 'Demo electronics' },
  { id: 's-018', date: '2026-10-20', product: 'Webcam HD', category: 'Video', unitsSold: 32, revenue: 2879.68, source: 'Demo electronics' }
];

const first = (row, names) => {
  for (const name of names) {
    const key = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase());
    if (key && row[key] !== undefined && String(row[key]).trim() !== '') return row[key];
  }
  return undefined;
};

export function normalizeSalesRows(rows, source = 'CSV upload') {
  const valid = [];
  const errors = [];
  rows.forEach((row, index) => {
    const product = first(row, ['product', 'product_name', 'name', 'title']);
    const category = first(row, ['category', 'genre', 'product_category']) ?? 'Uncategorized';
    const yearValue = first(row, ['year', 'release_year']);
    const dateValue = first(row, ['date', 'sale_date', 'sold_at']) ?? (yearValue ? `${String(yearValue).slice(0, 4)}-01-01` : undefined);
    const globalSales = first(row, ['global_sales', 'global sales']);
    let unitsRaw = first(row, ['units_sold', 'units', 'quantity', 'sales_units']);
    let revenueRaw = first(row, ['revenue', 'sales_revenue', 'sales_value', 'amount']);
    // Support the uploaded vgsales.csv schema. Global_Sales is in millions of copies, not currency.
    if (globalSales !== undefined && unitsRaw === undefined) unitsRaw = Number(globalSales) * 1_000_000;
    const unitsSold = Number(unitsRaw);
    const revenue = revenueRaw === undefined ? null : Number(String(revenueRaw).replace(/[$,]/g, ''));
    const date = dateValue ? new Date(dateValue) : null;
    const hasValidDate = date && !Number.isNaN(date.getTime());
    if (!product || !hasValidDate || !Number.isFinite(unitsSold) || unitsSold < 0 || (revenue !== null && (!Number.isFinite(revenue) || revenue < 0))) {
      errors.push({ row: index + 2, message: 'Needs a product/name, date or year, non-negative units sold, and optional non-negative revenue.' });
      return;
    }
    valid.push({
      date: date.toISOString().slice(0, 10),
      product: String(product).trim(),
      category: String(category).trim() || 'Uncategorized',
      unitsSold,
      revenue,
      source: globalSales !== undefined ? 'vgsales.csv' : source
    });
  });
  return { records: valid, errors };
}

export function aggregateSalesByMonth(records) {
  const grouped = new Map();
  for (const record of records) {
    const date = String(record.date ?? record.saleDate ?? '').slice(0, 7);
    if (!date) continue;
    const item = grouped.get(date) ?? { month: date, revenue: 0, unitsSold: 0, revenueRecords: 0 };
    item.unitsSold += Number(record.unitsSold) || 0;
    if (record.revenue !== null && record.revenue !== undefined && record.revenue !== '') {
      item.revenue += Number(record.revenue) || 0;
      item.revenueRecords += 1;
    }
    grouped.set(date, item);
  }
  return [...grouped.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function topSellingProducts(records, limit = 5) {
  const grouped = new Map();
  for (const record of records) {
    const name = record.product ?? record.productName;
    const item = grouped.get(name) ?? { product: name, unitsSold: 0, revenue: 0, revenueRecords: 0 };
    item.unitsSold += Number(record.unitsSold) || 0;
    if (record.revenue !== null && record.revenue !== undefined && record.revenue !== '') {
      item.revenue += Number(record.revenue) || 0;
      item.revenueRecords += 1;
    }
    grouped.set(name, item);
  }
  return [...grouped.values()].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, limit);
}
