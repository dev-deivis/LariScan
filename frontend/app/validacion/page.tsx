"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/lariscan/app-shell"
import { GrecaSeparator } from "@/components/lariscan/greca-separator"
import {
  Check,
  X,
  Palette,
  ZoomIn,
  ZoomOut,
  RotateCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DefectoPendiente {
  id: string
  rolloId: string
  tipoSugerido: string
  confianza: number
  tamañoEstimado: string
  puntosEstimados: number
  timestamp: string
}

const tiposDefecto = [
  "Hilo roto",
  "Mancha",
  "Costura abierta",
  "Trama faltante",
  "Agujero",
  "Nudo",
  "Rasgadura",
  "Decoloración",
]

export default function ValidacionDefecto() {
  const [defectoActual, setDefectoActual] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [tipoCorregido, setTipoCorregido] = useState<string | null>(null)
  const [validados, setValidados] = useState<string[]>([])
  const [defectosPendientes, setDefectosPendientes] = useState<DefectoPendiente[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem("lariscan_ultimo_reporte_id")
    if (!id) {
      setCargando(false)
      return
    }
    fetch(`http://localhost:8000/reportes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const idRollo = data.identificacion?.id_rollo ?? id
        const pendientes: DefectoPendiente[] = (data.defectos ?? [])
          .filter((d: { confianza_deteccion: number; validado_por_inspector: boolean }) =>
            !d.validado_por_inspector && d.confianza_deteccion < 80
          )
          .map((d: {
            id_defecto: string
            tipo: string
            confianza_deteccion: number
            tamano_in: number
            puntos_asignados: number
            posicion_rollo_metros: number
          }) => ({
            id: d.id_defecto,
            rolloId: idRollo,
            tipoSugerido: d.tipo,
            confianza: Math.round(d.confianza_deteccion),
            tamañoEstimado: `~${d.tamano_in.toFixed(1)}"`,
            puntosEstimados: d.puntos_asignados,
            timestamp: `@${d.posicion_rollo_metros.toFixed(1)}m`,
          }))
        setDefectosPendientes(pendientes)
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  const defecto = defectosPendientes[defectoActual]
  const pendientes = defectosPendientes.filter((d) => !validados.includes(d.id))

  const handleValidar = () => {
    if (!defecto) return
    setValidados([...validados, defecto.id])
    setTipoCorregido(null)
    setZoom(1)
    if (defectoActual < defectosPendientes.length - 1) {
      setDefectoActual(defectoActual + 1)
    }
  }

  const navegarDefecto = (direccion: "prev" | "next") => {
    if (direccion === "prev" && defectoActual > 0) {
      setDefectoActual(defectoActual - 1)
    } else if (direccion === "next" && defectoActual < defectosPendientes.length - 1) {
      setDefectoActual(defectoActual + 1)
    }
    setZoom(1)
    setTipoCorregido(null)
  }

  const getConfianzaColor = (confianza: number) => {
    if (confianza >= 80) return "text-nopal"
    if (confianza >= 60) return "text-maiz"
    return "text-tierra"
  }

  const getConfianzaBg = (confianza: number) => {
    if (confianza >= 80) return "bg-nopal/20"
    if (confianza >= 60) return "bg-maiz/20"
    return "bg-tierra/20"
  }

  if (cargando) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-tierra border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-humo">Cargando defectos pendientes...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (pendientes.length === 0) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-tierra">
                Validación de Defectos
              </h1>
              <p className="text-humo mt-1">
                Revisa y confirma los defectos detectados con baja confianza
              </p>
            </div>
          </div>

          <GrecaSeparator className="mb-8" />

          <div className="bg-nopal/10 border-2 border-nopal rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-nopal rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-arena" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-nopal mb-2">
              ¡Todo validado!
            </h2>
            <p className="text-humo max-w-md mx-auto">
              No hay defectos pendientes de validación. El sistema te notificará
              cuando detecte algo con baja confianza.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-tierra">
              Validación de Defectos
            </h1>
            <p className="text-humo mt-1">
              Revisa y confirma los defectos detectados con baja confianza
            </p>
          </div>

          <div className="flex items-center gap-2 bg-maiz/20 px-4 py-2 rounded-xl">
            <AlertCircle className="w-5 h-5 text-maiz" />
            <span className="font-mono font-bold text-obsidiana">{pendientes.length}</span>
            <span className="text-humo">pendientes</span>
          </div>
        </div>

        <GrecaSeparator />

        {/* Navegación entre defectos */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegarDefecto("prev")}
            disabled={defectoActual === 0}
            className="p-3 rounded-xl border-2 border-tierra text-tierra hover:bg-lino transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="text-center">
            <p className="text-humo text-sm">Defecto</p>
            <p className="font-mono text-xl font-bold text-obsidiana">
              {defectoActual + 1} de {defectosPendientes.length}
            </p>
          </div>

          <button
            onClick={() => navegarDefecto("next")}
            disabled={defectoActual === defectosPendientes.length - 1}
            className="p-3 rounded-xl border-2 border-tierra text-tierra hover:bg-lino transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visor de imagen */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative bg-obsidiana rounded-2xl overflow-hidden border-2 border-tierra aspect-square md:aspect-video">
              {/* Imagen del defecto con zoom */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              >
                {/* Simulación de imagen con patrón de tejido y defecto */}
                <div className="w-full h-full relative">
                  {/* Fondo de tejido */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `
                        repeating-linear-gradient(
                          0deg,
                          transparent,
                          transparent 3px,
                          rgba(234, 217, 188, 0.15) 3px,
                          rgba(234, 217, 188, 0.15) 4px
                        ),
                        repeating-linear-gradient(
                          90deg,
                          transparent,
                          transparent 3px,
                          rgba(234, 217, 188, 0.15) 3px,
                          rgba(234, 217, 188, 0.15) 4px
                        )
                      `,
                    }}
                  />

                  {/* Marcador del defecto */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      {/* Círculo de enfoque pulsante */}
                      <div className="w-32 h-32 rounded-full border-4 border-arcilla animate-pulse flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full border-2 border-dashed border-arcilla/60" />
                      </div>

                      {/* Línea de defecto simulada */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-0.5 bg-tierra rotate-12" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Info de la imagen */}
              <div className="absolute top-4 left-4 bg-obsidiana/80 px-3 py-1 rounded-lg">
                <span className="font-mono text-arena text-sm">
                  {defecto.id} • {defecto.timestamp}
                </span>
              </div>
            </div>

            {/* Controles de zoom */}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setZoom(Math.max(1, zoom - 0.5))}
                className="p-3 rounded-xl border-2 border-tierra text-tierra hover:bg-lino transition-all"
              >
                <ZoomOut className="w-6 h-6" />
              </button>
              <div className="flex items-center px-4 bg-lino rounded-xl border-2 border-tierra/30">
                <span className="font-mono text-obsidiana">{(zoom * 100).toFixed(0)}%</span>
              </div>
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.5))}
                className="p-3 rounded-xl border-2 border-tierra text-tierra hover:bg-lino transition-all"
              >
                <ZoomIn className="w-6 h-6" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-3 rounded-xl border-2 border-tierra text-tierra hover:bg-lino transition-all"
              >
                <RotateCw className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Panel de información y acciones */}
          <div className="space-y-4">
            {/* Detección del sistema */}
            <div className="bg-lino border-2 border-tierra rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-arcilla" />
                <h3 className="font-semibold text-tierra">Detección automática</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-humo mb-1">Tipo sugerido</p>
                  <p className="font-semibold text-lg text-obsidiana">
                    {tipoCorregido || defecto.tipoSugerido}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-humo mb-1">Confianza del modelo</p>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "px-3 py-1 rounded-lg font-mono font-bold",
                      getConfianzaBg(defecto.confianza),
                      getConfianzaColor(defecto.confianza)
                    )}>
                      {defecto.confianza}%
                    </div>
                    <div className="flex-1 h-2 bg-arena rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          defecto.confianza >= 80 ? "bg-nopal" :
                          defecto.confianza >= 60 ? "bg-maiz" : "bg-tierra"
                        )}
                        style={{ width: `${defecto.confianza}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-humo">Tamaño estimado</p>
                    <p className="font-medium text-obsidiana">{defecto.tamañoEstimado}</p>
                  </div>
                  <div>
                    <p className="text-sm text-humo">Puntos</p>
                    <p className="font-mono text-xl font-bold text-arcilla">
                      {defecto.puntosEstimados} pt
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Corregir tipo */}
            <div className="bg-lino border-2 border-tierra/30 rounded-2xl p-5">
              <p className="text-sm text-humo mb-3">¿Tipo incorrecto? Corregir a:</p>
              <div className="flex flex-wrap gap-2">
                {tiposDefecto.filter(t => t !== defecto.tipoSugerido).slice(0, 4).map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setTipoCorregido(tipo)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2",
                      tipoCorregido === tipo
                        ? "bg-arcilla text-arena border-arcilla"
                        : "bg-arena text-tierra border-tierra/30 hover:border-tierra"
                    )}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-3">
              <button
                onClick={handleValidar}
                className="w-full btn-tactile bg-nopal text-arena rounded-xl flex items-center justify-center gap-3 hover:bg-nopal/90 transition-all"
              >
                <Check className="w-6 h-6" strokeWidth={3} />
                Confirmar defecto
              </button>

              <button
                onClick={handleValidar}
                className="w-full btn-tactile bg-tierra text-arena rounded-xl flex items-center justify-center gap-3 hover:bg-tierra/90 transition-all"
              >
                <X className="w-6 h-6" strokeWidth={3} />
                No es defecto
              </button>

              <button
                onClick={handleValidar}
                className="w-full btn-tactile bg-lino text-tierra border-2 border-tierra rounded-xl flex items-center justify-center gap-3 hover:bg-arena transition-all"
              >
                <Palette className="w-6 h-6" />
                Es diseño intencional
              </button>
            </div>

            <p className="text-xs text-humo text-center">
              Tu corrección ayuda a mejorar el modelo de detección
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
