'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  iconSize?: number;
}

export function CopyButton({ text, label = 'Copy', className = '', iconSize = 14 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ${className}`}
      title={label}
      aria-label={label}
    >
      {copied ? (
        <Check size={iconSize} className="text-green-600 dark:text-green-400" />
      ) : (
        <Copy size={iconSize} />
      )}
    </button>
  );
}

interface CopyTextProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyText({ text, label = 'Copy', className = '' }: CopyTextProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="font-mono text-sm">{text}</span>
      <CopyButton text={text} label={label} />
    </span>
  );
}
