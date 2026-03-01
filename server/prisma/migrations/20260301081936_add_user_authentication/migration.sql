-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "starknetAddr" TEXT,
    CONSTRAINT "User_starknetAddr_fkey" FOREIGN KEY ("starknetAddr") REFERENCES "Delegation" ("address") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_starknetAddr_key" ON "User"("starknetAddr");
