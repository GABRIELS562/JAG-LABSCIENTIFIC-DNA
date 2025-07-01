import * as React from "react"

export function Table({ className = "", ...props }) {
  return <table className={`min-w-full divide-y divide-gray-200 ${className}`} {...props} />
}

export function TableHeader({ className = "", ...props }) {
  return <thead className={className} {...props} />
}

export function TableBody({ className = "", ...props }) {
  return <tbody className={className} {...props} />
}

export function TableRow({ className = "", ...props }) {
  return <tr className={className} {...props} />
}

export function TableHead({ className = "", ...props }) {
  return <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`} {...props} />
}

export function TableCell({ className = "", ...props }) {
  return <td className={`px-6 py-4 whitespace-nowrap ${className}`} {...props} />
} 