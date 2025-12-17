export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-slate-200 dark:bg-neutral-700 rounded-lg animate-pulse"></div>
        <div className="h-10 w-32 bg-slate-200 dark:bg-neutral-700 rounded-lg animate-pulse"></div>
      </div>

      {/* Filters Skeleton */}
      <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-5 shadow-sm">
        <div className="h-6 w-24 bg-slate-200 dark:bg-neutral-700 rounded mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse"></div>
              <div className="h-10 bg-slate-200 dark:bg-neutral-700 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm overflow-hidden">
        <div className="bg-slate-100 dark:bg-neutral-700/50 p-4">
          <div className="h-6 w-full bg-slate-200 dark:bg-neutral-700 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-neutral-700">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="h-6 w-20 bg-slate-200 dark:bg-neutral-700 rounded-full animate-pulse"></div>
              <div className="h-6 w-20 bg-slate-200 dark:bg-neutral-700 rounded-full animate-pulse"></div>
              <div className="h-6 flex-1 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse"></div>
              <div className="h-6 w-24 bg-slate-200 dark:bg-neutral-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
