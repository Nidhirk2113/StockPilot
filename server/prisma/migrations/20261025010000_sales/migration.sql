CREATE TABLE "SalesRecord" (
    "id" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "productName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Uncategorized',
    "unitsSold" INTEGER NOT NULL,
    "revenue" DECIMAL(14,2),
    "source" TEXT NOT NULL DEFAULT 'CSV upload',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SalesRecord_saleDate_idx" ON "SalesRecord"("saleDate");
CREATE INDEX "SalesRecord_productName_idx" ON "SalesRecord"("productName");
CREATE INDEX "SalesRecord_category_saleDate_idx" ON "SalesRecord"("category", "saleDate");
