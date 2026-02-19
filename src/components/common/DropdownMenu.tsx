import * as React from 'react';import { cn } from '@/lib/utils';

interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((child.type as any).displayName === 'DropdownMenuTrigger') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return React.cloneElement(child as React.ReactElement<any>, {
              onClick: () => setOpen(!open),
            });
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((child.type as any).displayName === 'DropdownMenuContent') {
            if (!open) return null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return React.cloneElement(child as React.ReactElement<any>, {
              onClose: () => setOpen(false),
            });
          }
        }
        return child;
      })}
    </div>
  );
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DropdownMenuTrigger({ children, onClick, asChild, ...props }: DropdownMenuTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.cloneElement(children as React.ReactElement<any>, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onClick: (e: any) => {
        onClick?.(e);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (children.props as any).onClick?.(e);
      },
      ...props,
    });
  }
  return (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  );
}
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'end';
  onClose?: () => void;
}

export function DropdownMenuContent({ children, className, align = 'end', onClose }: DropdownMenuContentProps) {
  return (
    <div
      className={cn(
        'absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 p-1 text-white shadow-md animate-in fade-in zoom-in duration-200',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            React.cloneElement(child as React.ReactElement<any>, {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick: (e: any) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (child.props as any).onClick?.(e);
                onClose?.();
              },
            })
          : child,
      )}
    </div>
  );
}
DropdownMenuContent.displayName = 'DropdownMenuContent';

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
}

export function DropdownMenuItem({ children, className, onClick, ...props }: DropdownMenuItemProps) {
  return (
    <button
      className={cn('relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-zinc-800 focus:bg-zinc-800 transition-colors', className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
DropdownMenuItem.displayName = 'DropdownMenuItem';
