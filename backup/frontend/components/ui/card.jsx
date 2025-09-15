import * as React from "react"

const cn = (...classes) => classes.filter(Boolean).join(' ');

export function Card({ className = "", ...props }) {
  return (
    <div className={cn(
      "rounded-xl border bg-white shadow-sm transition-colors duration-300",
      "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100",
      className
    )} {...props} />
  )
}

export function CardHeader({ className = "", ...props }) {
  return (
    <div className={cn(
      "p-6 pb-0 transition-colors duration-300",
      "dark:text-gray-100",
      className
    )} {...props} />
  )
}

export function CardTitle({ className = "", ...props }) {
  return (
    <h2 className={cn(
      "text-2xl font-bold transition-colors duration-300",
      "dark:text-gray-100",
      className
    )} {...props} />
  )
}

export function CardContent({ className = "", ...props }) {
  return (
    <div className={cn(
      "p-6 pt-0 transition-colors duration-300",
      "dark:text-gray-100",
      className
    )} {...props} />
  )
} 