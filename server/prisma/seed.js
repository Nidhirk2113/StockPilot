import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const seedProducts = [
  { name: 'Studio Headphones', sku: 'AUD-1042', category: 'Electronics', price: '149.99', stock: 32, reorderAt: 8 },
  { name: 'Ceramic Pour-over Set', sku: 'HOM-2091', category: 'Home & Living', price: '48.50', stock: 7, reorderAt: 10 },
  { name: 'Everyday Backpack', sku: 'ACC-3015', category: 'Accessories', price: '79.00', stock: 18, reorderAt: 6 },
  { name: 'Mechanical Keyboard', sku: 'TEC-4102', category: 'Electronics', price: '129.00', stock: 0, reorderAt: 5 },
  { name: 'Desk Lamp', sku: 'HOM-2104', category: 'Home & Living', price: '64.95', stock: 14, reorderAt: 6 },
  { name: 'Insulated Bottle', sku: 'ACC-3028', category: 'Accessories', price: '34.00', stock: 4, reorderAt: 12 },
  { name: 'Portable SSD 1TB', sku: 'TEC-4120', category: 'Electronics', price: '109.99', stock: 26, reorderAt: 8 },
  { name: 'Linen Throw', sku: 'HOM-2132', category: 'Home & Living', price: '59.00', stock: 11, reorderAt: 5 }
];

try {
  for (const product of seedProducts) {
    await prisma.product.upsert({ where: { sku: product.sku }, update: product, create: product });
  }
  const demoSales = [
    ['2026-05-04', 'Studio Headphones', 'Audio', 24, '3599.76'],
    ['2026-05-12', 'Mechanical Keyboard', 'Computer Accessories', 31, '3999.00'],
    ['2026-05-21', 'Portable SSD 1TB', 'Storage', 19, '2089.81'],
    ['2026-06-03', 'Wireless Mouse', 'Computer Accessories', 42, '1679.58'],
    ['2026-06-11', 'USB-C Dock', 'Computer Accessories', 16, '1424.00'],
    ['2026-06-22', 'Studio Headphones', 'Audio', 29, '4349.71'],
    ['2026-07-02', 'Mechanical Keyboard', 'Computer Accessories', 35, '4515.00'],
    ['2026-07-09', 'Portable SSD 1TB', 'Storage', 27, '2969.73'],
    ['2026-07-18', 'Webcam HD', 'Video', 21, '1889.79'],
    ['2026-08-05', 'Studio Headphones', 'Audio', 38, '5699.62'],
    ['2026-08-14', 'Wireless Mouse', 'Computer Accessories', 56, '2239.44'],
    ['2026-08-26', 'USB-C Dock', 'Computer Accessories', 23, '2047.00'],
    ['2026-09-04', 'Mechanical Keyboard', 'Computer Accessories', 47, '6063.00'],
    ['2026-09-13', 'Portable SSD 1TB', 'Storage', 34, '3739.66'],
    ['2026-09-25', 'Studio Headphones', 'Audio', 45, '6749.55'],
    ['2026-10-02', 'Wireless Mouse', 'Computer Accessories', 63, '2519.37'],
    ['2026-10-12', 'USB-C Dock', 'Computer Accessories', 28, '2492.00'],
    ['2026-10-20', 'Webcam HD', 'Video', 32, '2879.68']
  ];
  if (await prisma.salesRecord.count() === 0) {
    await prisma.salesRecord.createMany({
      data: demoSales.map(([date, productName, category, unitsSold, revenue]) => ({
        saleDate: new Date(`${date}T00:00:00.000Z`),
        productName,
        category,
        unitsSold,
        revenue,
        source: 'Demo electronics'
      }))
    });
  }
  console.log(`Seeded ${seedProducts.length} StockPilot products and demo electronics sales.`);
} finally {
  await prisma.$disconnect();
}
