export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
      </div>

      {/* Filters Skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-6 w-24 bg-slate-200 rounded mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-10 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-100 p-4">
          <div className="h-6 w-full bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-slate-200">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-6 flex-1 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-6 w-24 bg-slate-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
