import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-200';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={clsx(baseClasses, variantClasses[variant], className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Skeleton className="h-8 w-1/3 mb-4" variant="text" />
      <Skeleton className="h-32 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" variant="text" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-200">
          <Skeleton className="h-4 w-1/4" variant="text" />
          <Skeleton className="h-4 w-1/6" variant="text" />
          <Skeleton className="h-4 w-1/6" variant="text" />
          <Skeleton className="h-4 w-1/6" variant="text" />
          <Skeleton className="h-4 w-1/6" variant="text" />
        </div>
      ))}
    </div>
  );
}
