CREATE TABLE "HistoricalGameDatasetImport" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "recordCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HistoricalGameDatasetImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoricalGameSale" (
  "id" TEXT NOT NULL,
  "datasetImportId" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "year" INTEGER,
  "genre" TEXT NOT NULL,
  "publisher" TEXT,
  "naSales" DECIMAL(10,2) NOT NULL,
  "euSales" DECIMAL(10,2) NOT NULL,
  "jpSales" DECIMAL(10,2) NOT NULL,
  "otherSales" DECIMAL(10,2) NOT NULL,
  "globalSales" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "HistoricalGameSale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HistoricalGameDatasetImport_idempotencyKey_key"
  ON "HistoricalGameDatasetImport"("idempotencyKey");
CREATE UNIQUE INDEX "HistoricalGameSale_datasetImportId_rank_key"
  ON "HistoricalGameSale"("datasetImportId", "rank");
CREATE INDEX "HistoricalGameSale_year_idx" ON "HistoricalGameSale"("year");
CREATE INDEX "HistoricalGameSale_genre_idx" ON "HistoricalGameSale"("genre");
CREATE INDEX "HistoricalGameSale_platform_idx" ON "HistoricalGameSale"("platform");
CREATE INDEX "HistoricalGameSale_publisher_idx" ON "HistoricalGameSale"("publisher");
CREATE INDEX "HistoricalGameSale_year_genre_idx" ON "HistoricalGameSale"("year", "genre");

ALTER TABLE "HistoricalGameSale"
  ADD CONSTRAINT "HistoricalGameSale_datasetImportId_fkey"
  FOREIGN KEY ("datasetImportId") REFERENCES "HistoricalGameDatasetImport"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
