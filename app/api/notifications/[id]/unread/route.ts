import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notification = await db.notification.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.isRead) {
      await db.notification.update({
        where: { id: id },
        data: { isRead: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark notification as unread:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}