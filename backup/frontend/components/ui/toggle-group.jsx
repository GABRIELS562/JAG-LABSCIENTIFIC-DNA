import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

export function ToggleGroup({ className = "", ...props }) {
  return <ToggleGroupPrimitive.Root className={`inline-flex ${className}`} {...props} />
}

export function ToggleGroupItem({ className = "", ...props }) {
  return <ToggleGroupPrimitive.Item className={`px-4 py-2 border rounded-md text-gray-700 hover:bg-blue-100 data-[state=on]:bg-blue-500 data-[state=on]:text-white transition ${className}`} {...props} />
} 