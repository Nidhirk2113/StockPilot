import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';

const prisma = new PrismaClient();
const app = createApp({ prisma, clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' });
const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => console.log(`StockPilot API listening on :${port}`));

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
