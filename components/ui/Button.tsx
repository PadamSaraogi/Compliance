import * as React from "react"
import { cn } from "./Badge"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "danger" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    
    const variants = {
      default: "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-light)] shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)]",
      secondary: "bg-white text-[var(--color-text)] border border-slate-200 hover:bg-slate-50",
      danger: "bg-[var(--color-overdue)] text-white hover:bg-red-700 shadow-sm",
      ghost: "hover:bg-slate-100 hover:text-slate-900 text-slate-600 bg-transparent",
      link: "text-[var(--color-info)] hover:underline bg-transparent"
    };
    
    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-8 text-base",
      icon: "h-9 w-9 flex items-center justify-center p-0"
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
