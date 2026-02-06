import * as React from 'react';import { cn } from '@/lib/utils';

interface ButtonVariants {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const variantsMap = {
  variant: {
    default: 'bg-red-600 text-white hover:bg-red-700',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-zinc-700 bg-transparent hover:bg-zinc-800 text-white',
    secondary: 'bg-zinc-800 text-white hover:bg-zinc-700',
    ghost: 'hover:bg-zinc-800 text-white',
    link: 'text-red-600 underline-offset-4 hover:underline',
  },
  size: {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  },
};

const baseStyles =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';

/* Fake export to satisfy existing imports if any check for buttonVariants explicitly, though ideally we remove it */
export const buttonVariants = ({ variant = 'default', size = 'default', className }: ButtonVariants & { className?: string } = {}) => {
  return cn(baseStyles, variantsMap.variant[variant], variantsMap.size[size], className);
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  return <button className={buttonVariants({ variant, size, className })} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button };
