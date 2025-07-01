import React from "react";

const cn = (...classes) => classes.filter(Boolean).join(' ');

export const Button = React.forwardRef(
  ({ className = "", variant = "primary", size = "default", ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      primary: "btn-primary",
      secondary: "btn-secondary", 
      outline: "border border-primary text-primary bg-transparent hover:bg-primary hover:text-white",
      ghost: "hover:bg-gray-100 hover:text-primary",
      destructive: "bg-red-500 text-white hover:bg-red-600",
    };
    
    const sizes = {
      default: "h-10 px-4 py-2 rounded-md",
      sm: "h-8 px-3 text-sm rounded-sm",
      lg: "h-12 px-8 text-lg rounded-lg", 
      icon: "h-10 w-10 rounded-md",
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant] || variants.primary,
          sizes[size] || sizes.default,
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button"; 