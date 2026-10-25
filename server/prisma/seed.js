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
  console.log(`Seeded ${seedProducts.length} StockPilot products.`);
} finally {
  await prisma.$disconnect();
}
