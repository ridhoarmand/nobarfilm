'use client';import { useState } from 'react';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
  className?: string; // Allow custom styling
}

export function ErrorDisplay({ message = 'An unexpected error occurred.', onRetry, className }: ErrorDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error:', err);
    }
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-6 text-center space-y-4', className)}>
      <div className="bg-red-500/10 p-4 rounded-full">
        <h2 className="text-2xl font-bold text-red-500">Error</h2>
      </div>

      <p className="text-gray-400 max-w-md">{message}</p>

      <div className="flex gap-3 mt-4">
        {onRetry && (
          <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors">
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        )}

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors border border-zinc-700"
          title="Copy error message"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy Error'}
        </button>
      </div>
    </div>
  );
}
