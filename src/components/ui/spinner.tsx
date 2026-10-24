import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils/index"

// `player` sits over the video while it buffers.
const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      default: "size-4",
      player: "size-10 text-primary",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

function Spinner({ className, size, ...props }: React.ComponentProps<"svg"> & VariantProps<typeof spinnerVariants>) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  )
}

export { Spinner }
