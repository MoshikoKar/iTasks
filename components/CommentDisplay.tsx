"use client";

interface Mention {
  user: {
    id: string;
    name: string;
  };
}

interface CommentDisplayProps {
  content: string;
  mentions: Mention[];
}

export function CommentDisplay({ content, mentions }: CommentDisplayProps) {
  const mentionNames = mentions.map(m => m.user.name);

  // Parse content and highlight mentions
  const parts = content.split(/(@\w+(?:\s+\w+)*)/g);

  return (
    <div className="text-sm text-slate-700 dark:text-neutral-300 mt-2 whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        // Check if this part is a mention
        if (part.startsWith("@")) {
          const mentionText = part.substring(1).trim();
          const isMention = mentionNames.some(name =>
            name.toLowerCase() === mentionText.toLowerCase()
          );

          if (isMention) {
            return (
              <span
                key={index}
                className="inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800"
              >
                {part}
              </span>
            );
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}
