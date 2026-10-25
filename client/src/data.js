export const initialProducts = [
  { id: 'p-1001', name: 'Studio Headphones', sku: 'AUD-1042', category: 'Electronics', price: 149.99, stock: 32, reorderAt: 8, change: '+12%' },
  { id: 'p-1002', name: 'Ceramic Pour-over Set', sku: 'HOM-2091', category: 'Home & Living', price: 48.50, stock: 7, reorderAt: 10, change: '-3%' },
  { id: 'p-1003', name: 'Everyday Backpack', sku: 'ACC-3015', category: 'Accessories', price: 79.00, stock: 18, reorderAt: 6, change: '+8%' },
  { id: 'p-1004', name: 'Mechanical Keyboard', sku: 'TEC-4102', category: 'Electronics', price: 129.00, stock: 0, reorderAt: 5, change: '-6%' },
  { id: 'p-1005', name: 'Desk Lamp', sku: 'HOM-2104', category: 'Home & Living', price: 64.95, stock: 14, reorderAt: 6, change: '+5%' },
  { id: 'p-1006', name: 'Insulated Bottle', sku: 'ACC-3028', category: 'Accessories', price: 34.00, stock: 4, reorderAt: 12, change: '+18%' },
  { id: 'p-1007', name: 'Portable SSD 1TB', sku: 'TEC-4120', category: 'Electronics', price: 109.99, stock: 26, reorderAt: 8, change: '+11%' },
  { id: 'p-1008', name: 'Linen Throw', sku: 'HOM-2132', category: 'Home & Living', price: 59.00, stock: 11, reorderAt: 5, change: '+2%' },
  { id: 'p-1009', name: 'Wireless Mouse', sku: 'TEC-4144', category: 'Electronics', price: 39.99, stock: 3, reorderAt: 10, change: '-2%' },
  { id: 'p-1010', name: 'Travel Organizer', sku: 'ACC-3053', category: 'Accessories', price: 24.00, stock: 41, reorderAt: 10, change: '+9%' },
  { id: 'p-1011', name: 'Glass Meal Prep Set', sku: 'HOM-2150', category: 'Home & Living', price: 42.00, stock: 22, reorderAt: 8, change: '+6%' },
  { id: 'p-1012', name: 'USB-C Dock', sku: 'TEC-4171', category: 'Electronics', price: 89.00, stock: 6, reorderAt: 6, change: '+4%' }
];

export const weeklyMovement = [
  { day: 'Mon', inbound: 46, outbound: 28 },
  { day: 'Tue', inbound: 34, outbound: 41 },
  { day: 'Wed', inbound: 58, outbound: 36 },
  { day: 'Thu', inbound: 42, outbound: 53 },
  { day: 'Fri', inbound: 67, outbound: 48 },
  { day: 'Sat', inbound: 39, outbound: 31 },
  { day: 'Sun', inbound: 51, outbound: 23 }
];

export const salesTrend = [
  { month: 'May', sales: 18200 }, { month: 'Jun', sales: 21400 },
  { month: 'Jul', sales: 19800 }, { month: 'Aug', sales: 26700 },
  { month: 'Sep', sales: 24900 }, { month: 'Oct', sales: 31200 }
];

export function getStockStatus(product) {
  if (product.stock === 0) return 'Out of stock';
  if (product.stock <= product.reorderAt) return 'Low stock';
  return 'In stock';
}

export function filterProducts(products, { query = '', category = 'All categories', status = 'All items' } = {}) {
  const normalized = query.trim().toLowerCase();
  return products.filter((product) => {
    const matchesQuery = !normalized || `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(normalized);
    const matchesCategory = category === 'All categories' || product.category === category;
    const productStatus = getStockStatus(product);
    const matchesStatus = status === 'All items' || (status === 'Low stock' ? productStatus === 'Low stock' : productStatus === status);
    return matchesQuery && matchesCategory && matchesStatus;
  });
}

export function summarizeInventory(products) {
  return products.reduce((summary, product) => {
    summary.units += product.stock;
    summary.value += product.stock * product.price;
    summary.lowStock += getStockStatus(product) === 'Low stock' ? 1 : 0;
    summary.outOfStock += getStockStatus(product) === 'Out of stock' ? 1 : 0;
    return summary;
  }, { units: 0, value: 0, lowStock: 0, outOfStock: 0 });
}

export function toCsv(products) {
  const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const header = ['Name', 'SKU', 'Category', 'Price', 'Stock', 'Reorder level', 'Status'];
  const rows = products.map((product) => [product.name, product.sku, product.category, product.price.toFixed(2), product.stock, product.reorderAt, getStockStatus(product)]);
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}
