-- ==============================================================================
-- Silverland Estate Database Migration & Cleanup Script
-- Run this in the Supabase SQL Editor (takes ~5 seconds, bypasses pooler limits)
-- ==============================================================================

-- 1. Extend Enums
ALTER TYPE "ResidentStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

DO $$ BEGIN
  CREATE TYPE "GatePassType" AS ENUM ('VISITOR', 'RESIDENT_EXIT', 'RESIDENT_ENTRY', 'RESIDENT_ROUNDTRIP');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "PersonType" ADD VALUE IF NOT EXISTS 'RESIDENT';

-- 2. Create the unified GatePass table
CREATE TABLE IF NOT EXISTS "GatePass" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL UNIQUE,
  "token" TEXT NOT NULL UNIQUE,
  "qrContent" TEXT NOT NULL,
  "passType" "GatePassType" NOT NULL DEFAULT 'VISITOR',
  "residentId" UUID NOT NULL REFERENCES "Resident"("id") ON DELETE CASCADE,
  "visitorId" UUID REFERENCES "Visitor"("id") ON DELETE SET NULL,
  "visitorName" TEXT,
  "visitorPhone" TEXT,
  "visitorType" "VisitorType" DEFAULT 'GUEST',
  "vehiclePlate" TEXT,
  "purpose" TEXT,
  "direction" "AccessAction" NOT NULL DEFAULT 'ENTRY',
  "status" "PassStatus" NOT NULL DEFAULT 'ACTIVE',
  "maxUses" INTEGER NOT NULL DEFAULT 1,
  "usesCount" INTEGER NOT NULL DEFAULT 0,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "GatePass_code_idx" ON "GatePass"("code");
CREATE INDEX IF NOT EXISTS "GatePass_token_idx" ON "GatePass"("token");
CREATE INDEX IF NOT EXISTS "GatePass_residentId_idx" ON "GatePass"("residentId");
CREATE INDEX IF NOT EXISTS "GatePass_visitorId_idx" ON "GatePass"("visitorId");
CREATE INDEX IF NOT EXISTS "GatePass_status_idx" ON "GatePass"("status");

-- 3. Link GatePass to AccessLog
ALTER TABLE "AccessLog" ADD COLUMN IF NOT EXISTS "gatePassId" UUID REFERENCES "GatePass"("id") ON DELETE SET NULL;

-- 4. Clean up old demo data
DELETE FROM "AccessLog" WHERE "notes" LIKE '%DEMO%' OR "reason" LIKE '%DEMO%';
DELETE FROM "DispatchRider" WHERE "passToken" LIKE 'DISPATCH%';

-- 5. Drop the old legacy VisitorPass table
DROP TABLE IF EXISTS "VisitorPass" CASCADE;
