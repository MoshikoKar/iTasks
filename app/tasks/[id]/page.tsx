import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, Role, Prisma } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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
import { DeleteCommentButton } from "@/components/DeleteCommentButton";
import { AuditPreview } from "@/components/ui/audit-preview";
import { CopyButton } from "@/components/ui/copy-button";

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
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }
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
    <div className="min-h-screen overflow-y-auto overflow-x-hidden">
      <div className="space-y-3 sm:space-y-4 pb-4 px-4 sm:px-0">
      {/* Breadcrumb + Actions - Responsive Layout */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 gap-4 shrink-0">
        <div className="flex items-center gap-2 text-sm md:text-sm max-md:text-base text-muted-foreground">
          <Link href="/tasks" className="hover:text-primary transition-colors">Tasks</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{task.title}</span>
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
                  <CheckCircle size={14} className="shrink-0 text-primary" aria-hidden="true" />
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
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400"
                >
                  <Edit size={14} className="shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
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

      {/* Main Grid Layout: Responsive - Single column on mobile/tablet, 2fr 1fr 1fr on desktop */}
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr] xl:h-[calc(100vh-8rem)] max-xl:h-auto">
        {/* Left Column (50% / 2fr) */}
        <div className="flex flex-col md:h-full max-md:h-auto min-h-0 gap-4">
          {/* Task Details Card */}
          <div className="card-base flex flex-col md:h-full max-md:h-auto min-h-0 overflow-hidden">
            <div className="p-6 flex flex-col md:h-full max-md:h-auto min-h-0">
            {/* Header - Fixed */}
            <div className="flex items-start gap-3 mb-4 shrink-0">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileText size={24} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Task Details</div>
                <h1 className="text-3xl md:text-3xl max-md:text-2xl font-bold text-foreground mb-2">{task.title}</h1>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 md:min-h-0 max-md:min-h-0 overflow-y-auto md:pr-2 max-md:pr-0">
              {isEditMode && canManageTask && (
                <div className="mb-4 rounded-lg border-2 border-primary/50 bg-primary/5 p-3">
                  <p className="text-sm font-medium text-primary">
                    ✏️ Editing task - Click 'Save Changes' to apply
                  </p>
                </div>
              )}
              {isEditMode && canManageTask ? (
                <form action={saveTask} id="task-edit-form" className="space-y-4 border-2 border-primary/50 rounded-lg p-4 bg-card transition-all">
                  <input type="hidden" name="taskId" value={task.id} />
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Title (read-only)
                    </label>
                    <input
                      type="text"
                      value={task.title}
                      readOnly
                      className="input-base bg-muted read-only-field"
                      title="Read-only"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={task.description}
                      className="input-base min-h-[120px]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Status
                      </label>
                      <select
                        name="status"
                        defaultValue={task.status}
                        className="input-base"
                      >
                        {Object.values(TaskStatus).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Priority
                      </label>
                      <select
                        name="priority"
                        defaultValue={task.priority}
                        className="input-base"
                      >
                        {Object.values(TaskPriority).map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Due Date
                      </label>
                      <input
                        type="datetime-local"
                        name="dueDate"
                        defaultValue={formatDateTimeLocal(task.dueDate)}
                        className="input-base"
                      />
                    </div>
                  </div>
                </form>
              ) : (
                <p className="text-foreground leading-relaxed">{task.description}</p>
              )}
            </div>

            {/* Metadata Row - Anchored to Bottom */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-auto pt-6 border-t border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <CheckCircle size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge variant="status" value={task.status} showTooltip enableHighlight />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <FileText size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Priority</div>
                  <Badge variant="priority" value={task.priority} showTooltip enableHighlight />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <User size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Assignee</div>
                  <div className="font-semibold text-foreground">{task.assignee?.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Calendar size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Due Date</div>
                  <div className="font-semibold text-foreground">{formatDateTime(task.dueDate)}</div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Linked IT Assets */}
          <div className="card-base p-4 flex flex-col h-auto shrink-0">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Server size={16} className="text-primary" />
              Linked IT Assets
            </h2>

            {isEditMode && canManageTask ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Server Name</label>
                  <input
                    type="text"
                    name="serverName"
                    form="task-edit-form"
                    defaultValue={task.context?.serverName || ""}
                    className="input-base"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Application</label>
                  <input
                    type="text"
                    name="application"
                    form="task-edit-form"
                    defaultValue={task.context?.application || ""}
                    className="input-base"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">IP Address</label>
                  <input
                    type="text"
                    name="ipAddress"
                    form="task-edit-form"
                    defaultValue={task.context?.ipAddress || ""}
                    className="input-base"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Environment</label>
                  <input
                    type="text"
                    name="environment"
                    form="task-edit-form"
                    defaultValue={task.context?.environment || ""}
                    className="input-base"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Workstation ID</label>
                  <input
                    type="text"
                    name="workstationId"
                    form="task-edit-form"
                    defaultValue={task.context?.workstationId || ""}
                    className="input-base"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">AD User</label>
                  <input
                    type="text"
                    name="adUser"
                    form="task-edit-form"
                    defaultValue={task.context?.adUser || ""}
                    className="input-base"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Manufacturer</label>
                  <input
                    type="text"
                    name="manufacturer"
                    form="task-edit-form"
                    defaultValue={task.context?.manufacturer || ""}
                    className="input-base"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Version</label>
                  <input
                    type="text"
                    name="version"
                    form="task-edit-form"
                    defaultValue={task.context?.version || ""}
                    className="input-base"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md bg-muted/50 p-2 border border-border">
                  <div className="text-xs text-muted-foreground mb-0.5">Server Name</div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-1">
                    {task.context?.serverName || "-"}
                    {task.context?.serverName && (
                      <CopyButton text={task.context.serverName} label="Copy server name" iconSize={12} />
                    )}
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 p-2 border border-border">
                  <div className="text-xs text-muted-foreground mb-0.5">Application</div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-1">
                    {task.context?.application || "-"}
                    {task.context?.application && (
                      <CopyButton text={task.context.application} label="Copy application name" iconSize={12} />
                    )}
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 p-2 border border-border">
                  <div className="text-xs text-muted-foreground mb-0.5">IP Address</div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-1">
                    {task.context?.ipAddress || "-"}
                    {task.context?.ipAddress && (
                      <CopyButton text={task.context.ipAddress} label="Copy IP address" iconSize={12} />
                    )}
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 p-2 border border-border">
                  <div className="text-xs text-muted-foreground mb-0.5">Environment</div>
                  <div className="font-semibold text-sm text-foreground">{task.context?.environment || "-"}</div>
                </div>
                <div className="rounded-md bg-muted/50 p-2 border border-border">
                  <div className="text-xs text-muted-foreground mb-0.5">Workstation ID</div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-1">
                    {task.context?.workstationId || "-"}
                    {task.context?.workstationId && (
                      <CopyButton text={task.context.workstationId} label="Copy workstation ID" iconSize={12} />
                    )}
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 p-2 border border-border">
                  <div className="text-xs text-muted-foreground mb-0.5">AD User</div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-1">
                    {task.context?.adUser || "-"}
                    {task.context?.adUser && (
                      <CopyButton text={task.context.adUser} label="Copy AD user" iconSize={12} />
                    )}
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 p-2 border border-border">
                  <div className="text-xs text-muted-foreground mb-0.5">Manufacturer</div>
                  <div className="font-semibold text-sm text-foreground">{task.context?.manufacturer || "-"}</div>
                </div>
                <div className="rounded-md bg-muted/50 p-2 border border-border">
                  <div className="text-xs text-muted-foreground mb-0.5">Version</div>
                  <div className="font-semibold text-sm text-foreground">{task.context?.version || "-"}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column (25% / 1fr) */}
        <div className="flex flex-col h-full min-h-0 gap-4">
          {/* Assign Task */}
          {(currentUser.role === Role.Admin || currentUser.role === Role.TeamLead) && (
            <div className="card-base flex flex-col h-auto shrink-0">
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
          <div className="card-base flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-4 flex flex-col h-full min-h-0">
              <TaskAttachments taskId={task.id} attachments={task.attachments} currentUser={currentUser} />
            </div>
          </div>
        </div>

        {/* Right Column (25% / 1fr) */}
        <div className="flex flex-col h-full min-h-0 gap-4">
          {/* Update Status */}
          <div className="card-base flex flex-col h-full min-h-0 overflow-hidden">
            <div className="p-6 flex flex-col h-full min-h-0">
              <h2 className="text-lg font-semibold text-foreground mb-4 shrink-0">Update Status</h2>
              <StatusUpdateForm 
                taskId={task.id}
                currentStatus={task.status}
              />
              <div className="mt-4 pt-4 border-t border-border shrink-0">
                <p className="text-xs text-muted-foreground mb-2">Quick Status Change:</p>
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
        <div className="card-base w-full md:w-3/4 lg:w-2/3 max-w-4xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-primary" />
            Comments
          </h2>

          <CommentInput taskId={task.id} />

          <div className="space-y-3 mt-4">
            {task.comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare size={48} className="mx-auto mb-3 text-muted-foreground/50" />
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              task.comments.map((comment: TaskWithRelations['comments'][0]) => (
                <div key={comment.id} className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <User size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">{comment.user?.name || "User"}</div>
                          <AuditPreview
                            lastUpdated={comment.createdAt}
                            updatedBy={comment.user?.name}
                            change="Comment created"
                          >
                            <div className="text-xs text-muted-foreground mt-1 cursor-help">
                              {formatDateTime(comment.createdAt)}
                            </div>
                          </AuditPreview>
                        </div>
                        {(comment.userId === currentUser.id || currentUser.role === Role.Admin) && (
                          <DeleteCommentButton 
                            commentId={comment.id}
                            commentContent={comment.content}
                          />
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
