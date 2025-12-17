export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 dark:bg-neutral-700 rounded-lg animate-pulse"></div>
          <div className="h-4 w-80 bg-slate-200 dark:bg-neutral-700 rounded-lg animate-pulse"></div>
        </div>
        <div className="h-10 w-48 bg-slate-200 dark:bg-neutral-700 rounded-lg animate-pulse"></div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm overflow-hidden">
        <div className="bg-slate-100 dark:bg-neutral-700/50 p-4">
          <div className="h-6 w-full bg-slate-200 dark:bg-neutral-700 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-neutral-700">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-200 dark:bg-neutral-700 rounded-lg animate-pulse"></div>
              <div className="h-6 flex-1 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse"></div>
              <div className="h-6 w-32 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse"></div>
              <div className="h-6 w-32 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
