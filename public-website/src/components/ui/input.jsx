import * as React from "react"

export const Input = React.forwardRef(({ className = "", ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`block w-full rounded-lg border border-neutral-300 px-4 py-3 text-base shadow-professional focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 hover:border-neutral-400 ${className}`}
      {...props}
    />
  )
})
Input.displayName = "Input" 