"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, User as UserIcon } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CommentInputProps {
  onSubmit: (content: string, mentionedUserIds: string[]) => Promise<void>;
}

export function CommentInput({ onSubmit }: CommentInputProps) {
  const [content, setContent] = useState("");
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<Map<string, User>>(new Map());
  const [cursorPosition, setCursorPosition] = useState(0);
  const [loading, setLoading] = useState(false);
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
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(mentionSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setMentionUsers(data);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [mentionSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setContent(value);
    setCursorPosition(cursorPos);

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
  };

  const insertMention = (user: User) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await onSubmit(content, Array.from(mentionedUsers.keys()));
      setContent("");
      setMentionedUsers(new Map());
    } catch (error) {
      console.error("Failed to post comment:", error);
      alert("Failed to post comment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
          placeholder="Add a comment... (Type @ to mention someone)"
          disabled={loading}
        />

        {showMentions && mentionSearch !== undefined && (
          <div
            ref={mentionDropdownRef}
            className="absolute z-50 mt-1 w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto"
            style={{
              top: "100%",
              left: 0,
            }}
          >
            {mentionUsers.length === 0 ? (
              <div className="p-3 text-center text-sm text-slate-500">
                {mentionSearch ? "No users found" : "Start typing to search..."}
              </div>
            ) : (
              <div className="py-1">
                {mentionUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => insertMention(user)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <div className="rounded-full bg-blue-100 p-1.5">
                      <UserIcon size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm">{user.name}</div>
                      <div className="text-xs text-slate-500 truncate">{user.email}</div>
                    </div>
                    <div className="text-xs text-slate-400 uppercase">{user.role}</div>
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
            <div key={user.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs">
              <UserIcon size={12} className="text-blue-600" />
              <span className="text-blue-700 font-medium">{user.name}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <MessageSquare size={16} />
        {loading ? "Posting..." : "Post Comment"}
      </button>
    </form>
  );
}
