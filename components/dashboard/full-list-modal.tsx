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
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const unique = items.length;
  const avg = unique > 0 ? total / unique : 0;

  const sortedItems = [...items].sort((a, b) => {
    const diff = a.count - b.count;
    return sortDir === "asc" ? diff : -diff;
  });

  const rankByName = new Map(sortedItems.map((it, idx) => [it.name, idx + 1]));
  const maxItem = sortedItems[0];
  const minItem = sortedItems[sortedItems.length - 1];

  const q = query.trim().toLowerCase();
  const visibleItems = q ? sortedItems.filter((it) => it.name.toLowerCase().includes(q)) : sortedItems;

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
          <>
            <div className="flex items-center gap-3">
              <div className="text-primary flex-shrink-0">{icon}</div>
              <div className="flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${type === "branches" ? "branches" : "technicians"}...`}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                className="h-9 px-3 rounded-md border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Sort: {sortDir === "desc" ? "High → Low" : "Low → High"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-lg font-semibold text-foreground">{total}</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Average</div>
                <div className="text-lg font-semibold text-foreground">{avg.toFixed(1)}</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Top</div>
                <div className="text-sm font-semibold text-foreground truncate">
                  {maxItem?.name ?? "-"}{maxItem ? ` (${maxItem.count})` : ""}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Bottom</div>
                <div className="text-sm font-semibold text-foreground truncate">
                  {minItem?.name ?? "-"}{minItem ? ` (${minItem.count})` : ""}
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {visibleItems.map((item) => {
                  const rank = rankByName.get(item.name) ?? 0;
                  const pct = total > 0 ? (item.count / total) * 100 : 0;

                  return (
                    <Link
                      key={item.name}
                      href={`/tasks?${filterParam}=${encodeURIComponent(item.name)}`}
                      onClick={onClose}
                      className="block p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">#{rank}</span>
                            <span className="font-medium text-foreground truncate">{item.name}</span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {pct.toFixed(1)}% of total
                          </div>
                        </div>

                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary flex-shrink-0">
                          {item.count}
                        </span>
                      </div>
                    </Link>
                  );
                })}

                {visibleItems.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No matches for "{query}"
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}