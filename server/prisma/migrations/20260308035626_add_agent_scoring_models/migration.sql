-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "videoUrl" TEXT,
    "videoTitle" TEXT,
    "videoDesc" TEXT,
    "isShorts" BOOLEAN NOT NULL DEFAULT false,
    "durationSeconds" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scoringId" TEXT,
    CONSTRAINT "ActivityEvent_scoringId_fkey" FOREIGN KEY ("scoringId") REFERENCES "ScoringDecision" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "sessionType" TEXT NOT NULL,
    "avgRotScore" REAL NOT NULL DEFAULT 0,
    "avgRotVelocity" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ScoreLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "scoreBefore" REAL NOT NULL,
    "scoreDelta" REAL NOT NULL,
    "scoreAfter" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT
);

-- CreateTable
CREATE TABLE "ScoringDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "rotScore" REAL NOT NULL,
    "rotVelocity" REAL NOT NULL,
    "heuristicScore" REAL NOT NULL,
    "agentScore" REAL NOT NULL,
    "aiWeight" REAL NOT NULL,
    "baseline" REAL NOT NULL,
    "reasoning" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityEvent_scoringId_key" ON "ActivityEvent"("scoringId");
