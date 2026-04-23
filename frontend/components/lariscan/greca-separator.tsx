import { cn } from "@/lib/utils"

interface GrecaSeparatorProps {
  className?: string
  variant?: "horizontal" | "vertical"
}

export function GrecaSeparator({ className, variant = "horizontal" }: GrecaSeparatorProps) {
  if (variant === "vertical") {
    return (
      <div
        className={cn("w-0.5 bg-tierra/30", className)}
        style={{
          backgroundImage: `repeating-linear-gradient(
            180deg,
            var(--tierra) 0px,
            var(--tierra) 8px,
            transparent 8px,
            transparent 12px,
            var(--tierra) 12px,
            var(--tierra) 16px,
            transparent 16px,
            transparent 24px
          )`,
          backgroundSize: "2px 24px",
        }}
      />
    )
  }

  return (
    <div
      className={cn("h-0.5 w-full", className)}
      style={{
        backgroundImage: `repeating-linear-gradient(
          90deg,
          var(--tierra) 0px,
          var(--tierra) 8px,
          transparent 8px,
          transparent 12px,
          var(--tierra) 12px,
          var(--tierra) 16px,
          transparent 16px,
          transparent 24px
        )`,
        backgroundSize: "24px 2px",
      }}
    />
  )
}

export function GrecaCorner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("w-6 h-6 text-tierra", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M0 12 H8 V4 H16 V12 H24" />
      <path d="M8 12 V20 H16 V12" />
    </svg>
  )
}
