"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, User as UserIcon } from "lucide-react";
import { Button } from "./button";
import { ErrorAlert } from "./ui/error-alert";

const MAX_LENGTH = 5000;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CommentInputProps {
  taskId: string;
  onSubmit?: (content: string, mentionedUserIds: string[]) => Promise<void>;
}

export function CommentInput({ taskId, onSubmit }: CommentInputProps) {
  const [content, setContent] = useState("");
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<Map<string, User>>(new Map());
  const [cursorPosition, setCursorPosition] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mentionDropdownRef.current && !mentionDropdownRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mentionSearch) {
      setMentionUsers([]);
      return;
    }

    const fetchUsers = async () => {
      try {
        const { fetchUsersWithCache } = await import("@/lib/user-search-cache");
        const data = await fetchUsersWithCache(mentionSearch);
        setMentionUsers(data);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [mentionSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    // Limit to MAX_LENGTH
    if (value.length <= MAX_LENGTH) {
      setContent(value);
      setCursorPosition(cursorPos);
    } else {
      // If past limit, truncate and restore cursor position
      const truncated = value.substring(0, MAX_LENGTH);
      setContent(truncated);
      setCursorPosition(Math.min(cursorPos, MAX_LENGTH));
    }

    // Detect @ mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @ (valid mention)
      if (!textAfterAt.includes(" ")) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, []);

  const insertMention = useCallback((user: User) => {
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const beforeMention = content.substring(0, lastAtIndex);
      const newContent = `${beforeMention}@${user.name} ${textAfterCursor}`;

      setContent(newContent);
      setMentionedUsers(new Map(mentionedUsers.set(user.id, user)));
      setShowMentions(false);
      setMentionSearch("");

      // Focus back on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + user.name.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  }, [content, cursorPosition, mentionedUsers]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      if (onSubmit) {
        // Use provided onSubmit if available (for backward compatibility)
        await onSubmit(content, Array.from(mentionedUsers.keys()));
      } else {
        // Otherwise, call the server action directly
        const { addCommentAction } = await import("@/app/actions/comments");
        await addCommentAction(taskId, content, Array.from(mentionedUsers.keys()));
      }
      setContent("");
      setMentionedUsers(new Map());
      setError("");
    } catch (error) {
      console.error("Failed to post comment:", error);
      setError("Failed to post comment. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [content, mentionedUsers, onSubmit, taskId]);

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} onDismiss={() => setError('')} />
        </div>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          rows={3}
          className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all resize-none"
          placeholder="Add a comment... (Type @ to mention someone)"
          disabled={loading}
          maxLength={MAX_LENGTH}
        />
        <div className="mt-1 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-neutral-400">
            {content.length} / {MAX_LENGTH} characters
            {content.length > MAX_LENGTH * 0.9 && (
              <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">
                ({MAX_LENGTH - content.length} remaining)
              </span>
            )}
          </div>
        </div>

        {showMentions && mentionSearch !== undefined && (
          <div
            ref={mentionDropdownRef}
            className="absolute z-50 mt-1 w-full max-w-md rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg max-h-60 overflow-y-auto"
            style={{
              top: "100%",
              left: 0,
            }}
          >
            {mentionUsers.length === 0 ? (
              <div className="p-3 text-center text-sm text-slate-500 dark:text-neutral-400">
                {mentionSearch ? "No users found" : "Start typing to search..."}
              </div>
            ) : (
              <div className="py-1">
                {mentionUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => insertMention(user)}
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

      {mentionedUsers.size > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from(mentionedUsers.values()).map((user) => (
            <div key={user.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-xs">
              <UserIcon size={12} className="text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">{user.name}</span>
            </div>
          ))}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !content.trim() || content.length > MAX_LENGTH}
        size="md"
        className="mt-3 gap-2"
        isLoading={loading}
      >
        <MessageSquare size={16} />
        {loading ? "Posting..." : "Post Comment"}
      </Button>
    </form>
  );
}
