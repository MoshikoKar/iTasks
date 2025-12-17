"use client";

import { useState } from "react";
import { UserSearch } from "./UserSearch";
import { User as UserIcon, UserPlus } from "lucide-react";

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

  const handleAssign = async (user: User) => {
    setLoading(true);
    try {
      await onAssign(taskId, user.id);
      setIsChangingAssignee(false);
    } catch (error) {
      console.error("Failed to assign task:", error);
      alert("Failed to assign task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTechnician = async (user: User) => {
    setLoading(true);
    try {
      await onAddTechnician(taskId, user.id);
    } catch (error) {
      console.error("Failed to add technician:", error);
      alert("Failed to add technician. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTechnician = async (technicianId: string) => {
    setChangingTechnicianId(technicianId);
    try {
      await onRemoveTechnician(taskId, technicianId);
    } catch (error) {
      console.error("Failed to remove technician:", error);
      alert("Failed to remove technician. Please try again.");
    } finally {
      setChangingTechnicianId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <UserPlus size={20} className="text-blue-600" />
        Assign Task
      </h2>

      <div className="space-y-6">
        {/* Main Assignee */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <UserIcon size={18} className="text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Main Assignee
                </div>
                <div className="font-semibold text-slate-900">
                  {currentAssignee?.name || "Unassigned"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsChangingAssignee(true)}
              className="neu-button inline-flex items-center justify-center text-sm font-medium"
              style={{ fontSize: '14px', padding: '8px 20px' }}
            >
              Change
            </button>
          </div>

          {isChangingAssignee && (
            <div className="space-y-3">
              <UserSearch
                onSelect={handleAssign}
                placeholder="Search for a user to set as main assignee..."
                excludeUserIds={currentAssignee ? [currentAssignee.id] : []}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsChangingAssignee(false)}
                  disabled={loading}
                  className="neu-button inline-flex items-center justify-center text-sm font-medium disabled:opacity-50"
                  style={{ fontSize: '14px', padding: '8px 20px' }}
                >
                  Cancel
                </button>
              </div>
              {loading && (
                <div className="text-sm text-slate-500">Updating main assignee...</div>
              )}
            </div>
          )}
        </div>

        {/* Technicians */}
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Technicians (Viewers / Secondary Contributors)
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Add additional technicians who should follow or help with this task.
            </p>
          </div>

          {technicians.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {technicians.map((tech) => (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => handleRemoveTechnician(tech.id)}
                  disabled={changingTechnicianId === tech.id}
                  className="neu-button inline-flex items-center gap-2 text-xs font-medium disabled:opacity-60"
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                >
                  <span>{tech.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    Remove
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-3 text-xs text-slate-500">
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
            <div className="mt-2 text-sm text-slate-500">Updating technicians...</div>
          )}
        </div>
      </div>
    </div>
  );
}
