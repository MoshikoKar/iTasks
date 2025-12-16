import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

export function createLazyComponent<P = {}>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  LoadingComponent?: ComponentType
) {
  return dynamic(importFunc, {
    loading: LoadingComponent
      ? () => <LoadingComponent />
      : () => (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-600">Loading...</span>
            </div>
          </div>
        ),
    ssr: true,
  });
}

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-slate-600">Loading component...</span>
    </div>
  </div>
);
