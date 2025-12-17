import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, Role, Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { FileText, Server, Calendar, User, MessageSquare, CheckCircle, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { TaskAttachments } from "@/components/TaskAttachments";
import { StatusUpdateForm } from "@/components/StatusUpdateForm";
import { TaskAssignment } from "@/components/TaskAssignment";
import { CommentInput } from "@/components/CommentInput";
import { CommentDisplay } from "@/components/CommentDisplay";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { Button } from "@/components/button";
import { StatusChangeButtons } from "@/components/StatusChangeButtons";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDateTimeLocal } from "@/lib/utils/date";
import { changeStatusAction, saveTask } from "./actions/task-actions";
import { deleteCommentFormData } from "./actions/comment-actions";
import { assignTask, addTechnician, removeTechnician } from "./actions/assignment-actions";
import { deleteTaskActionFormData } from "./actions/delete-action";

type TaskWithRelations = Prisma.TaskGetPayload<{
  include: {
    assignee: true;
    creator: true;
    context: true;
    subscribers: true;
    comments: {
      include: {
        user: true;
        mentions: {
          include: {
            user: true;
          };
        };
      };
    };
    attachments: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
  };
}>;

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
        orderBy: { createdAt: "desc" as const },
        take: 20
      },
      attachments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" as const },
      },
    },
  }) as TaskWithRelations | null;
  if (!task) return notFound();

  const isEditMode = resolvedSearchParams?.edit === "1";

  const canManageTask =
    currentUser.role === Role.Admin ||
    currentUser.role === Role.TeamLead ||
    task.assigneeId === currentUser.id ||
    task.creatorId === currentUser.id;


  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="space-y-4 pb-6">
      {/* Breadcrumb + Actions - Fixed Height */}
      <div className="flex items-center justify-between gap-4 shrink-0">
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
              deleteTaskAction={deleteTaskActionFormData}
            />
          </div>
        )}
      </div>

      {/* Main Grid Layout: 2fr 1fr 1fr (50% | 25% | 25%) */}
      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr] h-[calc(100vh-8rem)]">
        {/* Left Column (50% / 2fr) */}
        <div className="flex flex-col h-full min-h-0 gap-4">
          {/* Task Details Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-full min-h-0 overflow-hidden">
            <div className="p-6 flex flex-col h-full min-h-0">
            {/* Header - Fixed */}
            <div className="flex items-start gap-3 mb-4 flex-shrink-0">
              <div className="rounded-lg bg-blue-100 p-2">
                <FileText size={24} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Task Details</div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{task.title}</h1>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
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
                        defaultValue={formatDateTimeLocal(task.dueDate)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      />
                    </div>
                  </div>
                </form>
              ) : (
                <p className="text-slate-700 leading-relaxed">{task.description}</p>
              )}
            </div>

            {/* Metadata Row - Anchored to Bottom */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-auto pt-6 border-t border-slate-200 flex-shrink-0">
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
                  <div className="font-semibold text-slate-900">{formatDateTime(task.dueDate)}</div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Linked IT Assets */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col h-auto shrink-0">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Server size={16} className="text-blue-600" />
              Linked IT Assets
            </h2>

            {isEditMode && canManageTask ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Server Name</label>
                  <input
                    type="text"
                    name="serverName"
                    form="task-edit-form"
                    defaultValue={task.context?.serverName || ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Application</label>
                  <input
                    type="text"
                    name="application"
                    form="task-edit-form"
                    defaultValue={task.context?.application || ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">IP Address</label>
                  <input
                    type="text"
                    name="ipAddress"
                    form="task-edit-form"
                    defaultValue={task.context?.ipAddress || ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Environment</label>
                  <input
                    type="text"
                    name="environment"
                    form="task-edit-form"
                    defaultValue={task.context?.environment || ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Workstation ID</label>
                  <input
                    type="text"
                    name="workstationId"
                    form="task-edit-form"
                    defaultValue={task.context?.workstationId || ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">AD User</label>
                  <input
                    type="text"
                    name="adUser"
                    form="task-edit-form"
                    defaultValue={task.context?.adUser || ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Manufacturer</label>
                  <input
                    type="text"
                    name="manufacturer"
                    form="task-edit-form"
                    defaultValue={task.context?.manufacturer || ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Version</label>
                  <input
                    type="text"
                    name="version"
                    form="task-edit-form"
                    defaultValue={task.context?.version || ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md bg-slate-50 p-2 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-0.5">Server Name</div>
                  <div className="font-semibold text-sm text-slate-900">{task.context?.serverName || "-"}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-0.5">Application</div>
                  <div className="font-semibold text-sm text-slate-900">{task.context?.application || "-"}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-0.5">IP Address</div>
                  <div className="font-semibold text-sm text-slate-900">{task.context?.ipAddress || "-"}</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-0.5">Environment</div>
                  <div className="font-semibold text-sm text-slate-900">{task.context?.environment || "-"}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column (25% / 1fr) */}
        <div className="flex flex-col h-full min-h-0 gap-4">
          {/* Assign Task */}
          {(currentUser.role === Role.Admin || currentUser.role === Role.TeamLead) && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-auto shrink-0">
              <TaskAssignment
                taskId={task.id}
                currentAssignee={task.assignee}
                technicians={task.subscribers}
                onAssign={assignTask}
                onAddTechnician={addTechnician}
                onRemoveTechnician={removeTechnician}
              />
            </div>
          )}

          {/* Attachments - Stretches to fill remaining space */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-4 flex flex-col h-full min-h-0">
              <TaskAttachments taskId={task.id} attachments={task.attachments} currentUser={currentUser} />
            </div>
          </div>
        </div>

        {/* Right Column (25% / 1fr) */}
        <div className="flex flex-col h-full min-h-0 gap-4">
          {/* Update Status */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-full min-h-0 overflow-hidden">
            <div className="p-6 flex flex-col h-full min-h-0">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 shrink-0">Update Status</h2>
              <StatusUpdateForm 
                taskId={task.id}
                currentStatus={task.status}
              />
              <div className="mt-4 pt-4 border-t border-slate-200 shrink-0">
                <p className="text-xs text-slate-500 mb-2">Quick Status Change:</p>
                <StatusChangeButtons 
                  currentStatus={task.status}
                  taskId={task.id}
                  changeStatus={changeStatusAction} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments - Below the grid, requires scrolling to see */}
      <div className="flex justify-center">
        <div className="w-full md:w-3/4 lg:w-2/3 max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600" />
            Comments
          </h2>

          <CommentInput taskId={task.id} />

          <div className="space-y-3 mt-4">
            {task.comments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare size={48} className="mx-auto mb-3 text-slate-300" />
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              task.comments.map((comment: TaskWithRelations['comments'][0]) => (
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
                            {formatDateTime(comment.createdAt)}
                          </div>
                        </div>
                        {(comment.userId === currentUser.id || currentUser.role === Role.Admin) && (
                          <form action={deleteCommentFormData}>
                            <input type="hidden" name="commentId" value={comment.id} />
                            <button
                              type="submit"
                              className="neu-button inline-flex items-center justify-center gap-1 text-xs font-medium"
                              style={{ fontSize: '12px', padding: '4px 10px' }}
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
    </div>
  );
}
