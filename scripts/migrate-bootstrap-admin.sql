-- Migration script to mark the first admin user as bootstrap admin
-- Run this SQL directly against the database

-- Mark the first admin (by creation date) as bootstrap admin
UPDATE "User"
SET "isBootstrapAdmin" = true
WHERE id = (
  SELECT id 
  FROM "User" 
  WHERE role = 'Admin' 
  ORDER BY "createdAt" ASC 
  LIMIT 1
);

-- Verify the change
SELECT id, name, email, role, "isBootstrapAdmin", "authProvider"
FROM "User"
WHERE "isBootstrapAdmin" = true;
