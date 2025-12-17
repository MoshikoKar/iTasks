"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { notifyTaskCommented, notifyUserMentioned } from "@/lib/notifications";
import { logCommentCreated } from "@/lib/logging/system-logger";

/**
 * Add a comment to a task
 */
export async function addComment(
  taskId: string,
  content: string,
  mentionedUserIds: string[]
) {
  const user = await requireAuth();
  if (!content.trim()) return;

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      slaDeadline: true,
      assigneeId: true,
      creatorId: true,
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  const comment = await db.comment.create({
    data: {
      taskId: task.id,
      userId: user.id,
      content,
      mentions: {
        create: mentionedUserIds.map(userId => ({ userId }))
      }
    },
  });

  // Log comment creation (persists even if task is deleted)
  await logCommentCreated(
    comment.id,
    task.id,
    task.title,
    user.id,
    {
      contentLength: content.length,
      mentionsCount: mentionedUserIds.length,
    }
  );

  const [assignee, creator, mentionedUsers, previousCommentersRaw] = await Promise.all([
    db.user.findUnique({ where: { id: task.assigneeId }, select: { email: true, name: true } }),
    db.user.findUnique({ where: { id: task.creatorId }, select: { email: true, name: true } }),
    db.user.findMany({
      where: { id: { in: mentionedUserIds } },
      select: { email: true, name: true }
    }),
    db.comment.groupBy({
      by: ['userId'],
      where: { taskId: task.id, userId: { not: user.id } }
    })
  ]);

  const previousCommenters = await db.user.findMany({
    where: { id: { in: previousCommentersRaw.map(g => g.userId) } },
    select: { email: true, name: true }
  });

  if (mentionedUsers.length > 0) {
    // If there are mentions, only notify mentioned users
    for (const mentionedUser of mentionedUsers) {
      await notifyUserMentioned(
        {
          taskId: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigneeName: assignee?.name || "Unknown",
          creatorName: creator?.name || "Unknown",
          commentContent: content,
          commentAuthor: user.name,
          dueDate: task.dueDate,
          slaDeadline: task.slaDeadline,
        },
        mentionedUser.email
      );
    }
  } else {
    // If no mentions, notify assignee, creator, and all previous commenters
    const previousCommenterEmails = previousCommenters
      .map(c => c.email)
      .filter((email): email is string => !!email && email !== user.email);

    await notifyTaskCommented(
      {
        taskId: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeName: assignee?.name || "Unknown",
        creatorName: creator?.name || "Unknown",
        commentContent: content,
        commentAuthor: user.name,
        dueDate: task.dueDate,
        slaDeadline: task.slaDeadline,
      },
      assignee?.email && assignee.email !== user.email ? assignee.email : undefined,
      creator?.email && creator.email !== user.email ? creator.email : undefined,
      undefined,
      previousCommenterEmails
    );
  }

  revalidatePath(`/tasks/${task.id}`);
}

/**
 * Server action wrapper for adding comments (accepts taskId as first parameter)
 * This can be passed to client components
 */
export async function addCommentAction(taskId: string, content: string, mentionedUserIds: string[]) {
  "use server";
  await addComment(taskId, content, mentionedUserIds);
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string) {
  const user = await requireAuth();

  const comment = await db.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  if (comment.userId !== user.id && user.role !== Role.Admin) {
    throw new Error("Forbidden: You don't have permission to delete this comment");
  }

  await db.comment.delete({
    where: { id: commentId },
  });

  revalidatePath(`/tasks/${comment.taskId}`);
}

/**
 * Server action wrapper that accepts FormData (for client components)
 */
export async function deleteCommentFormData(formData: FormData) {
  "use server";
  const commentId = formData.get("commentId")?.toString();
  
  if (!commentId) {
    throw new Error("Comment ID is required");
  }

  await deleteComment(commentId);
}
