"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { PieChart, ListTodo } from "lucide-react";

interface ListItem {
  name: string;
  count: number;
}

interface FullListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: ListItem[];
  type: "branches" | "technicians";
  icon: React.ReactNode;
}

export function FullListModal({ isOpen, onClose, title, items, type, icon }: FullListModalProps) {
  const filterParam = type === "branches" ? "branch" : "assignee";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
    >
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {type === "branches" ? (
              <PieChart size={40} className="mx-auto text-muted-foreground/50 mb-2" />
            ) : (
              <ListTodo size={40} className="mx-auto text-muted-foreground/50 mb-2" />
            )}
            <p className="text-foreground font-semibold mb-1">
              {type === "branches" ? "All locations covered" : "Workload balanced"}
            </p>
            <p className="text-sm text-muted-foreground">
              {type === "branches" ? "No branch-specific tasks yet" : "No active task assignments"}
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {items.map((item) => (
                <Link
                  key={item.name}
                  href={`/tasks?${filterParam}=${encodeURIComponent(item.name)}`}
                  onClick={onClose}
                  className="block p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="font-medium text-foreground truncate">{item.name}</span>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      {item.count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}