"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/lariscan/app-shell"
import { ScoreCard, PointsBadge } from "@/components/lariscan/score-display"
import { VeredictoBanner } from "@/components/lariscan/status-badge"
import { GrecaSeparator } from "@/components/lariscan/greca-separator"
import { FileDown, Image as ImageIcon, Maximize2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DefectoDetalle {
  id: string
  tipo: string
  tamaño: string
  puntos: number
  timestamp: string
  imagenUrl: string
}

export default function ResumenRollo() {
  const [defectoSeleccionado, setDefectoSeleccionado] = useState<DefectoDetalle | null>(null)
  const [cargando, setCargando] = useState(true)
  const [defectos, setDefectos] = useState<DefectoDetalle[]>([])
  const [totalPuntos, setTotalPuntos] = useState(0)
  const [puntosASTM, setPuntosASTM] = useState("0.0")
  const [limiteAceptable, setLimiteAceptable] = useState(40)
  const [aprobado, setAprobado] = useState(true)
  const [reporteId, setReporteId] = useState<string | null>(null)
  const [rollo, setRollo] = useState({
    id: "-",
    proveedor: "-",
    tipoTela: "-",
    largo: 0,
    ancho: 0,
    fechaInspeccion: "-",
    inspector: "-",
  })

  useEffect(() => {
    const id = localStorage.getItem("lariscan_ultimo_reporte_id")
    setReporteId(id)
    if (!id) {
      setCargando(false)
      return
    }
    fetch(`http://localhost:8000/reportes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const idf = data.identificacion ?? {}
        const res = data.resultados ?? {}
        const traz = data.trazabilidad ?? {}

        setRollo({
          id: idf.id_rollo ?? "-",
          proveedor: idf.proveedor ?? "-",
          tipoTela: idf.tipo_tela ?? "-",
          largo: idf.largo_yardas ?? 0,
          ancho: idf.ancho_pulgadas ?? 0,
          fechaInspeccion: idf.fecha_inspeccion ?? "-",
          inspector: traz.inspector?.nombre ?? "-",
        })
        setTotalPuntos(res.puntos_totales_astm ?? 0)
        setPuntosASTM((res.score_100yd2 ?? 0).toFixed(1))
        setLimiteAceptable(traz.umbral_configurado ?? 40)
        setAprobado(res.veredicto_final === "APROBADO")

        const defectosApi: DefectoDetalle[] = (data.defectos ?? []).map((d: {
          id_defecto: string
          tipo: string
          tamano_in: number
          puntos_asignados: number
          posicion_rollo_metros: number
        }) => ({
          id: d.id_defecto,
          tipo: d.tipo,
          tamaño: `~${d.tamano_in.toFixed(1)}"`,
          puntos: d.puntos_asignados,
          timestamp: `@${d.posicion_rollo_metros.toFixed(1)}m`,
          imagenUrl: "",
        }))
        setDefectos(defectosApi)
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  if (cargando) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-tierra border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-humo">Cargando resumen...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!reporteId) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto py-12 text-center space-y-4">
          <h1 className="font-serif text-3xl font-bold text-tierra">Resumen del Rollo</h1>
          <GrecaSeparator />
          <p className="text-humo">No hay ninguna inspección reciente. Finaliza una inspección para ver el resumen.</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-tierra text-arena rounded-xl hover:bg-tierra/90 transition-all"
          >
            Ir a inspección
          </a>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-tierra">
            Resumen del Rollo
          </h1>
          <p className="text-humo mt-1">
            {rollo.id} • {rollo.proveedor} • {rollo.tipoTela}
          </p>
        </div>

        <GrecaSeparator />

        {/* Veredicto principal */}
        <VeredictoBanner aprobado={aprobado} />

        {/* Métricas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ScoreCard
            value={parseFloat(puntosASTM)}
            label="Pts / 100 yd²"
          />
          <ScoreCard
            value={totalPuntos}
            label="Puntos totales"
          />
          <ScoreCard
            value={defectos.length}
            label="Defectos"
          />
          <ScoreCard
            value={limiteAceptable}
            label="Límite aceptable"
          />
        </div>

        {/* Información del rollo */}
        <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
          <h2 className="font-serif text-xl font-bold text-tierra mb-4">
            Dimensiones del rollo
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-humo">Largo (yardas)</p>
              <p className="font-mono text-2xl font-bold text-obsidiana">{rollo.largo}</p>
            </div>
            <div>
              <p className="text-sm text-humo">Ancho (pulgadas)</p>
              <p className="font-mono text-2xl font-bold text-obsidiana">{rollo.ancho}</p>
            </div>
            <div>
              <p className="text-sm text-humo">Fecha de inspección</p>
              <p className="font-medium text-obsidiana">{rollo.fechaInspeccion}</p>
            </div>
            <div>
              <p className="text-sm text-humo">Inspector</p>
              <p className="font-medium text-obsidiana">{rollo.inspector}</p>
            </div>
          </div>
        </div>

        {/* Leyenda de puntos */}
        <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
          <h2 className="font-serif text-xl font-bold text-tierra mb-4">
            Defectos detectados
          </h2>

          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-sm text-humo mr-2">Puntos por tamaño:</span>
            <PointsBadge points={1} />
            <PointsBadge points={2} />
            <PointsBadge points={3} />
            <PointsBadge points={4} />
          </div>

          {/* Tabla de defectos */}
          <div className="overflow-x-auto">
            {defectos.length === 0 ? (
              <p className="text-humo text-center py-8">Sin defectos detectados</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-tierra/30">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-humo">Tipo de defecto</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-humo">Tamaño</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-humo">Puntos</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-humo">Posición</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-humo">Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {defectos.map((defecto) => (
                    <tr
                      key={defecto.id}
                      className="border-b border-tierra/10 hover:bg-arena/50 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <span className="font-medium text-obsidiana">{defecto.tipo}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-humo">{defecto.tamaño}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-full font-mono font-bold",
                          defecto.puntos >= 3
                            ? "bg-maiz text-obsidiana"
                            : "bg-arcilla/20 text-arcilla"
                        )}>
                          {defecto.puntos}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="font-mono text-sm text-humo">{defecto.timestamp}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => setDefectoSeleccionado(defecto)}
                          className="p-2 hover:bg-arena rounded-lg transition-colors inline-flex items-center gap-1 text-tierra"
                        >
                          <ImageIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Botón de exportar */}
        <div className="flex justify-center">
          <a
            href="/reporte"
            className="btn-tactile bg-tierra text-arena rounded-xl flex items-center justify-center gap-3 hover:bg-tierra/90 transition-all px-8"
          >
            <FileDown className="w-6 h-6" />
            Exportar reporte PDF
          </a>
        </div>

        {/* Modal de foto */}
        {defectoSeleccionado && (
          <div
            className="fixed inset-0 bg-obsidiana/80 z-50 flex items-center justify-center p-4"
            onClick={() => setDefectoSeleccionado(null)}
          >
            <div
              className="bg-lino rounded-2xl max-w-2xl w-full overflow-hidden border-2 border-tierra"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b-2 border-tierra/30">
                <div>
                  <h3 className="font-serif text-xl font-bold text-tierra">
                    {defectoSeleccionado.tipo}
                  </h3>
                  <p className="text-sm text-humo">
                    {defectoSeleccionado.id} • {defectoSeleccionado.timestamp}
                  </p>
                </div>
                <button
                  onClick={() => setDefectoSeleccionado(null)}
                  className="p-2 hover:bg-arena rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-tierra" />
                </button>
              </div>

              <div className="aspect-video bg-obsidiana flex items-center justify-center">
                <div className="text-center text-arena/60">
                  <Maximize2 className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>Foto del defecto</p>
                  <p className="text-sm">{defectoSeleccionado.tamaño}</p>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm text-humo">Puntos asignados:</span>
                  <span className={cn(
                    "ml-2 px-3 py-1 rounded-full font-mono font-bold",
                    defectoSeleccionado.puntos >= 3
                      ? "bg-maiz text-obsidiana"
                      : "bg-arcilla/20 text-arcilla"
                  )}>
                    {defectoSeleccionado.puntos} pt
                  </span>
                </div>
                <span className="text-sm text-humo">
                  Tamaño: {defectoSeleccionado.tamaño}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
