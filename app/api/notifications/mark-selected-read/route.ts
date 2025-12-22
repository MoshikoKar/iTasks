import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationIds } = await request.json();

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Update only notifications that belong to the current user
    await db.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark selected notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}