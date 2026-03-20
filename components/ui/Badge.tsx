import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'neutral';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-800",
    success: "bg-green-600 text-white", // safe
    warning: "bg-amber-500 text-white", // warning
    danger: "bg-red-600 text-white", // overdue
    info: "bg-blue-600 text-white",
    neutral: "bg-gray-500 text-white",
    outline: "border border-slate-200 text-slate-800 bg-transparent"
  };

  return (
    <span 
      className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider inline-flex items-center", variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
