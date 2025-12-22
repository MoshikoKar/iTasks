import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Notification table and enum...');

  // Create the NotificationType enum
  await prisma.$executeRaw`
    CREATE TYPE "NotificationType" AS ENUM ('TaskAssigned', 'TaskStatusChanged', 'TaskClosed', 'AddedAsSubscriber', 'CommentAdded');
  `;

  // Create the Notification table
  await prisma.$executeRaw`
    CREATE TABLE "Notification" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "actorId" TEXT,
      "taskId" TEXT NOT NULL,
      "type" "NotificationType" NOT NULL,
      "title" TEXT NOT NULL,
      "content" TEXT,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,

      CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
    );
  `;

  // Create indexes
  await prisma.$executeRaw`
    CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
  `;

  await prisma.$executeRaw`
    CREATE INDEX "Notification_taskId_idx" ON "Notification"("taskId");
  `;

  await prisma.$executeRaw`
    CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
  `;

  await prisma.$executeRaw`
    CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
  `;

  await prisma.$executeRaw`
    CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
  `;

  // Add foreign key constraints
  await prisma.$executeRaw`
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `;

  await prisma.$executeRaw`
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  `;

  await prisma.$executeRaw`
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `;

  console.log('Notification table and indexes created successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });