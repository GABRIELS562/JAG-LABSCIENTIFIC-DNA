import * as React from "react"

export function Card({ className = "", ...props }) {
  return (
    <div className={`rounded-xl border bg-white shadow-sm ${className}`} {...props} />
  )
}

export function CardHeader({ className = "", ...props }) {
  return <div className={`p-6 pb-0 ${className}`} {...props} />
}

export function CardTitle({ className = "", ...props }) {
  return <h2 className={`text-2xl font-bold ${className}`} {...props} />
}

export function CardContent({ className = "", ...props }) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />
} 