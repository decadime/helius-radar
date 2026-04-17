-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('DEX', 'DEFI', 'NFT', 'GAMING', 'WALLET', 'INFRA', 'TOOLING', 'STABLECOIN', 'RWA', 'CONSUMER', 'PAYMENTS', 'TRADING', 'OTHER');

-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('CANDIDATE', 'TRACKED', 'WATCHLIST', 'REJECTED');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('FUNDING', 'HIRING', 'PRODUCT_LAUNCH', 'ONCHAIN_ACTIVITY', 'TEAM_MOVE', 'PARTNERSHIP', 'TECH_CHANGE', 'SOCIAL', 'PRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "HeliusProduct" AS ENUM ('RPC', 'DEDICATED_NODES', 'SENDER', 'SHRED_DELIVERY', 'LASERSTREAM', 'WEBSOCKETS_ENHANCED', 'WEBHOOKS', 'DAS_API', 'ENHANCED_TXNS', 'PRIORITY_FEES', 'WALLET_API', 'ZK_COMPRESSION', 'OTHER');

-- CreateEnum
CREATE TYPE "TargetStatus" AS ENUM ('OPEN', 'WORKING', 'CONTACTED', 'MEETING_SET', 'WON', 'PASSED');

-- CreateEnum
CREATE TYPE "RunType" AS ENUM ('CANDIDATE_INGEST', 'SIGNAL_INGEST', 'MATCH_INGEST', 'TARGET_GENERATION', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RunOutcome" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILURE');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "domain" TEXT,
    "segment" "Segment" NOT NULL,
    "subsegment" TEXT,
    "description" TEXT,
    "trackStatus" "TrackStatus" NOT NULL DEFAULT 'CANDIDATE',
    "identificationScore" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "heliusFitSummary" TEXT,
    "recommendedWedge" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "signalType" "SignalType" NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "summary" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "confidence" DOUBLE PRECISION,
    "impactScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMatch" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "heliusProduct" "HeliusProduct" NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT,
    "primaryMatch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTarget" (
    "id" TEXT NOT NULL,
    "targetDate" DATE NOT NULL,
    "accountId" TEXT NOT NULL,
    "priorityRank" INTEGER NOT NULL,
    "whyNow" TEXT,
    "recommendedWedge" TEXT,
    "nextAction" TEXT,
    "status" "TargetStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunLog" (
    "id" TEXT NOT NULL,
    "runType" "RunType" NOT NULL,
    "outcome" "RunOutcome" NOT NULL,
    "summary" TEXT NOT NULL,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL,
    "sourcePath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_domain_key" ON "Account"("domain");

-- CreateIndex
CREATE INDEX "Account_trackStatus_idx" ON "Account"("trackStatus");

-- CreateIndex
CREATE INDEX "Account_segment_idx" ON "Account"("segment");

-- CreateIndex
CREATE INDEX "Account_identificationScore_idx" ON "Account"("identificationScore" DESC);

-- CreateIndex
CREATE INDEX "Signal_accountId_idx" ON "Signal"("accountId");

-- CreateIndex
CREATE INDEX "Signal_signalType_idx" ON "Signal"("signalType");

-- CreateIndex
CREATE INDEX "Signal_detectedAt_idx" ON "Signal"("detectedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Signal_accountId_title_detectedAt_key" ON "Signal"("accountId", "title", "detectedAt");

-- CreateIndex
CREATE INDEX "ProductMatch_accountId_idx" ON "ProductMatch"("accountId");

-- CreateIndex
CREATE INDEX "ProductMatch_heliusProduct_idx" ON "ProductMatch"("heliusProduct");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMatch_accountId_heliusProduct_key" ON "ProductMatch"("accountId", "heliusProduct");

-- CreateIndex
CREATE INDEX "DailyTarget_targetDate_idx" ON "DailyTarget"("targetDate");

-- CreateIndex
CREATE INDEX "DailyTarget_status_idx" ON "DailyTarget"("status");

-- CreateIndex
CREATE INDEX "DailyTarget_priorityRank_idx" ON "DailyTarget"("priorityRank");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTarget_targetDate_accountId_key" ON "DailyTarget"("targetDate", "accountId");

-- CreateIndex
CREATE INDEX "RunLog_runType_idx" ON "RunLog"("runType");

-- CreateIndex
CREATE INDEX "RunLog_createdAt_idx" ON "RunLog"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTarget" ADD CONSTRAINT "DailyTarget_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
