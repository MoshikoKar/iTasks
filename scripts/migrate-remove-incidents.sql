-- Migration: Remove Incidents System
-- This script safely removes the incidents system by:
-- 1. Converting any Incident tasks to Standard tasks
-- 2. Deleting any Incident records
-- 3. The enum value will be removed by Prisma migration

-- Step 1: Convert any tasks with type 'Incident' to 'Standard'
UPDATE "Task"
SET type = 'Standard'
WHERE type = 'Incident';

-- Step 2: Delete any Incident records (they're linked to tasks via taskId)
-- Note: This will fail if there are Incident records, but that's expected
-- since we're removing the system. If you have data you want to keep,
-- you should export it first.
DELETE FROM "Incident";

-- Step 3: The enum value removal will be handled by Prisma migration
-- After running this script, you can proceed with: npx prisma db push
