-- CreateEnum
CREATE TYPE "RpcProvider" AS ENUM ('HELIUS', 'ALCHEMY', 'QUICKNODE', 'SYNDICA', 'TRITON', 'SHYFT', 'ANKR', 'CHAINSTACK', 'PUBLIC_SOLANA', 'PROXIED', 'UNKNOWN', 'OTHER');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "rpcDetectedAt" TIMESTAMP(3),
ADD COLUMN     "rpcProvider" "RpcProvider";

-- CreateIndex
CREATE INDEX "Account_rpcProvider_idx" ON "Account"("rpcProvider");
