"use client"

import { useState } from "react"
import { AppShell } from "@/components/lariscan/app-shell"
import { Search, FileDown, RefreshCw, Shield, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

const API = "http://localhost:8000"

interface ReporteResumen {
  id: string; id_rollo: string; proveedor: string; inspector_nombre: string
  fecha_emision: string | null; veredicto_final: string
  estado_documento: string; score_100yd2: number; estado_nc: string | null
}

interface LogAcceso {
  id: number; usuario_id: string; usuario_nombre: string
  accion: string; recurso: string; parametros: string | null
  ip: string; timestamp: string | null
}

export default function AuditoriaPage() {
  const [tab, setTab] = useState<"buscar" | "logs">("buscar")
  const [filtros, setFiltros] = useState({
    fecha_inicio: "", fecha_fin: "", id_rollo: "",
    proveedor: "", inspector: "", veredicto: "", estado_nc: "",
  })
  const [resultados, setResultados] = useState<ReporteResumen[] | null>(null)
  const [logs, setLogs] = useState<LogAcceso[]>([])
  const [buscando, setBuscando] = useState(false)
  const [cargandoLogs, setCargandoLogs] = useState(false)

  const buscar = async () => {
    setBuscando(true)
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v) })
    params.set("usuario_id", "USR-AUD")
    params.set("usuario_nombre", "Auditor")
    try {
      const res = await fetch(`${API}/auditoria/buscar?${params}`)
      const data = await res.json()
      setResultados(data.reportes || [])
    } catch {
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }

  const cargarLogs = async () => {
    setCargandoLogs(true)
    try {
      const res = await fetch(`${API}/auditoria/logs?limite=50`)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch {
      setLogs([])
    } finally {
      setCargandoLogs(false)
    }
  }

  const abrirReporte = (id: string) => {
    window.open(`/reporte?id=${id}`, "_blank")
  }

  const descargarPdf = (id: string) => {
    window.open(`${API}/reportes/${id}/pdf`, "_blank")
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-6 h-6 text-tierra" />
              <h1 className="font-serif text-3xl font-bold text-tierra">Vista de Auditoría</h1>
            </div>
            <p className="text-humo text-sm">Acceso de solo lectura · ISO 9001:2015 Cláusula 9.1 · Solo auditores y gerentes</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-tierra/20">
          <button
            onClick={() => setTab("buscar")}
            className={cn(
              "px-5 py-3 text-sm font-medium border-b-2 -mb-0.5 transition-colors",
              tab === "buscar" ? "border-tierra text-tierra" : "border-transparent text-humo hover:text-obsidiana"
            )}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Buscar Reportes
          </button>
          <button
            onClick={() => { setTab("logs"); cargarLogs() }}
            className={cn(
              "px-5 py-3 text-sm font-medium border-b-2 -mb-0.5 transition-colors",
              tab === "logs" ? "border-tierra text-tierra" : "border-transparent text-humo hover:text-obsidiana"
            )}
          >
            <ClipboardList className="w-4 h-4 inline mr-2" />
            Log de Accesos
          </button>
        </div>

        {/* ── Tab: Buscar ────────────────────────────────────────────── */}
        {tab === "buscar" && (
          <div className="space-y-5">
            {/* Formulario de búsqueda */}
            <div className="bg-white rounded-2xl border-2 border-tierra/30 p-6">
              <h2 className="font-semibold text-obsidiana mb-4">Parámetros de Búsqueda</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-humo uppercase tracking-wide">Fecha inicio</label>
                  <input
                    type="date"
                    className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm"
                    value={filtros.fecha_inicio}
                    onChange={e => setFiltros(f => ({ ...f, fecha_inicio: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-humo uppercase tracking-wide">Fecha fin</label>
                  <input
                    type="date"
                    className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm"
                    value={filtros.fecha_fin}
                    onChange={e => setFiltros(f => ({ ...f, fecha_fin: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-humo uppercase tracking-wide">ID Rollo</label>
                  <input
                    className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm"
                    placeholder="ROL-..."
                    value={filtros.id_rollo}
                    onChange={e => setFiltros(f => ({ ...f, id_rollo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-humo uppercase tracking-wide">Proveedor</label>
                  <input
                    className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm"
                    placeholder="Nombre del proveedor"
                    value={filtros.proveedor}
                    onChange={e => setFiltros(f => ({ ...f, proveedor: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-humo uppercase tracking-wide">Inspector</label>
                  <input
                    className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm"
                    placeholder="Nombre del inspector"
                    value={filtros.inspector}
                    onChange={e => setFiltros(f => ({ ...f, inspector: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-humo uppercase tracking-wide">Veredicto</label>
                  <select
                    className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm bg-white"
                    value={filtros.veredicto}
                    onChange={e => setFiltros(f => ({ ...f, veredicto: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    <option value="APROBADO">Aprobado</option>
                    <option value="RECHAZADO">Rechazado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-humo uppercase tracking-wide">Estado NC</label>
                  <select
                    className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm bg-white"
                    value={filtros.estado_nc}
                    onChange={e => setFiltros(f => ({ ...f, estado_nc: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    <option value="ABIERTA">NC Abierta</option>
                    <option value="CERRADA">NC Cerrada</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={buscar}
                  disabled={buscando}
                  className="flex items-center gap-2 px-6 py-3 bg-tierra text-arena rounded-xl font-medium hover:bg-tierra/90 transition-all disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  {buscando ? "Buscando..." : "Buscar"}
                </button>
                <button
                  onClick={() => { setFiltros({ fecha_inicio: "", fecha_fin: "", id_rollo: "", proveedor: "", inspector: "", veredicto: "", estado_nc: "" }); setResultados(null) }}
                  className="px-4 py-3 border-2 border-tierra/30 text-tierra rounded-xl font-medium hover:bg-arena transition-all"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Resultados */}
            {resultados !== null && (
              <div className="bg-white rounded-2xl border-2 border-tierra/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-tierra/20 bg-lino flex items-center justify-between">
                  <h2 className="font-semibold text-obsidiana">
                    {resultados.length} resultado{resultados.length !== 1 ? "s" : ""} encontrado{resultados.length !== 1 ? "s" : ""}
                  </h2>
                  <p className="text-xs text-humo">Búsqueda registrada en log de auditoría</p>
                </div>

                {resultados.length === 0 ? (
                  <p className="text-center text-humo py-10 text-sm">No se encontraron reportes con esos filtros.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-lino/50">
                          {["ID Reporte", "ID Rollo", "Proveedor", "Inspector", "Fecha", "Veredicto", "Score", "NC", "Acciones"].map(h => (
                            <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-tierra uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-tierra/10">
                        {resultados.map((r, idx) => (
                          <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-arena/20"}>
                            <td className="py-3 px-4 font-mono text-xs font-bold text-tierra">{r.id}</td>
                            <td className="py-3 px-4 font-mono text-xs text-humo">{r.id_rollo}</td>
                            <td className="py-3 px-4 text-obsidiana text-xs">{r.proveedor}</td>
                            <td className="py-3 px-4 text-xs text-humo">{r.inspector_nombre}</td>
                            <td className="py-3 px-4 text-xs text-humo">
                              {r.fecha_emision ? new Date(r.fecha_emision).toLocaleDateString("es-MX") : "—"}
                            </td>
                            <td className="py-3 px-4">
                              <span className={cn(
                                "text-xs font-semibold px-2 py-0.5 rounded",
                                r.veredicto_final === "APROBADO" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                              )}>
                                {r.veredicto_final}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">{r.score_100yd2?.toFixed(1)}</td>
                            <td className="py-3 px-4">
                              {r.estado_nc && (
                                <span className={cn(
                                  "text-xs font-semibold px-2 py-0.5 rounded border",
                                  r.estado_nc === "ABIERTA"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-green-50 text-green-700 border-green-200"
                                )}>
                                  {r.estado_nc}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => window.location.href = `/reporte`}
                                  title="Ver reporte"
                                  className="p-1.5 hover:bg-arena rounded-lg transition-colors text-tierra"
                                >
                                  <Search className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => descargarPdf(r.id)}
                                  title="Descargar PDF ISO 9001"
                                  className="p-1.5 hover:bg-arena rounded-lg transition-colors text-tierra"
                                >
                                  <FileDown className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Logs ──────────────────────────────────────────────── */}
        {tab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-humo">Últimas 50 acciones registradas · Retención: 2 años (ISO 9001 Cláusula 7.5.3)</p>
              <button
                onClick={cargarLogs}
                disabled={cargandoLogs}
                className="flex items-center gap-2 px-4 py-2 border-2 border-tierra/30 text-tierra rounded-xl text-sm hover:bg-arena transition-all"
              >
                <RefreshCw className={cn("w-4 h-4", cargandoLogs && "animate-spin")} />
                Actualizar
              </button>
            </div>

            <div className="bg-white rounded-2xl border-2 border-tierra/30 overflow-hidden">
              {logs.length === 0 ? (
                <p className="text-center text-humo py-10 text-sm">
                  {cargandoLogs ? "Cargando logs..." : "No hay logs de acceso aún. Realiza una búsqueda primero."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-lino">
                        {["#", "Usuario", "Acción", "Recurso", "IP", "Timestamp"].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-tierra uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-tierra/10">
                      {logs.map((l, idx) => (
                        <tr key={l.id} className={idx % 2 === 0 ? "bg-white" : "bg-arena/20"}>
                          <td className="py-2 px-4 font-mono text-xs text-humo">{l.id}</td>
                          <td className="py-2 px-4">
                            <p className="text-xs font-medium text-obsidiana">{l.usuario_nombre}</p>
                            <p className="text-xs text-humo font-mono">{l.usuario_id}</p>
                          </td>
                          <td className="py-2 px-4">
                            <span className="text-xs font-mono bg-lino text-tierra px-2 py-0.5 rounded">{l.accion}</span>
                          </td>
                          <td className="py-2 px-4 font-mono text-xs text-humo">{l.recurso}</td>
                          <td className="py-2 px-4 font-mono text-xs text-humo">{l.ip}</td>
                          <td className="py-2 px-4 text-xs text-humo">
                            {l.timestamp ? new Date(l.timestamp).toLocaleString("es-MX") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
