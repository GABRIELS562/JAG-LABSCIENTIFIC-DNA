import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

export function Tabs({ className = "", ...props }) {
  return <TabsPrimitive.Root className={className} {...props} />
}

export function TabsList({ className = "", ...props }) {
  return <TabsPrimitive.List className={`flex border-b ${className}`} {...props} />
}

export function TabsTrigger({ className = "", ...props }) {
  return <TabsPrimitive.Trigger className={`px-4 py-2 font-medium text-gray-700 hover:text-blue-600 border-b-2 border-transparent hover:border-blue-600 transition ${className}`} {...props} />
}

export function TabsContent({ className = "", ...props }) {
  return <TabsPrimitive.Content className={className} {...props} />
} 