const pendingRequests = new Map<string, Promise<any>>();

export function dedupeRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = fn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

export function clearPendingRequests(): void {
  pendingRequests.clear();
}

export function hasPendingRequest(key: string): boolean {
  return pendingRequests.has(key);
}
