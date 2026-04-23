import { cn } from "@/lib/utils"

interface ScoreDisplayProps {
  value: number
  label: string
  unit?: string
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "success" | "warning" | "danger"
  className?: string
}

const sizeConfig = {
  sm: {
    value: "text-2xl",
    label: "text-xs",
    unit: "text-sm",
  },
  md: {
    value: "text-4xl",
    label: "text-sm",
    unit: "text-lg",
  },
  lg: {
    value: "text-5xl md:text-6xl",
    label: "text-base",
    unit: "text-xl",
  },
  xl: {
    value: "text-6xl md:text-8xl",
    label: "text-lg",
    unit: "text-2xl",
  },
}

const variantConfig = {
  default: "text-obsidiana",
  success: "text-nopal",
  warning: "text-maiz",
  danger: "text-tierra",
}

export function ScoreDisplay({
  value,
  label,
  unit,
  size = "md",
  variant = "default",
  className,
}: ScoreDisplayProps) {
  const sizes = sizeConfig[size]

  return (
    <div className={cn("text-center", className)}>
      <div className={cn("font-mono font-bold leading-none", sizes.value, variantConfig[variant])}>
        {value}
        {unit && (
          <span className={cn("font-normal ml-1", sizes.unit)}>{unit}</span>
        )}
      </div>
      <p className={cn("text-humo mt-2 font-medium", sizes.label)}>{label}</p>
    </div>
  )
}

interface ScoreCardProps {
  value: number
  label: string
  unit?: string
  icon?: React.ReactNode
  className?: string
}

export function ScoreCard({ value, label, unit, icon, className }: ScoreCardProps) {
  return (
    <div
      className={cn(
        "bg-lino border-2 border-tierra rounded-xl p-4 md:p-6 text-center",
        className
      )}
    >
      {icon && <div className="mb-2 flex justify-center text-tierra">{icon}</div>}
      <div className="font-mono text-3xl md:text-4xl font-bold text-obsidiana">
        {value}
        {unit && <span className="text-lg md:text-xl font-normal text-humo ml-1">{unit}</span>}
      </div>
      <p className="text-sm md:text-base text-humo mt-1 font-medium">{label}</p>
    </div>
  )
}

interface PointsBadgeProps {
  points: number
  size?: "sm" | "md"
  active?: boolean
  className?: string
}

export function PointsBadge({ points, size = "sm", active = false, className }: PointsBadgeProps) {
  const sizeLabel: Record<number, string> = {
    1: "hasta 3\"",
    2: "3\" a 6\"",
    3: "6\" a 9\"",
    4: "más de 9\" / agujero",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 font-mono font-semibold",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        active 
          ? "bg-arcilla text-arena border-arcilla" 
          : "bg-lino text-tierra border-tierra",
        className
      )}
    >
      {points}pt — {sizeLabel[points] || `${points}pt`}
    </span>
  )
}
