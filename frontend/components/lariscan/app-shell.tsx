"use client"

import { ReactNode } from "react"
import {
  Camera,
  FileText,
  BarChart3,
  Settings,
  CheckCircle2,
  Volume2,
  User,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: ReactNode
  inspectorName?: string
  turno?: string
}

const navItems = [
  { href: "/", icon: Camera, label: "Inspección" },
  { href: "/resumen", icon: FileText, label: "Resumen" },
  { href: "/historial", icon: BarChart3, label: "Historial" },
  { href: "/normas", icon: Settings, label: "Normas" },
  { href: "/validacion", icon: CheckCircle2, label: "Validar" },
  { href: "/reporte", icon: FileText, label: "Reporte" },
  { href: "/auditoria", icon: Shield, label: "Auditoría" },
]

export function AppShell({ 
  children, 
  inspectorName = "María García",
  turno = "Turno Matutino"
}: AppShellProps) {
  const pathname = usePathname()
  
  const currentTime = new Date().toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-lino border-b-2 border-tierra px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo LáriScan */}
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10">
              {/* Ícono abstracto: ojo/lente con tejido */}
              <svg viewBox="0 0 40 40" className="w-full h-full">
                {/* Tejido de fondo */}
                <pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse">
                  <path d="M0 2h4M2 0v4" stroke="#B5622A" strokeWidth="0.5" fill="none" opacity="0.6"/>
                </pattern>
                <circle cx="20" cy="20" r="18" fill="url(#weave)" stroke="#7C4A2D" strokeWidth="2"/>
                {/* Ojo/lente */}
                <ellipse cx="20" cy="20" rx="10" ry="7" fill="none" stroke="#7C4A2D" strokeWidth="2"/>
                <circle cx="20" cy="20" r="4" fill="#7C4A2D"/>
                <circle cx="18" cy="18" r="1.5" fill="#F2E8D5"/>
              </svg>
            </div>
            <span className="font-serif text-2xl font-bold text-tierra tracking-tight">
              LáriScan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Indicador de audio */}
          <button className="p-2 hover:bg-arena rounded-lg transition-colors" aria-label="Audio activo">
            <Volume2 className="w-5 h-5 text-tierra" />
          </button>
          
          {/* Info del inspector */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-sm font-semibold text-obsidiana">{inspectorName}</p>
              <p className="text-xs text-humo">{turno} • {currentTime}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-tierra flex items-center justify-center">
              <User className="w-5 h-5 text-arena" />
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1">
        {/* Sidebar navigation - visible on tablet and up */}
        <nav className="hidden md:flex flex-col w-20 lg:w-56 bg-lino border-r-2 border-tierra py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-4 mx-2 rounded-lg transition-all",
                  "hover:bg-arena",
                  isActive && "bg-tierra text-arena hover:bg-tierra"
                )}
              >
                <item.icon className={cn(
                  "w-6 h-6 flex-shrink-0",
                  isActive ? "text-arena" : "text-tierra"
                )} />
                <span className={cn(
                  "hidden lg:block font-medium",
                  isActive ? "text-arena" : "text-obsidiana"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom navigation - mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-lino border-t-2 border-tierra px-2 py-2 flex justify-around">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[64px] transition-all",
                isActive && "bg-tierra"
              )}
            >
              <item.icon className={cn(
                "w-6 h-6",
                isActive ? "text-arena" : "text-tierra"
              )} />
              <span className={cn(
                "text-xs font-medium",
                isActive ? "text-arena" : "text-humo"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
