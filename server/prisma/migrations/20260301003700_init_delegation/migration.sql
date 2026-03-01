-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "amountDelegated" REAL NOT NULL DEFAULT 0.0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTxHash" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Delegation_address_key" ON "Delegation"("address");
