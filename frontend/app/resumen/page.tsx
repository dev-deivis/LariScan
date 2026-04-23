"use client"

import { useState } from "react"
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

const defectosEjemplo: DefectoDetalle[] = [
  { id: "D001", tipo: "Hilo roto", tamaño: 'hasta 3"', puntos: 1, timestamp: "10:23:45", imagenUrl: "" },
  { id: "D002", tipo: "Hilo roto", tamaño: '3" a 6"', puntos: 2, timestamp: "10:25:12", imagenUrl: "" },
  { id: "D003", tipo: "Costura abierta", tamaño: '6" a 9"', puntos: 3, timestamp: "10:28:33", imagenUrl: "" },
  { id: "D004", tipo: "Mancha de aceite", tamaño: 'hasta 3"', puntos: 1, timestamp: "10:31:18", imagenUrl: "" },
  { id: "D005", tipo: "Trama faltante", tamaño: '3" a 6"', puntos: 2, timestamp: "10:35:02", imagenUrl: "" },
]

export default function ResumenRollo() {
  const [defectoSeleccionado, setDefectoSeleccionado] = useState<DefectoDetalle | null>(null)

  const totalPuntos = defectosEjemplo.reduce((sum, d) => sum + d.puntos, 0)
  const largoYardas = 120
  const puntosASTM = ((totalPuntos / largoYardas) * 100).toFixed(1)
  const limiteAceptable = 40
  const aprobado = parseFloat(puntosASTM) <= limiteAceptable

  const rollo = {
    id: "R-2024-0847",
    proveedor: "Textiles del Valle",
    tipoTela: "Algodón 100%",
    largo: largoYardas,
    ancho: 45,
    fechaInspeccion: "22 de abril, 2026",
    inspector: "María García",
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
            value={defectosEjemplo.length} 
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
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-tierra/30">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-humo">Tipo de defecto</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-humo">Tamaño</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-humo">Puntos</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-humo">Hora</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-humo">Foto</th>
                </tr>
              </thead>
              <tbody>
                {defectosEjemplo.map((defecto) => (
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
                {/* Placeholder de imagen */}
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
