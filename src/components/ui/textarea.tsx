import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Textarea component with auto-sizing support.
 *
 * Browser Support for `field-sizing: content`:
 * - Chrome 123+, Edge 123+: Supported
 * - Safari 17.4+: Supported
 * - Firefox: Not supported (falls back to min-h-16 fixed height)
 *
 * The fallback min-height ensures usable appearance in unsupported browsers.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
