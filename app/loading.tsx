export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse"></div>
          <div className="h-4 w-64 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-10 w-16 bg-slate-200 rounded animate-pulse"></div>
              </div>
              <div className="h-12 w-12 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-32 bg-slate-200 rounded mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
