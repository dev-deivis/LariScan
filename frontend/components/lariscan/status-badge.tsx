import { Check, X, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "aprobado" | "rechazado" | "advertencia" | "proceso"

interface StatusBadgeProps {
  status: Status
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  className?: string
}

const statusConfig = {
  aprobado: {
    label: "APROBADO",
    icon: Check,
    bgClass: "bg-nopal",
    textClass: "text-arena",
  },
  rechazado: {
    label: "RECHAZADO",
    icon: X,
    bgClass: "bg-tierra",
    textClass: "text-arena",
  },
  advertencia: {
    label: "ADVERTENCIA",
    icon: AlertTriangle,
    bgClass: "bg-maiz",
    textClass: "text-obsidiana",
  },
  proceso: {
    label: "EN PROCESO",
    icon: Loader2,
    bgClass: "bg-arcilla",
    textClass: "text-arena",
  },
}

const sizeConfig = {
  sm: "px-3 py-1 text-sm gap-1.5",
  md: "px-4 py-2 text-lg gap-2",
  lg: "px-6 py-3 text-2xl gap-3 font-bold",
}

const iconSizeConfig = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
}

export function StatusBadge({ 
  status, 
  size = "md", 
  showIcon = true,
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg font-semibold",
        config.bgClass,
        config.textClass,
        sizeConfig[size],
        status === "proceso" && "animate-processing",
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(
          iconSizeConfig[size],
          status === "proceso" && "animate-spin"
        )} />
      )}
      <span>{config.label}</span>
    </div>
  )
}

interface VeredictoBannerProps {
  aprobado: boolean
  mensaje?: string
  className?: string
}

export function VeredictoBanner({ 
  aprobado, 
  mensaje,
  className 
}: VeredictoBannerProps) {
  const defaultMensaje = aprobado 
    ? "Calidad aceptable según ASTM D5430" 
    : "No cumple estándares ASTM D5430"

  return (
    <div
      className={cn(
        "w-full py-4 px-6 flex items-center justify-center gap-3 rounded-xl",
        aprobado ? "bg-nopal" : "bg-tierra",
        "text-arena",
        className
      )}
    >
      {aprobado ? (
        <Check className="w-8 h-8" strokeWidth={3} />
      ) : (
        <X className="w-8 h-8" strokeWidth={3} />
      )}
      <div className="text-center">
        <p className="font-serif text-2xl md:text-3xl font-bold">
          {aprobado ? "APROBADO" : "RECHAZADO"}
        </p>
        <p className="text-sm md:text-base opacity-90">
          {mensaje || defaultMensaje}
        </p>
      </div>
    </div>
  )
}
