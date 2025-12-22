/**
 * Migration Script: Remove Incidents System
 * 
 * This script safely removes the incidents system by:
 * 1. Converting any Incident tasks to Standard tasks
 * 2. Deleting any Incident records
 * 
 * Run this BEFORE applying the Prisma schema changes.
 * 
 * Usage:
 *   npx tsx scripts/migrate-remove-incidents.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting migration to remove incidents system...\n');

  try {
    // Step 1: Find and convert Incident tasks to Standard using unsafe raw SQL
    // (Bypasses Prisma validation since enum value may not exist in client)
    const incidentTasks = await prisma.$queryRawUnsafe<Array<{ id: string; title: string }>>(
      `SELECT id, title FROM "Task" WHERE type = 'Incident'`
    );

    if (incidentTasks.length > 0) {
      console.log(`📋 Found ${incidentTasks.length} task(s) with type 'Incident':`);
      incidentTasks.forEach((task) => {
        console.log(`   - ${task.title} (${task.id})`);
      });

      await prisma.$executeRawUnsafe(
        `UPDATE "Task" SET type = 'Standard' WHERE type = 'Incident'`
      );

      console.log(`\n✅ Converted ${incidentTasks.length} task(s) from 'Incident' to 'Standard'\n`);
    } else {
      console.log('✅ No tasks with type "Incident" found\n');
    }

    // Step 2: Delete Incident records
    const incidentCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::int as count FROM "Incident"`
    );

    const count = Number(incidentCount[0]?.count || 0);

    if (count > 0) {
      console.log(`📋 Found ${count} Incident record(s) to delete`);

      await prisma.$executeRawUnsafe(`DELETE FROM "Incident"`);

      console.log(`✅ Deleted ${count} Incident record(s)\n`);
    } else {
      console.log('✅ No Incident records found\n');
    }

    console.log('✅ Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Run: npx prisma db push');
    console.log('   2. Run: npx prisma generate');
    console.log('   3. Restart your development server');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
