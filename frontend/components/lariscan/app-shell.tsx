"use client"

import { useState, useEffect, ReactNode } from "react"
import {
  Camera,
  FileText,
  BarChart3,
  Settings,
  CheckCircle2,
  Volume2,
  User,
  Shield,
  Pencil,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "lariscan_sesion_v1"

export interface DatosSesion {
  inspector: string
  turno: string
  rolloNum: string
  proveedor: string
  material: string
}

interface AppShellProps {
  children: ReactNode
  onSesionActualizada?: (sesion: DatosSesion) => void
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

const TURNOS = ["Matutino", "Vespertino", "Nocturno"]

const FORM_VACIO: DatosSesion = {
  inspector: "",
  turno: "Matutino",
  rolloNum: "",
  proveedor: "",
  material: "",
}

export function AppShell({ children, onSesionActualizada }: AppShellProps) {
  const pathname = usePathname()
  const [sesion, setSesion] = useState<DatosSesion | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [draft, setDraft] = useState<DatosSesion>(FORM_VACIO)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const s: DatosSesion = JSON.parse(stored)
      setSesion(s)
      setDraft(s)
    } else {
      const year = new Date().getFullYear()
      const num = String(Math.floor(Math.random() * 9000) + 1000)
      setDraft((f) => ({ ...f, rolloNum: `R-${year}-${num}` }))
      setMostrarForm(true)
    }
  }, [])

  const guardar = () => {
    if (!draft.inspector.trim() || !draft.proveedor.trim() || !draft.rolloNum.trim()) return
    const s = { ...draft, inspector: draft.inspector.trim(), proveedor: draft.proveedor.trim() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setSesion(s)
    setMostrarForm(false)
    onSesionActualizada?.(s)
  }

  const editarSesion = () => {
    if (sesion) setDraft(sesion)
    setMostrarForm(true)
  }

  const currentTime = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  return (
    <div className="min-h-screen flex flex-col">
      {/* Modal de inicio de sesión */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidiana/90 backdrop-blur-sm">
          <div className="w-full max-w-md bg-arena rounded-3xl p-8 border-4 border-tierra space-y-5 shadow-2xl">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-tierra flex items-center justify-center mx-auto mb-3">
                <User className="w-7 h-7 text-arena" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-tierra">Iniciar inspección</h2>
              <p className="text-humo text-sm mt-1">Ingresa los datos del inspector y del rollo</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-humo mb-1 uppercase tracking-wide">
                  Nombre del inspector *
                </label>
                <input
                  type="text"
                  value={draft.inspector}
                  onChange={(e) => setDraft((f) => ({ ...f, inspector: e.target.value }))}
                  placeholder="Ej. María García"
                  className="w-full px-4 py-2.5 bg-lino border-2 border-tierra/40 rounded-xl focus:border-tierra focus:outline-none text-obsidiana"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-humo mb-1 uppercase tracking-wide">
                  Turno
                </label>
                <select
                  value={draft.turno}
                  onChange={(e) => setDraft((f) => ({ ...f, turno: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-lino border-2 border-tierra/40 rounded-xl focus:border-tierra focus:outline-none text-obsidiana"
                >
                  {TURNOS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-humo mb-1 uppercase tracking-wide">
                  Número de rollo *
                </label>
                <input
                  type="text"
                  value={draft.rolloNum}
                  onChange={(e) => setDraft((f) => ({ ...f, rolloNum: e.target.value }))}
                  placeholder="Ej. R-2024-0001"
                  className="w-full px-4 py-2.5 bg-lino border-2 border-tierra/40 rounded-xl focus:border-tierra focus:outline-none font-mono text-obsidiana"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-humo mb-1 uppercase tracking-wide">
                  Proveedor *
                </label>
                <input
                  type="text"
                  value={draft.proveedor}
                  onChange={(e) => setDraft((f) => ({ ...f, proveedor: e.target.value }))}
                  placeholder="Ej. Textiles del Valle"
                  className="w-full px-4 py-2.5 bg-lino border-2 border-tierra/40 rounded-xl focus:border-tierra focus:outline-none text-obsidiana"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-humo mb-1 uppercase tracking-wide">
                  Material / composición
                </label>
                <input
                  type="text"
                  value={draft.material}
                  onChange={(e) => setDraft((f) => ({ ...f, material: e.target.value }))}
                  placeholder="Ej. Algodón 100%"
                  className="w-full px-4 py-2.5 bg-lino border-2 border-tierra/40 rounded-xl focus:border-tierra focus:outline-none text-obsidiana"
                />
              </div>
            </div>

            <button
              onClick={guardar}
              disabled={!draft.inspector.trim() || !draft.proveedor.trim() || !draft.rolloNum.trim()}
              className="w-full py-3 bg-tierra text-arena rounded-xl font-semibold text-base hover:bg-tierra/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Iniciar inspección
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-lino border-b-2 border-tierra px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse">
                  <path d="M0 2h4M2 0v4" stroke="#B5622A" strokeWidth="0.5" fill="none" opacity="0.6"/>
                </pattern>
                <circle cx="20" cy="20" r="18" fill="url(#weave)" stroke="#7C4A2D" strokeWidth="2"/>
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
          <button className="p-2 hover:bg-arena rounded-lg transition-colors" aria-label="Audio activo">
            <Volume2 className="w-5 h-5 text-tierra" />
          </button>

          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-sm font-semibold text-obsidiana">
                {sesion?.inspector ?? "—"}
              </p>
              <p className="text-xs text-humo">
                {sesion?.turno ?? "Sin turno"} • {currentTime}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={editarSesion}
                className="p-1.5 hover:bg-arena rounded-lg transition-colors"
                aria-label="Editar datos de sesión"
              >
                <Pencil className="w-4 h-4 text-tierra" />
              </button>
              <div className="w-10 h-10 rounded-full bg-tierra flex items-center justify-center">
                <User className="w-5 h-5 text-arena" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1">
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
