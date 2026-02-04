import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-lg animate-in zoom-in duration-200">{children}</div>
    </div>
  );
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden', className)}>{children}</div>;
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6 pb-2', className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-xl font-bold text-white', className)}>{children}</h2>;
}

export function DialogClose({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn('absolute right-4 top-4 p-2 rounded-full hover:bg-zinc-800 transition-colors', className)}>
      <X className="w-5 h-5 text-gray-400" />
    </button>
  );
}
