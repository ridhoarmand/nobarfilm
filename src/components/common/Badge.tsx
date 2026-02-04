import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-red-600/90 text-white hover:bg-red-600',
    secondary: 'border-transparent bg-zinc-700 text-zinc-100 hover:bg-zinc-600',
    destructive: 'border-transparent bg-red-500 text-white hover:bg-red-500/80',
    outline: 'text-zinc-100 border-zinc-600',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
