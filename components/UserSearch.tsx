"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, User as UserIcon } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserSearchProps {
  onSelect: (user: User) => void;
  placeholder?: string;
  className?: string;
  excludeUserIds?: string[];
}

export function UserSearch({ onSelect, placeholder = "Search users...", className = "", excludeUserIds = [] }: UserSearchProps) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { fetchUsersWithCache } = await import("@/lib/user-search-cache");
        const data = await fetchUsersWithCache(search);
        setUsers(data.filter((u: User) => !excludeUserIds.includes(u.id)));
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [search, excludeUserIds]);

  const handleSelect = useCallback((user: User) => {
    onSelect(user);
    setSearch("");
    setUsers([]);
    setIsOpen(false);
  }, [onSelect]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
        />
      </div>

      {isOpen && search.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-sm text-slate-500 dark:text-neutral-400">Searching...</div>
          ) : users.length === 0 ? (
            <div className="p-3 text-center text-sm text-slate-500 dark:text-neutral-400">No users found</div>
          ) : (
            <div className="py-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-neutral-700 transition-colors flex items-center gap-3"
                >
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5">
                    <UserIcon size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-neutral-100 text-sm">{user.name}</div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">{user.email}</div>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-neutral-500 uppercase">{user.role}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
