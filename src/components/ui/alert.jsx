import * as React from "react"
import { cn } from "@/lib/utils"

const alertVariants = {
  default: "bg-white text-gray-900 border-gray-200 transition-colors duration-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100",
  destructive: "border-red-500/50 text-red-600 bg-red-50 transition-colors duration-300 dark:border-red-500/50 dark:text-red-400 dark:bg-red-950/50 [&>svg]:text-red-600 dark:[&>svg]:text-red-400",
  warning: "border-yellow-500/50 text-yellow-800 bg-yellow-50 transition-colors duration-300 dark:border-yellow-500/50 dark:text-yellow-300 dark:bg-yellow-950/50 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-300",
  success: "border-green-500/50 text-green-800 bg-green-50 transition-colors duration-300 dark:border-green-500/50 dark:text-green-300 dark:bg-green-950/50 [&>svg]:text-green-600 dark:[&>svg]:text-green-300",
}

const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      "relative w-full rounded-lg border p-4 transition-colors duration-300 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
      alertVariants[variant],
      className
    )}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight transition-colors duration-300", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed transition-colors duration-300", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }