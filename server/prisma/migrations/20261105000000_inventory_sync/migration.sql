ALTER TABLE "SalesRecord" ADD COLUMN "productId" TEXT;
ALTER TABLE "SalesRecord" ADD COLUMN "importId" TEXT;

CREATE TABLE "SalesImport" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "recordCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesImport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SalesImport_idempotencyKey_key" ON "SalesImport"("idempotencyKey");

CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "stockBefore" INTEGER NOT NULL,
  "stockAfter" INTEGER NOT NULL,
  "reference" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SalesRecord_productId_saleDate_idx" ON "SalesRecord"("productId", "saleDate");
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");
CREATE INDEX "StockMovement_type_createdAt_idx" ON "StockMovement"("type", "createdAt");
ALTER TABLE "SalesRecord" ADD CONSTRAINT "SalesRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesRecord" ADD CONSTRAINT "SalesRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "SalesImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
