import * as React from "react"

export function Card({ className = "", ...props }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white shadow-professional hover:shadow-professional-lg transition-shadow duration-300 ${className}`} {...props} />
  )
}

export function CardHeader({ className = "", ...props }) {
  return <div className={`p-8 pb-2 ${className}`} {...props} />
}

export function CardTitle({ className = "", ...props }) {
  return <h2 className={`text-2xl font-bold text-primary-900 font-display ${className}`} {...props} />
}

export function CardContent({ className = "", ...props }) {
  return <div className={`p-8 pt-4 text-neutral-700 leading-relaxed ${className}`} {...props} />
} 