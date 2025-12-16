interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CacheEntry {
  data: User[];
  timestamp: number;
}

class UserSearchCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  get(key: string): User[] | null {
    const cacheKey = key.toLowerCase().trim();
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: User[]): void {
    const cacheKey = key.toLowerCase().trim();
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const userSearchCache = new UserSearchCache();

import { dedupeRequest } from './request-dedup';

export async function fetchUsersWithCache(search: string): Promise<User[]> {
  const cached = userSearchCache.get(search);
  if (cached) {
    return cached;
  }

  return dedupeRequest(`user-search:${search}`, async () => {
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`);
    if (!res.ok) {
      throw new Error('Failed to fetch users');
    }

    const data = await res.json();
    userSearchCache.set(search, data);
    return data;
  });
}
