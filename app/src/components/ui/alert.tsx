import * as React from "react"

import { cn } from "@/lib/utils"

const Alert = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & { variant?: "default" | "destructive" }
>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4",
        variant === "default" && "bg-gray-50 text-gray-900 border-gray-200",
        variant === "destructive" && "border-red-200 bg-red-50 text-red-900",
        className
      )}
      {...props}
    />
  )
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<"h5">
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
