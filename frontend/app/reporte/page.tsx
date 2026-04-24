"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/lariscan/app-shell"
import { GrecaSeparator } from "@/components/lariscan/greca-separator"
import { StatusBadge } from "@/components/lariscan/status-badge"
import {
  FileDown, Printer, PenLine, ShieldCheck, AlertTriangle,
  ChevronDown, ChevronUp, Clock, Hash, Lock, FilePlus, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

const API = "http://localhost:8000"

interface Reporte {
  encabezado: {
    id_reporte: string; version: string; estado_documento: string
    fecha_emision: string | null; generado_por: string; norma_gestion: string
  }
  identificacion: {
    id_rollo: string; numero_lote: string; proveedor: string; tipo_tela: string
    ancho_pulgadas: number; largo_yardas: number
    fecha_recepcion: string; fecha_inspeccion: string
  }
  trazabilidad: {
    inspector: { id: string; nombre: string; turno: string }
    norma_aplicada: string; umbral_configurado: number
    configuracion_id: string; camara_id: string; calibracion_escala: string
    inicio_inspeccion: string | null; fin_inspeccion: string | null
    duracion_minutos: number | null
  }
  resultados: {
    total_defectos_detectados: number; puntos_totales_astm: number
    score_100yd2: number; umbral_aplicado: number
    rechazo_automatico: boolean; veredicto_final: string; confianza_modelo: string
  }
  defectos: Array<{
    id_defecto: string; tipo: string; tamano_in: number
    puntos_asignados: number; posicion_rollo_metros: number
    confianza_deteccion: number; validado_por_inspector: boolean; accion_tomada: string
  }>
  no_conformidad: {
    id_nc: string; motivo: string; descripcion: string
    disposicion: string | null; accion_correctiva: string | null
    responsable_ac: string | null; fecha_limite_ac: string | null; estado_nc: string
  } | null
  firma: {
    inspector_id: string | null; timestamp: string | null
    accion: string | null; hash_documento: string | null; inmutable_desde: string | null
  }
}

interface ReporteResumen {
  id: string; id_rollo: string; proveedor: string; inspector_nombre: string
  fecha_emision: string | null; veredicto_final: string
  estado_documento: string; score_100yd2: number; estado_nc: string | null
}

const DEMO_PAYLOAD = {
  id_rollo: "ROL-20241115-042",
  numero_lote: "LOTE-NOV-08",
  proveedor: "Textiles San Pablo Erla",
  tipo_tela: "Algodón artesanal — tinte natural cochinilla",
  ancho_pulgadas: 45,
  largo_yardas: 120,
  fecha_recepcion: "2024-11-14",
  fecha_inspeccion: new Date().toISOString().split("T")[0],
  inspector_id: "USR-004",
  inspector_nombre: "María García",
  inspector_turno: "Matutino 07:00–15:00",
  umbral_configurado: 40,
  configuracion_id: "CFG-2024-003",
  calibracion_escala: "0.0234 pulgadas/pixel",
  inicio_inspeccion: new Date(Date.now() - 22 * 60000).toISOString(),
  fin_inspeccion: new Date().toISOString(),
  duracion_minutos: 22.3,
  total_defectos_detectados: 7,
  puntos_totales_astm: 14,
  score_100yd2: 23.4,
  rechazo_automatico: false,
  veredicto_final: "APROBADO",
  confianza_modelo: "94.2%",
  defectos: [
    { tipo: "Hilo roto", tamano_in: 2.04, puntos_asignados: 1, posicion_rollo_metros: 3.4, confianza_deteccion: 0.96, validado_por_inspector: true, accion_tomada: "registrado" },
    { tipo: "Mancha", tamano_in: 1.2, puntos_asignados: 1, posicion_rollo_metros: 12.1, confianza_deteccion: 0.88, validado_por_inspector: false, accion_tomada: "registrado" },
    { tipo: "Vertical", tamano_in: 4.5, puntos_asignados: 2, posicion_rollo_metros: 28.7, confianza_deteccion: 0.92, validado_por_inspector: true, accion_tomada: "registrado" },
    { tipo: "Agujero", tamano_in: 0.8, puntos_asignados: 4, posicion_rollo_metros: 45.2, confianza_deteccion: 0.97, validado_por_inspector: true, accion_tomada: "registrado" },
    { tipo: "Horizontal", tamano_in: 3.1, puntos_asignados: 2, posicion_rollo_metros: 61.5, confianza_deteccion: 0.84, validado_por_inspector: false, accion_tomada: "registrado" },
    { tipo: "Líneas", tamano_in: 2.7, puntos_asignados: 1, posicion_rollo_metros: 78.9, confianza_deteccion: 0.79, validado_por_inspector: false, accion_tomada: "registrado" },
    { tipo: "Mancha", tamano_in: 1.9, puntos_asignados: 1, posicion_rollo_metros: 95.3, confianza_deteccion: 0.91, validado_por_inspector: false, accion_tomada: "registrado" },
  ],
}

function Campo({ label, value, mono = false }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-humo uppercase tracking-wide mb-0.5">{label}</p>
      <p className={cn("text-sm font-medium text-obsidiana", mono && "font-mono")}>{value ?? "—"}</p>
    </div>
  )
}

function SeccionHeader({ titulo, clausula }: { titulo: string; clausula: string }) {
  return (
    <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-tierra/30">
      <h2 className="font-serif text-lg font-bold text-tierra">{titulo}</h2>
      <span className="text-xs font-mono bg-lino border border-tierra/30 text-tierra px-2 py-0.5 rounded">{clausula}</span>
    </div>
  )
}

function NCForm({ nc, onSave }: {
  nc: NonNullable<Reporte["no_conformidad"]>
  onSave: () => void
}) {
  const [form, setForm] = useState({
    disposicion: nc.disposicion || "",
    accion_correctiva: nc.accion_correctiva || "",
    responsable_ac: nc.responsable_ac || "",
    fecha_limite_ac: nc.fecha_limite_ac ? nc.fecha_limite_ac.split("T")[0] : "",
  })
  const [saving, setSaving] = useState(false)
  const [cerrando, setCerrando] = useState(false)

  const guardar = async () => {
    setSaving(true)
    try {
      await fetch(`${API}/no-conformidades/${nc.id_nc}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      onSave()
    } finally {
      setSaving(false)
    }
  }

  const cerrar = async () => {
    if (!form.disposicion || !form.accion_correctiva) {
      alert("Complete disposición y acción correctiva antes de cerrar.")
      return
    }
    setCerrando(true)
    try {
      await guardar()
      await fetch(`${API}/no-conformidades/${nc.id_nc}/cerrar`, { method: "POST" })
      onSave()
    } finally {
      setCerrando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-humo uppercase tracking-wide">Disposición</label>
          <select
            className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm bg-white"
            value={form.disposicion}
            onChange={e => setForm(f => ({ ...f, disposicion: e.target.value }))}
          >
            <option value="">— Seleccionar —</option>
            <option value="reutilizar">Reutilizar</option>
            <option value="devolver">Devolver al proveedor</option>
            <option value="destruir">Destruir</option>
            <option value="cuarentena">Cuarentena</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-humo uppercase tracking-wide">Responsable AC</label>
          <input
            className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm"
            value={form.responsable_ac}
            onChange={e => setForm(f => ({ ...f, responsable_ac: e.target.value }))}
            placeholder="Nombre del responsable"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-humo uppercase tracking-wide">Acción Correctiva</label>
          <textarea
            className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm"
            rows={3}
            value={form.accion_correctiva}
            onChange={e => setForm(f => ({ ...f, accion_correctiva: e.target.value }))}
            placeholder="Descripción de la acción correctiva a tomar..."
          />
        </div>
        <div>
          <label className="text-xs text-humo uppercase tracking-wide">Fecha Límite AC</label>
          <input
            type="date"
            className="mt-1 w-full px-3 py-2 border border-tierra/30 rounded-lg text-sm"
            value={form.fecha_limite_ac}
            onChange={e => setForm(f => ({ ...f, fecha_limite_ac: e.target.value }))}
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={guardar}
          disabled={saving}
          className="px-4 py-2 bg-lino border-2 border-tierra text-tierra rounded-lg text-sm font-medium hover:bg-arena transition-all disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        {nc.estado_nc === "ABIERTA" && (
          <button
            onClick={cerrar}
            disabled={cerrando}
            className="px-4 py-2 bg-tierra text-arena rounded-lg text-sm font-medium hover:bg-tierra/90 transition-all disabled:opacity-50"
          >
            {cerrando ? "Cerrando..." : "Cerrar NC"}
          </button>
        )}
      </div>
    </div>
  )
}

export default function ReportePage() {
  const [lista, setLista] = useState<ReporteResumen[]>([])
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [loading, setLoading] = useState(false)
  const [creando, setCreando] = useState(false)
  const [firmando, setFirmando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; tipo: "ok" | "err" } | null>(null)
  const [verDefectos, setVerDefectos] = useState(true)

  const cargarLista = async () => {
    try {
      const res = await fetch(`${API}/reportes?limite=20`)
      const data = await res.json()
      setLista(data.reportes || [])
    } catch { /* backend offline */ }
  }

  useEffect(() => { cargarLista() }, [])

  const cargarReporte = async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/reportes/${id}`)
      if (!res.ok) throw new Error()
      setReporte(await res.json())
    } catch {
      setMsg({ texto: "No se pudo cargar el reporte", tipo: "err" })
    } finally {
      setLoading(false)
    }
  }

  const crearDemo = async (aprobado: boolean) => {
    setCreando(true)
    setMsg(null)
    const payload = {
      ...DEMO_PAYLOAD,
      veredicto_final: aprobado ? "APROBADO" : "RECHAZADO",
      score_100yd2: aprobado ? 23.4 : 52.1,
      puntos_totales_astm: aprobado ? 14 : 31,
      total_defectos_detectados: aprobado ? 7 : 12,
      fecha_inspeccion: new Date().toISOString().split("T")[0],
    }
    try {
      const res = await fetch(`${API}/reportes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setMsg({ texto: `Reporte ${data.id} creado`, tipo: "ok" })
      await cargarLista()
      await cargarReporte(data.id)
    } catch {
      setMsg({ texto: "Error al crear el reporte — ¿está el backend corriendo?", tipo: "err" })
    } finally {
      setCreando(false)
    }
  }

  const firmar = async () => {
    if (!reporte) return
    if (reporte.firma.inmutable_desde) {
      setMsg({ texto: "Este reporte ya está firmado y es inmutable", tipo: "err" })
      return
    }
    setFirmando(true)
    try {
      const res = await fetch(`${API}/reportes/${reporte.encabezado.id_reporte}/firmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspector_id: "USR-004", inspector_nombre: "María García" }),
      })
      const data = await res.json()
      setMsg({ texto: `Reporte firmado y sellado. Hash: ${data.hash?.slice(0, 30)}...`, tipo: "ok" })
      await cargarReporte(reporte.encabezado.id_reporte)
    } catch {
      setMsg({ texto: "Error al firmar el reporte", tipo: "err" })
    } finally {
      setFirmando(false)
    }
  }

  const descargarPdf = () => {
    if (!reporte) return
    window.open(`${API}/reportes/${reporte.encabezado.id_reporte}/pdf`, "_blank")
  }

  const volver = () => {
    setReporte(null)
    setMsg(null)
    cargarLista()
  }

  const r = reporte
  const aprobado = r?.resultados.veredicto_final === "APROBADO"
  const firmado = !!r?.firma.inmutable_desde

  // ── Vista: lista de reportes ────────────────────────────────────────────────
  if (!r) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-serif text-3xl font-bold text-tierra">Reportes ISO 9001</h1>
              <p className="text-humo mt-1 text-sm">Trazabilidad completa · ISO 9001:2015 · ASTM D5430</p>
            </div>
            <button onClick={cargarLista} className="p-2 hover:bg-arena rounded-lg transition-colors">
              <RefreshCw className="w-5 h-5 text-tierra" />
            </button>
          </div>

          {/* Crear demo */}
          <div className="bg-white rounded-2xl border-2 border-tierra/30 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <FilePlus className="w-5 h-5 text-tierra" />
              <h2 className="font-semibold text-obsidiana">Crear Reporte de Demostración</h2>
            </div>
            <p className="text-sm text-humo">Genera un reporte de ejemplo con datos realistas para probar el módulo ISO 9001.</p>
            <div className="flex gap-3">
              <button
                onClick={() => crearDemo(true)}
                disabled={creando}
                className="flex items-center gap-2 px-5 py-3 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-5 h-5" />
                {creando ? "Creando..." : "Demo — APROBADO"}
              </button>
              <button
                onClick={() => crearDemo(false)}
                disabled={creando}
                className="flex items-center gap-2 px-5 py-3 bg-tierra text-arena rounded-xl font-medium hover:bg-tierra/90 transition-all disabled:opacity-50"
              >
                <AlertTriangle className="w-5 h-5" />
                Demo — RECHAZADO
              </button>
            </div>
            {msg && (
              <p className={cn("text-sm font-medium px-3 py-2 rounded-lg", msg.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                {msg.texto}
              </p>
            )}
          </div>

          {/* Lista */}
          {lista.length > 0 && (
            <div className="bg-white rounded-2xl border-2 border-tierra/30 overflow-hidden">
              <div className="px-6 py-4 border-b border-tierra/20 bg-lino">
                <h2 className="font-semibold text-obsidiana">Reportes Recientes</h2>
              </div>
              <div className="divide-y divide-tierra/10">
                {lista.map(item => (
                  <button
                    key={item.id}
                    onClick={() => cargarReporte(item.id)}
                    className="w-full px-6 py-4 hover:bg-arena/40 transition-colors text-left flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0",
                        item.veredicto_final === "APROBADO" ? "bg-green-500" : "bg-red-500"
                      )} />
                      <div>
                        <p className="font-mono text-sm font-semibold text-obsidiana">{item.id}</p>
                        <p className="text-xs text-humo">{item.id_rollo} · {item.proveedor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {item.estado_nc === "ABIERTA" && (
                        <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-medium">NC Abierta</span>
                      )}
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded",
                        item.veredicto_final === "APROBADO" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      )}>
                        {item.veredicto_final}
                      </span>
                      <span className="text-xs text-humo hidden md:block">
                        {item.fecha_emision ? new Date(item.fecha_emision).toLocaleDateString("es-MX") : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {lista.length === 0 && !msg && (
            <p className="text-center text-humo text-sm py-8">Aún no hay reportes. Crea uno de demostración.</p>
          )}
        </div>
      </AppShell>
    )
  }

  // ── Vista: detalle del reporte ─────────────────────────────────────────────
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Barra de acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={volver} className="text-sm text-tierra hover:underline">← Volver</button>
            <span className="font-mono text-lg font-bold text-obsidiana">{r.encabezado.id_reporte}</span>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded border",
              r.encabezado.estado_documento === "DEFINITIVO"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200"
            )}>
              {r.encabezado.estado_documento}
            </span>
            {firmado && <Lock className="w-4 h-4 text-green-600" />}
          </div>
          <div className="flex gap-2">
            {!firmado && (
              <button
                onClick={firmar}
                disabled={firmando}
                className="flex items-center gap-2 px-4 py-2 bg-tierra text-arena rounded-xl text-sm font-medium hover:bg-tierra/90 transition-all disabled:opacity-50"
              >
                <PenLine className="w-4 h-4" />
                {firmando ? "Firmando..." : "Firmar Reporte"}
              </button>
            )}
            <button
              onClick={descargarPdf}
              className="flex items-center gap-2 px-4 py-2 bg-lino border-2 border-tierra text-tierra rounded-xl text-sm font-medium hover:bg-arena transition-all"
            >
              <FileDown className="w-4 h-4" />
              PDF ISO 9001
            </button>
            <button onClick={() => window.print()} className="p-2 border-2 border-tierra/30 rounded-xl hover:bg-arena transition-all">
              <Printer className="w-4 h-4 text-tierra" />
            </button>
          </div>
        </div>

        {msg && (
          <p className={cn("text-sm font-medium px-4 py-3 rounded-xl", msg.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
            {msg.texto}
          </p>
        )}

        {/* Documento */}
        <div className="bg-white rounded-2xl border-2 border-tierra shadow-lg overflow-hidden">
          {/* Membrete */}
          <div className="bg-lino px-6 md:px-8 py-5 border-b-2 border-tierra flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold text-tierra">LáriScan</h1>
              <p className="text-xs text-humo">Reporte de Inspección de Calidad Textil</p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="font-mono text-xs text-humo">Reporte</p>
              <p className="font-mono text-xl font-bold text-obsidiana">{r.encabezado.id_reporte}</p>
              <p className="text-xs text-humo">{r.encabezado.norma_gestion}</p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* Encabezado del documento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-lino/50 rounded-xl p-4">
              <Campo label="Versión" value={r.encabezado.version} />
              <Campo label="Estado" value={r.encabezado.estado_documento} />
              <Campo label="Emitido" value={r.encabezado.fecha_emision ? new Date(r.encabezado.fecha_emision).toLocaleString("es-MX") : "—"} />
              <Campo label="Sistema" value={r.encabezado.generado_por} />
            </div>

            <GrecaSeparator />

            {/* Sección 1 */}
            <section>
              <SeccionHeader titulo="1 — Identificación del Producto" clausula="Cláusula 8.6" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Campo label="ID Rollo" value={r.identificacion.id_rollo} mono />
                <Campo label="Número de Lote" value={r.identificacion.numero_lote} mono />
                <Campo label="Proveedor" value={r.identificacion.proveedor} />
                <Campo label="Tipo de Tela" value={r.identificacion.tipo_tela} />
                <Campo label={`Ancho`} value={`${r.identificacion.ancho_pulgadas}"`} />
                <Campo label="Largo" value={`${r.identificacion.largo_yardas} yd`} />
                <Campo label="Fecha Recepción" value={r.identificacion.fecha_recepcion} />
                <Campo label="Fecha Inspección" value={r.identificacion.fecha_inspeccion} />
              </div>
            </section>

            {/* Sección 2 */}
            <section>
              <SeccionHeader titulo="2 — Trazabilidad del Proceso" clausula="Cláusula 7.5" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Campo label="Inspector" value={`${r.trazabilidad.inspector.nombre} (${r.trazabilidad.inspector.id})`} />
                </div>
                <Campo label="Turno" value={r.trazabilidad.inspector.turno} />
                <Campo label="Norma Aplicada" value={r.trazabilidad.norma_aplicada} />
                <Campo label="Umbral Configurado" value={`${r.trazabilidad.umbral_configurado} pts/100yd²`} />
                <Campo label="Config ID" value={r.trazabilidad.configuracion_id} mono />
                <Campo label="Cámara" value={r.trazabilidad.camara_id} mono />
                <Campo label="Escala" value={r.trazabilidad.calibracion_escala} mono />
                <Campo label="Duración" value={r.trazabilidad.duracion_minutos ? `${r.trazabilidad.duracion_minutos.toFixed(1)} min` : "—"} />
                <Campo label="Inicio" value={r.trazabilidad.inicio_inspeccion ? new Date(r.trazabilidad.inicio_inspeccion).toLocaleTimeString("es-MX") : "—"} />
                <Campo label="Fin" value={r.trazabilidad.fin_inspeccion ? new Date(r.trazabilidad.fin_inspeccion).toLocaleTimeString("es-MX") : "—"} />
              </div>
            </section>

            {/* Sección 3 — Resultados */}
            <section>
              <SeccionHeader titulo="3 — Resultados de Inspección" clausula="Cláusula 8.6" />
              <div className={cn(
                "rounded-xl p-4 mb-4 flex items-center gap-3",
                aprobado ? "bg-green-50 border-2 border-green-300" : "bg-red-50 border-2 border-red-300"
              )}>
                {aprobado
                  ? <ShieldCheck className="w-8 h-8 text-green-600 flex-shrink-0" />
                  : <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />}
                <div>
                  <p className={cn("font-bold text-xl", aprobado ? "text-green-700" : "text-red-700")}>
                    VEREDICTO: {r.resultados.veredicto_final}
                  </p>
                  <p className="text-sm text-humo">
                    {aprobado
                      ? `Score ${r.resultados.score_100yd2.toFixed(1)} pts/100yd² — dentro del límite de ${r.resultados.umbral_aplicado}`
                      : `Score ${r.resultados.score_100yd2.toFixed(1)} pts/100yd² — supera el límite de ${r.resultados.umbral_aplicado}`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Defectos Detectados", value: r.resultados.total_defectos_detectados },
                  { label: "Puntos ASTM", value: r.resultados.puntos_totales_astm },
                  { label: "Score pts/100yd²", value: r.resultados.score_100yd2.toFixed(2), highlight: !aprobado },
                  { label: "Umbral Configurado", value: r.resultados.umbral_aplicado },
                  { label: "Confianza Modelo", value: r.resultados.confianza_modelo },
                  { label: "Rechazo Automático", value: r.resultados.rechazo_automatico ? "SÍ" : "NO" },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className={cn("bg-lino rounded-xl p-3", highlight && "border-2 border-red-300 bg-red-50")}>
                    <p className="text-xs text-humo uppercase tracking-wide mb-1">{label}</p>
                    <p className={cn("font-mono text-2xl font-bold", highlight ? "text-red-700" : "text-obsidiana")}>{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Sección 4 — Defectos */}
            <section>
              <button
                onClick={() => setVerDefectos(v => !v)}
                className="w-full flex items-center justify-between mb-3"
              >
                <SeccionHeader titulo={`4 — Defectos Individuales (${r.defectos.length})`} clausula="Cláusula 8.7" />
                {verDefectos ? <ChevronUp className="w-5 h-5 text-tierra flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-tierra flex-shrink-0" />}
              </button>
              {verDefectos && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-lino">
                        {["ID", "Tipo", "Tamaño (in)", "Puntos", "Posición (m)", "Confianza", "Acción"].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-tierra uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.defectos.map((d, idx) => (
                        <tr key={d.id_defecto} className={idx % 2 === 0 ? "bg-white" : "bg-arena/20"}>
                          <td className="py-2 px-3 font-mono text-xs text-humo">{d.id_defecto.slice(-8)}</td>
                          <td className="py-2 px-3 font-medium text-obsidiana">{d.tipo}</td>
                          <td className="py-2 px-3 font-mono">{d.tamano_in.toFixed(2)}"</td>
                          <td className="py-2 px-3 text-center">
                            <span className={cn(
                              "inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs",
                              d.puntos_asignados >= 4 ? "bg-red-100 text-red-700"
                                : d.puntos_asignados >= 3 ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            )}>
                              {d.puntos_asignados}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-humo">{d.posicion_rollo_metros.toFixed(1)}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={cn("h-1.5 rounded-full", d.confianza_deteccion >= 0.8 ? "bg-green-500" : d.confianza_deteccion >= 0.6 ? "bg-yellow-500" : "bg-red-500")}
                                  style={{ width: `${d.confianza_deteccion * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-humo w-9">{(d.confianza_deteccion * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs text-humo">{d.accion_tomada}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Sección 5 — NC */}
            {r.no_conformidad && (
              <section>
                <SeccionHeader titulo="5 — Control de No Conformidades" clausula="Cláusulas 8.7 / 10.2" />
                <div className="border-2 border-red-200 bg-red-50/50 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <span className="font-mono font-bold text-red-700">{r.no_conformidad.id_nc}</span>
                        <span className={cn(
                          "ml-3 text-xs font-semibold px-2 py-0.5 rounded border",
                          r.no_conformidad.estado_nc === "ABIERTA"
                            ? "bg-red-100 text-red-700 border-red-300"
                            : "bg-green-100 text-green-700 border-green-300"
                        )}>
                          {r.no_conformidad.estado_nc}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Campo label="Motivo" value={r.no_conformidad.motivo} />
                    <Campo label="Disposición" value={r.no_conformidad.disposicion || "Pendiente"} />
                    <div className="md:col-span-2">
                      <Campo label="Descripción" value={r.no_conformidad.descripcion} />
                    </div>
                  </div>
                  {!firmado && (
                    <NCForm nc={r.no_conformidad} onSave={() => cargarReporte(r.encabezado.id_reporte)} />
                  )}
                  {firmado && r.no_conformidad.accion_correctiva && (
                    <div className="space-y-2">
                      <Campo label="Acción Correctiva" value={r.no_conformidad.accion_correctiva} />
                      <div className="grid grid-cols-2 gap-3">
                        <Campo label="Responsable AC" value={r.no_conformidad.responsable_ac} />
                        <Campo label="Fecha Límite AC" value={r.no_conformidad.fecha_limite_ac ? new Date(r.no_conformidad.fecha_limite_ac).toLocaleDateString("es-MX") : "—"} />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            <GrecaSeparator />

            {/* Sección 6 — Firma */}
            <section>
              <SeccionHeader titulo="6 — Firma y Cierre del Documento" clausula="Cláusula 7.5.3" />
              {firmado ? (
                <div className="border-2 border-green-200 bg-green-50 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-700">Documento DEFINITIVO e INMUTABLE</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Campo label="Firmado por" value={r.firma.inspector_id} />
                    <Campo label="Acción" value={r.firma.accion} />
                    <Campo label="Fecha de Firma" value={r.firma.timestamp ? new Date(r.firma.timestamp).toLocaleString("es-MX") : "—"} />
                    <Campo label="Inmutable desde" value={r.firma.inmutable_desde ? new Date(r.firma.inmutable_desde).toLocaleString("es-MX") : "—"} />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-humo uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Hash de Integridad SHA-256
                    </p>
                    <p className="font-mono text-xs text-obsidiana bg-white border border-green-200 rounded px-3 py-2 break-all">
                      {r.firma.hash_documento}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-tierra/30 rounded-xl p-6 text-center space-y-3">
                  <Clock className="w-8 h-8 text-tierra/50 mx-auto" />
                  <p className="text-humo">Pendiente de firma por el inspector</p>
                  <button
                    onClick={firmar}
                    disabled={firmando}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-tierra text-arena rounded-xl font-medium hover:bg-tierra/90 transition-all disabled:opacity-50"
                  >
                    <PenLine className="w-4 h-4" />
                    {firmando ? "Firmando..." : "Firmar y Cerrar Rollo"}
                  </button>
                  <p className="text-xs text-humo">
                    Al firmar, el documento se sella con hash SHA-256 y no puede modificarse.
                  </p>
                </div>
              )}
            </section>

            {/* Footer */}
            <div className="pt-4 border-t-2 border-tierra/20 text-center text-xs text-humo">
              <p>
                Documento generado por LáriScan — Trazabilidad ISO 9001:2015 —{" "}
                {r.firma.hash_documento
                  ? `Hash: ${r.firma.hash_documento.slice(0, 20)}...`
                  : "Pendiente de firma"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
