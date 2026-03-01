-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Delegation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "amountDelegated" REAL NOT NULL DEFAULT 0.0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTxHash" TEXT,
    "userId" TEXT,
    CONSTRAINT "Delegation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Delegation" ("address", "amountDelegated", "id", "lastTxHash", "lastUpdated") SELECT "address", "amountDelegated", "id", "lastTxHash", "lastUpdated" FROM "Delegation";
DROP TABLE "Delegation";
ALTER TABLE "new_Delegation" RENAME TO "Delegation";
CREATE UNIQUE INDEX "Delegation_address_key" ON "Delegation"("address");
CREATE UNIQUE INDEX "Delegation_userId_key" ON "Delegation"("userId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "starknetAddr" TEXT
);
INSERT INTO "new_User" ("email", "id", "password", "starknetAddr") SELECT "email", "id", "password", "starknetAddr" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_starknetAddr_key" ON "User"("starknetAddr");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
