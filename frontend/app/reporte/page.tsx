"use client"

import { useState } from "react"
import { AppShell } from "@/components/lariscan/app-shell"
import { GrecaSeparator } from "@/components/lariscan/greca-separator"
import { VeredictoBanner } from "@/components/lariscan/status-badge"
import { FileDown, Printer, Mail, Eye, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DefectoReporte {
  id: string
  tipo: string
  tamaño: string
  puntos: number
  ubicacion: string
}

const defectosReporte: DefectoReporte[] = [
  { id: "D001", tipo: "Hilo roto", tamaño: 'hasta 3"', puntos: 1, ubicacion: "Metro 12.3" },
  { id: "D002", tipo: "Hilo roto", tamaño: '3" a 6"', puntos: 2, ubicacion: "Metro 28.7" },
  { id: "D003", tipo: "Costura abierta", tamaño: '6" a 9"', puntos: 3, ubicacion: "Metro 45.2" },
  { id: "D004", tipo: "Mancha de aceite", tamaño: 'hasta 3"', puntos: 1, ubicacion: "Metro 67.8" },
  { id: "D005", tipo: "Trama faltante", tamaño: '3" a 6"', puntos: 2, ubicacion: "Metro 89.1" },
]

export default function ReporteExportable() {
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(true)

  const rollo = {
    id: "R-2024-0847",
    proveedor: "Textiles del Valle",
    tipoTela: "Algodón 100%",
    color: "Crudo natural",
    lote: "LOT-2024-A156",
    largo: 120,
    ancho: 45,
    fechaInspeccion: "22 de abril de 2026",
    horaInicio: "09:15",
    horaFin: "10:52",
    inspector: "María García",
    turno: "Matutino",
  }

  const totalPuntos = defectosReporte.reduce((sum, d) => sum + d.puntos, 0)
  const puntosASTM = ((totalPuntos / rollo.largo) * 100).toFixed(1)
  const limiteAceptable = 40
  const aprobado = parseFloat(puntosASTM) <= limiteAceptable

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Controles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-tierra">
              Reporte de Inspección
            </h1>
            <p className="text-humo mt-1">
              Vista previa del documento exportable
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-3 bg-lino border-2 border-tierra text-tierra rounded-xl hover:bg-arena transition-all font-medium"
            >
              <Printer className="w-5 h-5" />
              <span className="hidden md:inline">Imprimir</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-3 bg-lino border-2 border-tierra text-tierra rounded-xl hover:bg-arena transition-all font-medium">
              <Mail className="w-5 h-5" />
              <span className="hidden md:inline">Enviar</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-tierra text-arena rounded-xl hover:bg-tierra/90 transition-all font-semibold">
              <FileDown className="w-5 h-5" />
              Descargar PDF
            </button>
          </div>
        </div>

        {/* Documento de reporte */}
        <div className="bg-white rounded-2xl border-2 border-tierra shadow-lg overflow-hidden print:shadow-none print:border-0 print:rounded-none">
          {/* Membrete */}
          <div className="bg-lino p-6 md:p-8 border-b-2 border-tierra">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 40 40" className="w-full h-full">
                    <pattern id="weave-report" width="4" height="4" patternUnits="userSpaceOnUse">
                      <path d="M0 2h4M2 0v4" stroke="#B5622A" strokeWidth="0.5" fill="none" opacity="0.6"/>
                    </pattern>
                    <circle cx="20" cy="20" r="18" fill="url(#weave-report)" stroke="#7C4A2D" strokeWidth="2"/>
                    <ellipse cx="20" cy="20" rx="10" ry="7" fill="none" stroke="#7C4A2D" strokeWidth="2"/>
                    <circle cx="20" cy="20" r="4" fill="#7C4A2D"/>
                    <circle cx="18" cy="18" r="1.5" fill="#F2E8D5"/>
                  </svg>
                </div>
                <div>
                  <h1 className="font-serif text-3xl font-bold text-tierra">LáriScan</h1>
                  <p className="text-humo text-sm">Sistema de Inspección de Calidad Textil</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-mono text-sm text-humo">Reporte N°</p>
                <p className="font-mono text-xl font-bold text-obsidiana">{rollo.id}</p>
              </div>
            </div>
          </div>

          {/* Contenido del reporte */}
          <div className="p-6 md:p-8 space-y-8">
            {/* Información del rollo */}
            <section>
              <h2 className="font-serif text-xl font-bold text-tierra mb-4 pb-2 border-b-2 border-tierra/20">
                Información del Rollo
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-humo uppercase tracking-wide">ID del Rollo</p>
                  <p className="font-mono font-semibold text-obsidiana">{rollo.id}</p>
                </div>
                <div>
                  <p className="text-xs text-humo uppercase tracking-wide">Proveedor</p>
                  <p className="font-semibold text-obsidiana">{rollo.proveedor}</p>
                </div>
                <div>
                  <p className="text-xs text-humo uppercase tracking-wide">Tipo de Tela</p>
                  <p className="font-semibold text-obsidiana">{rollo.tipoTela}</p>
                </div>
                <div>
                  <p className="text-xs text-humo uppercase tracking-wide">Lote</p>
                  <p className="font-mono font-semibold text-obsidiana">{rollo.lote}</p>
                </div>
                <div>
                  <p className="text-xs text-humo uppercase tracking-wide">Largo (yardas)</p>
                  <p className="font-mono text-2xl font-bold text-obsidiana">{rollo.largo}</p>
                </div>
                <div>
                  <p className="text-xs text-humo uppercase tracking-wide">Ancho (pulgadas)</p>
                  <p className="font-mono text-2xl font-bold text-obsidiana">{rollo.ancho}</p>
                </div>
                <div>
                  <p className="text-xs text-humo uppercase tracking-wide">Color</p>
                  <p className="font-semibold text-obsidiana">{rollo.color}</p>
                </div>
                <div>
                  <p className="text-xs text-humo uppercase tracking-wide">Fecha</p>
                  <p className="font-semibold text-obsidiana">{rollo.fechaInspeccion}</p>
                </div>
              </div>
            </section>

            {/* Veredicto */}
            <section>
              <VeredictoBanner aprobado={aprobado} />
            </section>

            {/* Resumen ASTM */}
            <section>
              <h2 className="font-serif text-xl font-bold text-tierra mb-4 pb-2 border-b-2 border-tierra/20">
                Resumen ASTM D5430
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-lino rounded-xl p-4">
                  <p className="text-xs text-humo uppercase tracking-wide mb-1">Puntos Totales</p>
                  <p className="font-mono text-3xl font-bold text-obsidiana">{totalPuntos}</p>
                </div>
                <div className="bg-lino rounded-xl p-4">
                  <p className="text-xs text-humo uppercase tracking-wide mb-1">Pts / 100 yd²</p>
                  <p className={cn(
                    "font-mono text-3xl font-bold",
                    aprobado ? "text-nopal" : "text-tierra"
                  )}>{puntosASTM}</p>
                </div>
                <div className="bg-lino rounded-xl p-4">
                  <p className="text-xs text-humo uppercase tracking-wide mb-1">Límite Aceptable</p>
                  <p className="font-mono text-3xl font-bold text-obsidiana">{limiteAceptable}</p>
                </div>
              </div>
            </section>

            {/* Tabla de defectos */}
            <section>
              <h2 className="font-serif text-xl font-bold text-tierra mb-4 pb-2 border-b-2 border-tierra/20">
                Defectos Detectados ({defectosReporte.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-lino">
                      <th className="text-left py-3 px-4 font-semibold text-tierra">ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-tierra">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold text-tierra">Tamaño</th>
                      <th className="text-center py-3 px-4 font-semibold text-tierra">Puntos</th>
                      <th className="text-left py-3 px-4 font-semibold text-tierra">Ubicación</th>
                      <th className="text-center py-3 px-4 font-semibold text-tierra">Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defectosReporte.map((defecto, idx) => (
                      <tr key={defecto.id} className={idx % 2 === 0 ? "bg-white" : "bg-arena/30"}>
                        <td className="py-3 px-4 font-mono text-humo">{defecto.id}</td>
                        <td className="py-3 px-4 font-medium text-obsidiana">{defecto.tipo}</td>
                        <td className="py-3 px-4 text-humo">{defecto.tamaño}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-full font-mono font-bold text-sm",
                            defecto.puntos >= 3 ? "bg-maiz text-obsidiana" : "bg-arcilla/20 text-arcilla"
                          )}>
                            {defecto.puntos}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-humo">{defecto.ubicacion}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center justify-center w-10 h-10 bg-lino rounded border border-tierra/20">
                            <ImageIcon className="w-5 h-5 text-humo" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-lino font-semibold">
                      <td colSpan={3} className="py-3 px-4 text-right text-tierra">Total</td>
                      <td className="py-3 px-4 text-center font-mono text-xl text-obsidiana">{totalPuntos}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <GrecaSeparator />

            {/* Firma del inspector */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="font-serif text-lg font-bold text-tierra mb-4">
                  Datos de la Inspección
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-humo">Inspector:</span>
                    <span className="font-semibold text-obsidiana">{rollo.inspector}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-humo">Turno:</span>
                    <span className="font-semibold text-obsidiana">{rollo.turno}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-humo">Hora inicio:</span>
                    <span className="font-mono text-obsidiana">{rollo.horaInicio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-humo">Hora fin:</span>
                    <span className="font-mono text-obsidiana">{rollo.horaFin}</span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-serif text-lg font-bold text-tierra mb-4">
                  Firma del Inspector
                </h2>
                <div className="h-24 border-2 border-dashed border-tierra/30 rounded-xl flex items-center justify-center">
                  <p className="text-humo text-sm italic">Firma digital o manuscrita</p>
                </div>
                <div className="mt-3 pt-3 border-t border-tierra/20 text-center">
                  <p className="font-semibold text-obsidiana">{rollo.inspector}</p>
                  <p className="text-xs text-humo">Inspector de Calidad</p>
                </div>
              </div>
            </section>

            {/* Pie de página */}
            <div className="pt-6 border-t-2 border-tierra/20 text-center text-xs text-humo">
              <p>
                Este documento fue generado automáticamente por LáriScan • 
                Sistema de Inspección de Calidad Textil bajo norma ASTM D5430
              </p>
              <p className="mt-1">
                Generado el {rollo.fechaInspeccion} a las {rollo.horaFin} • 
                Documento válido sin firma cuando se verifica digitalmente
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
