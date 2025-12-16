export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse"></div>

      {/* Stats Cards */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="h-6 w-40 bg-slate-200 rounded mb-4 animate-pulse"></div>
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="h-4 w-20 bg-slate-200 rounded mb-2 animate-pulse"></div>
              <div className="h-8 w-12 bg-slate-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
