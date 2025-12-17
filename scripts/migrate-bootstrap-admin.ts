/**
 * Migration script to mark the first admin user as bootstrap admin
 * Run this once after adding the isBootstrapAdmin and authProvider fields
 */

import { db } from '../lib/db';
import { Role, AuthProvider } from '@prisma/client';

async function migrateBootstrapAdmin() {
  console.log('Starting bootstrap admin migration...');

  try {
    // Find the first admin user (sorted by creation date)
    const firstAdmin = await db.user.findFirst({
      where: { role: Role.Admin },
      orderBy: { createdAt: 'asc' },
    });

    if (!firstAdmin) {
      console.log('No admin users found. Nothing to migrate.');
      return;
    }

    // Mark the first admin as bootstrap admin
    // Note: authProvider defaults to 'local' in schema, so no need to update
    const updated = await db.user.update({
      where: { id: firstAdmin.id },
      data: {
        isBootstrapAdmin: true,
        authProvider: AuthProvider.local,
      },
    });

    console.log(`✓ Marked user "${updated.name}" (${updated.email}) as bootstrap admin`);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the migration
migrateBootstrapAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
