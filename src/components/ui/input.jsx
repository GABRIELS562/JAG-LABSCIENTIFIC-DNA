import * as React from "react"

const cn = (...classes) => classes.filter(Boolean).join(' ');

export const Input = React.forwardRef(({ className = "", ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm transition-colors duration-300",
        "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
        "dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400",
        "dark:focus:border-blue-400 dark:focus:ring-blue-400",
        className
      )}
      {...props}
    />
  )
})
Input.displayName = "Input" 