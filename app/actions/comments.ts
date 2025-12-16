"use server";

import { addComment } from "../tasks/[id]/actions/comment-actions";

/**
 * Server action for adding comments to a task
 * This is in a shared location so it can be imported from client components
 */
export async function addCommentAction(taskId: string, content: string, mentionedUserIds: string[]) {
  await addComment(taskId, content, mentionedUserIds);
}
