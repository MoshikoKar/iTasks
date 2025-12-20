"use client";

import { useState, useRef } from "react";
import { UserSearch } from "./UserSearch";
import { User as UserIcon, UserPlus } from "lucide-react";
import { ErrorAlert } from "./ui/error-alert";
import { Button } from "./button";
import { toast } from "sonner";
import { clsx } from "clsx";
import { useChangeHighlight } from "@/hooks/useChangeHighlight";
import { useUndo } from "@/hooks/useUndo";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TaskAssignmentProps {
  taskId: string;
  currentAssignee: { id: string; name: string } | null;
  technicians: User[];
  onAssign: (taskId: string, assigneeId: string) => Promise<void>;
  onAddTechnician: (taskId: string, technicianId: string) => Promise<void>;
  onRemoveTechnician: (taskId: string, technicianId: string) => Promise<void>;
}

export function TaskAssignment({
  taskId,
  currentAssignee,
  technicians,
  onAssign,
  onAddTechnician,
  onRemoveTechnician,
}: TaskAssignmentProps) {
  const [isChangingAssignee, setIsChangingAssignee] = useState(false);
  const [changingTechnicianId, setChangingTechnicianId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const previousAssigneeRef = useRef<{ id: string; name: string } | null>(currentAssignee);
  const { executeWithUndo, isUndoing } = useUndo();

  const handleAssign = async (user: User) => {
    const oldAssignee = previousAssigneeRef.current;
    setLoading(true);
    setError('');
    try {
      await executeWithUndo(
        async () => {
          await onAssign(taskId, user.id);
          previousAssigneeRef.current = { id: user.id, name: user.name };
          setIsChangingAssignee(false);
        },
        async () => {
          if (oldAssignee) {
            await onAssign(taskId, oldAssignee.id);
            previousAssigneeRef.current = oldAssignee;
          }
        },
        `Task reassigned to ${user.name}`
      );
    } catch (error) {
      console.error("Failed to assign task:", error);
      setError("Failed to assign task. Please try again.");
      toast.error('Failed to assign task');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTechnician = async (user: User) => {
    setLoading(true);
    setError('');
    try {
      await onAddTechnician(taskId, user.id);
    } catch (error) {
      console.error("Failed to add technician:", error);
      setError("Failed to add technician. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTechnician = async (technicianId: string) => {
    setChangingTechnicianId(technicianId);
    setError('');
    try {
      await onRemoveTechnician(taskId, technicianId);
    } catch (error) {
      console.error("Failed to remove technician:", error);
      setError("Failed to remove technician. Please try again.");
    } finally {
      setChangingTechnicianId(null);
    }
  };

  return (
    <div className="card-base p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <UserPlus size={20} className="text-primary" />
        Assign Task
      </h2>

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} onDismiss={() => setError('')} />
        </div>
      )}

      <div className="space-y-6">
        {/* Main Assignee */}
        <div>
            <div className="flex items-center justify-between mb-3">
            <div className={clsx(
              "flex items-center gap-3 px-2 py-1 rounded-md transition-all",
              useChangeHighlight(currentAssignee?.id) && 'change-highlight'
            )}>
              <div className="rounded-full bg-primary/10 p-2">
                <UserIcon size={18} className="text-primary" />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Main Assignee
                </div>
                <div className="font-semibold text-foreground">
                  {currentAssignee?.name || "Unassigned"}
                </div>
              </div>
            </div>
                <Button
                  onClick={() => {
                    setIsChangingAssignee(true);
                    setError('');
                  }}
                  size="sm"
                  disabled={isUndoing}
            >
              Change
            </Button>
          </div>

          {isChangingAssignee && (
            <div className="space-y-3">
              <UserSearch
                onSelect={handleAssign}
                placeholder="Search for a user to set as main assignee..."
                excludeUserIds={currentAssignee ? [currentAssignee.id] : []}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setIsChangingAssignee(false);
                    setError('');
                  }}
                  disabled={loading}
                  size="sm"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
              {loading && (
                <div className="text-sm text-muted-foreground">Updating main assignee...</div>
              )}
            </div>
          )}
        </div>

        {/* Technicians */}
        <div className="border-t border-border pt-4">
          <div className="mb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Technicians (Viewers / Secondary Contributors)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Add additional technicians who should follow or help with this task.
            </p>
          </div>

          {technicians.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {technicians.map((tech) => (
                <Button
                  key={tech.id}
                  type="button"
                  onClick={() => handleRemoveTechnician(tech.id)}
                  disabled={changingTechnicianId === tech.id}
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                >
                  <span>{tech.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Remove
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="mb-3 text-xs text-muted-foreground">
              No technicians added yet.
            </div>
          )}

          <UserSearch
            onSelect={handleAddTechnician}
            placeholder="Add technicians to follow or assist..."
            excludeUserIds={[
              ...(currentAssignee ? [currentAssignee.id] : []),
              ...technicians.map((t) => t.id),
            ]}
          />

          {loading && !isChangingAssignee && (
            <div className="mt-2 text-sm text-muted-foreground">Updating technicians...</div>
          )}
        </div>
      </div>
    </div>
  );
}
