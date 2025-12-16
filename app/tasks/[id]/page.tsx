import { db } from "@/lib/db";
import { updateTask } from "@/app/actions/tasks";
import { notifyTaskCommented, notifyUserMentioned } from "@/lib/notifications";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { FileText, Server, Calendar, User, MessageSquare, CheckCircle, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { TaskAssignment } from "@/components/TaskAssignment";
import { CommentInput } from "@/components/CommentInput";
import { CommentDisplay } from "@/components/CommentDisplay";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { Button } from "@/components/button";
import { StatusChangeButtons } from "@/components/StatusChangeButtons";
import { Badge } from "@/components/ui/badge";

export default async function TaskDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const currentUser = await requireAuth();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const task = await db.task.findUnique({
    where: { id },
    include: {
      assignee: true,
      creator: true,
      context: true,
      subscribers: true,
      comments: {
        include: {
          user: true,
          mentions: {
            include: {
              user: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      }
    },
  });
  if (!task) return notFound();

  const isEditMode = resolvedSearchParams?.edit === "1";

  const canManageTask =
    currentUser.role === Role.Admin ||
    currentUser.role === Role.TeamLead ||
    task.assigneeId === currentUser.id ||
    task.creatorId === currentUser.id;

  async function changeStatus(formData: FormData) {
    "use server";
    const user = await requireAuth();
    const status = formData.get("status") as TaskStatus;
    await updateTask(task.id, { status }, user.id);
    revalidatePath(`/tasks/${task.id}`);
  }

  async function addComment(content: string, mentionedUserIds: string[]) {
    "use server";
    const user = await requireAuth();
    if (!content.trim()) return;

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

  async function deleteComment(formData: FormData) {
    "use server";
    const user = await requireAuth();
    const commentId = formData.get("commentId")?.toString();
    if (!commentId) return;

    const comment = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) return;

    if (comment.userId !== user.id && user.role !== Role.Admin) {
      return;
    }

    await db.comment.delete({
      where: { id: commentId },
    });

    revalidatePath(`/tasks/${comment.taskId}`);
  }

  async function assignTask(taskId: string, assigneeId: string) {
    "use server";
    const user = await requireAuth();

    // Only Admin and TeamLead can assign tasks
    if (user.role !== Role.Admin && user.role !== Role.TeamLead) {
      throw new Error("Unauthorized: Only Admin and TeamLead can assign tasks");
    }

    await updateTask(taskId, { assigneeId }, user.id);
    revalidatePath(`/tasks/${taskId}`);
  }

  async function addTechnician(taskId: string, technicianId: string) {
    "use server";
    const user = await requireAuth();

    if (user.role !== Role.Admin && user.role !== Role.TeamLead) {
      throw new Error("Unauthorized: Only Admin and TeamLead can manage technicians");
    }

    await db.task.update({
      where: { id: taskId },
      data: {
        subscribers: {
          connect: { id: technicianId },
        },
      },
    });

    revalidatePath(`/tasks/${taskId}`);
  }

  async function removeTechnician(taskId: string, technicianId: string) {
    "use server";
    const user = await requireAuth();

    if (user.role !== Role.Admin && user.role !== Role.TeamLead) {
      throw new Error("Unauthorized: Only Admin and TeamLead can manage technicians");
    }

    await db.task.update({
      where: { id: taskId },
      data: {
        subscribers: {
          disconnect: { id: technicianId },
        },
      },
    });

    revalidatePath(`/tasks/${taskId}`);
  }

  async function saveTask(formData: FormData) {
    "use server";
    const user = await requireAuth();
    const taskId = formData.get("taskId")?.toString();
    
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const existingTask = await db.task.findUnique({
      where: { id: taskId },
      select: { assigneeId: true, creatorId: true },
    });

    if (!existingTask) {
      throw new Error("Task not found");
    }

    const canManage =
      user.role === Role.Admin ||
      user.role === Role.TeamLead ||
      existingTask.assigneeId === user.id ||
      existingTask.creatorId === user.id;

    if (!canManage) {
      throw new Error("Forbidden: You don't have permission to edit this task");
    }

    const description = formData.get("description")?.toString() ?? "";
    const status = formData.get("status") as TaskStatus;
    const priority = formData.get("priority") as TaskPriority;
    const dueDateRaw = formData.get("dueDate")?.toString() || "";

    const serverName = formData.get("serverName")?.toString() || null;
    const application = formData.get("application")?.toString() || null;
    const workstationId = formData.get("workstationId")?.toString() || null;
    const adUser = formData.get("adUser")?.toString() || null;
    const environment = formData.get("environment")?.toString() || null;
    const ipAddress = formData.get("ipAddress")?.toString() || null;
    const manufacturer = formData.get("manufacturer")?.toString() || null;
    const version = formData.get("version")?.toString() || null;

    // Update core task fields (Title is immutable)
    await updateTask(
      taskId,
      {
        description,
        status,
        priority,
        dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      },
      user.id
    );

    // Update linked assets (context)
    await db.task.update({
      where: { id: taskId },
      data: {
        context: {
          upsert: {
            create: {
              serverName,
              application,
              workstationId,
              adUser,
              environment,
              ipAddress,
              manufacturer,
              version,
            },
            update: {
              serverName,
              application,
              workstationId,
              adUser,
              environment,
              ipAddress,
              manufacturer,
              version,
            },
          },
        },
      },
    });

    revalidatePath(`/tasks/${taskId}`);
  }

  async function deleteTaskAction(formData: FormData) {
    "use server";
    const user = await requireAuth();
    const taskId = formData.get("taskId")?.toString();
    
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const existingTask = await db.task.findUnique({
      where: { id: taskId },
      select: { creatorId: true },
    });

    if (!existingTask) {
      throw new Error("Task not found");
    }

    const canDelete =
      user.role === Role.Admin ||
      user.role === Role.TeamLead ||
      existingTask.creatorId === user.id;

    if (!canDelete) {
      throw new Error("Forbidden: You don't have permission to delete this task");
    }

    // Delete related records first to avoid foreign key constraint violations
    await db.taskContext.deleteMany({
      where: { taskId },
    });

    await db.comment.deleteMany({
      where: { taskId },
    });

    await db.attachment.deleteMany({
      where: { taskId },
    });

    await db.auditLog.deleteMany({
      where: { taskId },
    });

    // Delete the task itself
    await db.task.delete({
      where: { id: taskId },
    });

    redirect("/tasks");
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link href="/tasks" className="hover:text-blue-600 transition-colors">Tasks</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">{task.title}</span>
        </div>

        {canManageTask && (
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button
                  type="submit"
                  form="task-edit-form"
                  size="sm"
                  className="inline-flex items-center gap-1"
                >
                  <CheckCircle size={14} className="shrink-0" aria-hidden="true" />
                  <span>Save Changes</span>
                </Button>
                <Link href={`/tasks/${task.id}`}>
                  <Button
                    variant="secondary"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </Link>
              </>
            ) : (
              <Link href={`/tasks/${task.id}?edit=1`}>
                <Button
                  variant="secondary"
                  size="sm"
                >
                  <Edit size={14} className="shrink-0" aria-hidden="true" />
                  <span>Edit</span>
                </Button>
              </Link>
            )}

            <DeleteTaskButton
              taskId={task.id}
              taskTitle={task.title}
              deleteTaskAction={deleteTaskAction}
            />
          </div>
        )}
      </div>

      {/* Task Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-lg bg-blue-100 p-2">
            <FileText size={24} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Task Details</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{task.title}</h1>

            {isEditMode && canManageTask && (
              <div className="mb-4 rounded-lg border-2 border-blue-300 bg-blue-50/50 p-3">
                <p className="text-sm font-medium text-blue-900">
                  ✏️ Editing task - Click 'Save Changes' to apply
                </p>
              </div>
            )}
            {isEditMode && canManageTask ? (
              <form action={saveTask} id="task-edit-form" className="space-y-4 border-2 border-blue-300 rounded-lg p-4 bg-white transition-all">
                <input type="hidden" name="taskId" value={task.id} />
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Title (read-only)
                  </label>
                  <input
                    type="text"
                    value={task.title}
                    readOnly
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    defaultValue={task.description}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 min-h-[120px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      defaultValue={task.status}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white"
                    >
                      {Object.values(TaskStatus).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Priority
                    </label>
                    <select
                      name="priority"
                      defaultValue={task.priority}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white"
                    >
                      {Object.values(TaskPriority).map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Due Date
                    </label>
                    <input
                      type="datetime-local"
                      name="dueDate"
                      defaultValue={
                        task.dueDate
                          ? new Date(task.dueDate).toISOString().slice(0, 16)
                          : ""
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    />
                  </div>
                </div>
              </form>
            ) : (
              <p className="text-slate-700 leading-relaxed">{task.description}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <CheckCircle size={18} className="text-slate-600" />
            </div>
            <div>
              <div className="text-xs text-slate-600">Status</div>
              <Badge variant="status" value={task.status} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <FileText size={18} className="text-slate-600" />
            </div>
            <div>
              <div className="text-xs text-slate-600">Priority</div>
              <Badge variant="priority" value={task.priority} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <User size={18} className="text-slate-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Assignee</div>
              <div className="font-semibold text-slate-900">{task.assignee?.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <Calendar size={18} className="text-slate-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Due Date</div>
              <div className="font-semibold text-slate-900">{task.dueDate?.toLocaleString() || "-"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Assets, Assignment & Status */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Linked Assets */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Server size={20} className="text-blue-600" />
            Linked IT Assets
          </h2>

          {isEditMode && canManageTask ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Server Name</label>
                <input
                  type="text"
                  name="serverName"
                  form="task-edit-form"
                  defaultValue={task.context?.serverName || ""}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Application</label>
                <input
                  type="text"
                  name="application"
                  form="task-edit-form"
                  defaultValue={task.context?.application || ""}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">IP Address</label>
                <input
                  type="text"
                  name="ipAddress"
                  form="task-edit-form"
                  defaultValue={task.context?.ipAddress || ""}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Environment</label>
                <input
                  type="text"
                  name="environment"
                  form="task-edit-form"
                  defaultValue={task.context?.environment || ""}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Workstation ID</label>
                <input
                  type="text"
                  name="workstationId"
                  form="task-edit-form"
                  defaultValue={task.context?.workstationId || ""}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">AD User</label>
                <input
                  type="text"
                  name="adUser"
                  form="task-edit-form"
                  defaultValue={task.context?.adUser || ""}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Manufacturer</label>
                <input
                  type="text"
                  name="manufacturer"
                  form="task-edit-form"
                  defaultValue={task.context?.manufacturer || ""}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Version</label>
                <input
                  type="text"
                  name="version"
                  form="task-edit-form"
                  defaultValue={task.context?.version || ""}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Server Name</div>
                <div className="font-semibold text-slate-900">{task.context?.serverName || "-"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Application</div>
                <div className="font-semibold text-slate-900">{task.context?.application || "-"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">IP Address</div>
                <div className="font-semibold text-slate-900">{task.context?.ipAddress || "-"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Environment</div>
                <div className="font-semibold text-slate-900">{task.context?.environment || "-"}</div>
              </div>
            </div>
          )}
        </div>

        {/* Assignment */}
        {(currentUser.role === Role.Admin || currentUser.role === Role.TeamLead) && (
          <TaskAssignment
            taskId={task.id}
            currentAssignee={task.assignee}
            technicians={task.subscribers}
            onAssign={assignTask}
            onAddTechnician={addTechnician}
            onRemoveTechnician={removeTechnician}
          />
        )}

        {/* Change Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Change Status</h2>
          <StatusChangeButtons currentStatus={task.status} changeStatus={changeStatus} />
        </div>
      </div>

      {/* Comments */}
      <div className="flex justify-center">
        <div className="w-full md:w-3/4 lg:w-2/3 max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600" />
            Comments
          </h2>

          <CommentInput onSubmit={addComment} />

          <div className="space-y-3">
            {task.comments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare size={48} className="mx-auto mb-3 text-slate-300" />
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              task.comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-blue-100 p-2">
                      <User size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900">{comment.user?.name || "User"}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(comment.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {(comment.userId === currentUser.id || currentUser.role === Role.Admin) && (
                          <form action={deleteComment}>
                            <input type="hidden" name="commentId" value={comment.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100 hover:text-red-700"
                              aria-label="Delete comment"
                            >
                              <Trash2 size={14} className="shrink-0" />
                              <span>Delete</span>
                            </button>
                          </form>
                        )}
                      </div>
                      <CommentDisplay content={comment.content} mentions={comment.mentions} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


