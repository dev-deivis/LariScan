"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/lariscan/app-shell"
import { GrecaSeparator } from "@/components/lariscan/greca-separator"
import { Save, Info, Lock, Clock, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const BACKEND = "http://localhost:8000"

interface ConfigForm {
  norma: string
  anchoRolloIn: number
  largoRolloYd: number
  anchoCamaraIn: number
  resolucionPx: number
  umbralPts: number
  zonaAdvertenciaPct: number
  regla2Continuo: boolean
  regla3RechazoAuto: boolean
  preset: string
  aatcc173Activo: boolean
  aatccToleranciaH: number
  aatccToleranciaS: number
  aatccToleranciaV: number
  aatccFramesConfirmacion: number
  aatccFramesCalibracion: number
}

interface LogEntry {
  timestamp: string
  umbral_anterior: number
  umbral_nuevo: number
  norma: string
}

const CONFIG_DEFAULT: ConfigForm = {
  norma: "ASTM D5430",
  anchoRolloIn: 45,
  largoRolloYd: 120,
  anchoCamaraIn: 45,
  resolucionPx: 1920,
  umbralPts: 40,
  zonaAdvertenciaPct: 80,
  regla2Continuo: true,
  regla3RechazoAuto: true,
  preset: "exportacion",
  aatcc173Activo: false,
  aatccToleranciaH: 15,
  aatccToleranciaS: 15,
  aatccToleranciaV: 15,
  aatccFramesConfirmacion: 3,
  aatccFramesCalibracion: 5,
}

const PRESETS = [
  {
    id: "artesanal",
    nombre: "Tela artesanal oaxaqueña",
    umbral: 60,
    anchoRollo: 36,
    largoRollo: 40,
    descripcion: "Más tolerante — tintes naturales tienen variación natural",
  },
  {
    id: "exportacion",
    nombre: "Exportación a EE.UU.",
    umbral: 40,
    anchoRollo: 45,
    largoRollo: 120,
    descripcion: "Estándar internacional ASTM D5430",
  },
  {
    id: "premium",
    nombre: "Cliente premium",
    umbral: 20,
    anchoRollo: 60,
    largoRollo: 100,
    descripcion: "Alta exigencia — calidad superior",
  },
]

const NORMAS = [
  { id: "ASTM D5430", desc: "Sistema de 4 puntos — defectos por tamaño", disponible: true },
  { id: "AATCC 173", desc: "Uniformidad de color — análisis HSV", disponible: true },
  { id: "Manual", desc: "Evaluación subjetiva del inspector", disponible: false },
]

const TABLA_ASTM = [
  { rango: "≤ 3 pulgadas", puntos: 1 },
  { rango: '> 3" y ≤ 6"', puntos: 2 },
  { rango: '> 6" y ≤ 9"', puntos: 3 },
  { rango: "> 9 pulgadas", puntos: 4 },
  { rango: "Agujero (cualquier tamaño)", puntos: 4 },
]

export default function ConfiguracionNormas() {
  const [form, setForm] = useState<ConfigForm>(CONFIG_DEFAULT)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [mostrarLog, setMostrarLog] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch(`${BACKEND}/configuracion`)
      .then((r) => r.json())
      .then((d) => {
        setForm({
          norma: d.norma ?? "ASTM D5430",
          anchoRolloIn: d.ancho_rollo_in ?? 45,
          largoRolloYd: d.largo_rollo_yd ?? 120,
          anchoCamaraIn: d.ancho_camara_in ?? 45,
          resolucionPx: d.resolucion_px ?? 1920,
          umbralPts: d.umbral_pts ?? 40,
          zonaAdvertenciaPct: d.zona_advertencia_pct ?? 80,
          regla2Continuo: d.regla_continuo ?? true,
          regla3RechazoAuto: d.regla_rechazo_auto ?? true,
          preset: d.preset ?? "exportacion",
          aatcc173Activo: d.aatcc_173_activo ?? false,
          aatccToleranciaH: d.aatcc_tolerancia_h ?? 15,
          aatccToleranciaS: d.aatcc_tolerancia_s ?? 15,
          aatccToleranciaV: d.aatcc_tolerancia_v ?? 15,
          aatccFramesConfirmacion: d.aatcc_frames_confirmacion ?? 3,
          aatccFramesCalibracion: d.aatcc_frames_calibracion ?? 5,
        })
      })
      .catch(() => {})
      .finally(() => setCargando(false))

    fetch(`${BACKEND}/configuracion/log`)
      .then((r) => r.json())
      .then(setLog)
      .catch(() => {})
  }, [])

  const escala = form.anchoCamaraIn / Math.max(form.resolucionPx, 1)
  const umbralAdvertencia = ((form.umbralPts * form.zonaAdvertenciaPct) / 100).toFixed(1)

  const aplicarPreset = (preset: (typeof PRESETS)[0]) => {
    setForm((f) => ({
      ...f,
      umbralPts: preset.umbral,
      anchoRolloIn: preset.anchoRollo,
      largoRolloYd: preset.largoRollo,
      preset: preset.id,
    }))
  }

  const mostrarMensaje = (texto: string, ok: boolean) => {
    setMensaje({ texto, ok })
    setTimeout(() => setMensaje(null), 4000)
  }

  const guardar = async () => {
    setGuardando(true)
    try {
      const payload = {
        norma: form.norma,
        ancho_rollo_in: form.anchoRolloIn,
        largo_rollo_yd: form.largoRolloYd,
        ancho_camara_in: form.anchoCamaraIn,
        resolucion_px: form.resolucionPx,
        umbral_pts: form.umbralPts,
        zona_advertencia_pct: form.zonaAdvertenciaPct,
        regla_continuo: form.regla2Continuo,
        regla_rechazo_auto: form.regla3RechazoAuto,
        preset: form.preset,
        aatcc_173_activo: form.aatcc173Activo,
        aatcc_tolerancia_h: form.aatccToleranciaH,
        aatcc_tolerancia_s: form.aatccToleranciaS,
        aatcc_tolerancia_v: form.aatccToleranciaV,
        aatcc_frames_confirmacion: form.aatccFramesConfirmacion,
        aatcc_frames_calibracion: form.aatccFramesCalibracion,
      }
      const res = await fetch(`${BACKEND}/configuracion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      mostrarMensaje(data.mensaje ?? "Configuración guardada", true)
      fetch(`${BACKEND}/configuracion/log`)
        .then((r) => r.json())
        .then(setLog)
        .catch(() => {})
    } catch {
      mostrarMensaje("Error: no se pudo conectar con el backend", false)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-tierra border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-tierra">
            Configuración de Normas
          </h1>
          <p className="text-humo mt-1">
            Define los parámetros de evaluación para la inspección activa de rollos
          </p>
        </div>

        <GrecaSeparator />

        {/* Sección 1: Normas activas */}
        <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
          <h2 className="font-serif text-xl font-bold text-tierra mb-1">Normas activas</h2>
          <p className="text-sm text-humo mb-4">
            ASTM D5430 es la norma base siempre activa. AATCC 173 corre en paralelo como complemento opcional.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* ASTM D5430 — siempre activa */}
            <div className="p-4 rounded-xl border-2 border-arcilla bg-arcilla/10 cursor-default">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-obsidiana text-sm">ASTM D5430</p>
                <span className="text-xs bg-nopal text-arena px-2 py-0.5 rounded font-medium">
                  Siempre activa
                </span>
              </div>
              <p className="text-xs text-humo">Sistema de 4 puntos — defectos por tamaño</p>
            </div>
            {/* AATCC 173 — toggle complementario */}
            <button
              onClick={() => setForm((f) => ({ ...f, aatcc173Activo: !f.aatcc173Activo }))}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all hover:border-tierra",
                form.aatcc173Activo ? "border-arcilla bg-arcilla/10" : "border-tierra/30"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-obsidiana text-sm">AATCC 173</p>
                {form.aatcc173Activo
                  ? <CheckCircle2 className="w-4 h-4 text-nopal" />
                  : <span className="text-xs text-humo bg-humo/20 px-2 py-0.5 rounded">Opcional</span>
                }
              </div>
              <p className="text-xs text-humo">Uniformidad de color — análisis HSV</p>
            </button>
            {/* Manual — próximamente */}
            <div className="p-4 rounded-xl border-2 border-tierra/30 opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-obsidiana text-sm">Manual</p>
                <span className="text-xs text-humo bg-humo/20 px-2 py-0.5 rounded">Próximamente</span>
              </div>
              <p className="text-xs text-humo">Evaluación subjetiva del inspector</p>
            </div>
          </div>
        </div>

        {/* AATCC 173 — configuración de tolerancias */}
        {form.aatcc173Activo && (
          <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
            <h2 className="font-serif text-xl font-bold text-tierra mb-1">
              Configuración AATCC 173
            </h2>
            <p className="text-sm text-humo mb-4">
              Tolerancias para detectar variación de color entre secciones del rollo (espacio HSV)
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-humo mb-2">
                  Tolerancia H <span className="font-mono text-xs">(°)</span>
                </label>
                <input
                  type="number" value={form.aatccToleranciaH} min={1} max={90}
                  onChange={(e) => setForm((f) => ({ ...f, aatccToleranciaH: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-humo mb-2">
                  Tolerancia S <span className="font-mono text-xs">(%)</span>
                </label>
                <input
                  type="number" value={form.aatccToleranciaS} min={1} max={100}
                  onChange={(e) => setForm((f) => ({ ...f, aatccToleranciaS: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-humo mb-2">
                  Tolerancia V <span className="font-mono text-xs">(%)</span>
                </label>
                <input
                  type="number" value={form.aatccToleranciaV} min={1} max={100}
                  onChange={(e) => setForm((f) => ({ ...f, aatccToleranciaV: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-lg font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-humo mb-2">
                  Frames de calibración
                </label>
                <input
                  type="number" value={form.aatccFramesCalibracion} min={3} max={30}
                  onChange={(e) => setForm((f) => ({ ...f, aatccFramesCalibracion: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-lg font-bold"
                />
                <p className="text-xs text-humo mt-1">Frames iniciales para capturar el color de referencia</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-humo mb-2">
                  Frames de confirmación
                </label>
                <input
                  type="number" value={form.aatccFramesConfirmacion} min={1} max={10}
                  onChange={(e) => setForm((f) => ({ ...f, aatccFramesConfirmacion: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-lg font-bold"
                />
                <p className="text-xs text-humo mt-1">Frames consecutivos fuera de rango para activar alerta</p>
              </div>
            </div>
            <div className="mt-4 bg-maiz/20 rounded-xl p-3 border border-maiz/40 flex items-start gap-3">
              <Info className="w-5 h-5 text-maiz flex-shrink-0 mt-0.5" />
              <p className="text-sm text-obsidiana">
                Los primeros <strong>{form.aatccFramesCalibracion} frames</strong> al iniciar la cámara se usarán
                automáticamente para calibrar el color de referencia del rollo.
              </p>
            </div>
          </div>
        )}

        {form.norma === "ASTM D5430" && (
          <>
            {/* Sección 2: Dimensiones del rollo */}
            <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
              <h2 className="font-serif text-xl font-bold text-tierra mb-1">
                Dimensiones del rollo
              </h2>
              <p className="text-sm text-humo mb-4">
                Usadas para calcular el puntaje final por 100 yardas cuadradas
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-humo mb-2">
                    Ancho del rollo{" "}
                    <span className="font-mono text-xs">(pulgadas)</span>
                  </label>
                  <input
                    type="number"
                    value={form.anchoRolloIn}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, anchoRolloIn: parseFloat(e.target.value) || 0 }))
                    }
                    min={1}
                    step={0.5}
                    className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-humo mb-2">
                    Largo del rollo{" "}
                    <span className="font-mono text-xs">(yardas)</span>
                  </label>
                  <input
                    type="number"
                    value={form.largoRolloYd}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, largoRolloYd: parseFloat(e.target.value) || 0 }))
                    }
                    min={1}
                    step={5}
                    className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-lg font-bold"
                  />
                </div>
              </div>
              <div className="mt-3 bg-arena rounded-xl p-3 border border-tierra/20">
                <p className="text-sm text-humo font-mono">
                  Área del rollo:{" "}
                  <span className="font-bold text-obsidiana">
                    {(form.anchoRolloIn * form.largoRolloYd).toFixed(0)} yd²
                  </span>
                  <span className="text-xs ml-2">
                    ({(form.anchoRolloIn * form.largoRolloYd / 100).toFixed(1)} × 100 yd²)
                  </span>
                </p>
              </div>
            </div>

            {/* Sección 3: Calibración de cámara */}
            <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
              <h2 className="font-serif text-xl font-bold text-tierra mb-1">
                Calibración de cámara
              </h2>
              <p className="text-sm text-humo mb-4">
                Necesario para convertir los píxeles detectados por YOLO a pulgadas reales
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-humo mb-2">
                    Ancho real cubierto{" "}
                    <span className="font-mono text-xs">(pulgadas)</span>
                  </label>
                  <input
                    type="number"
                    value={form.anchoCamaraIn}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, anchoCamaraIn: parseFloat(e.target.value) || 0 }))
                    }
                    min={1}
                    step={0.5}
                    className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-humo mb-2">
                    Resolución horizontal{" "}
                    <span className="font-mono text-xs">(píxeles)</span>
                  </label>
                  <input
                    type="number"
                    value={form.resolucionPx}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, resolucionPx: parseInt(e.target.value) || 0 }))
                    }
                    min={1}
                    className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-lg font-bold"
                  />
                </div>
              </div>
              <div className="mt-3 bg-maiz/20 rounded-xl p-3 border border-maiz/40 flex items-center gap-3">
                <Info className="w-5 h-5 text-maiz flex-shrink-0" />
                <p className="text-sm font-mono">
                  Escala calculada:{" "}
                  <span className="font-bold text-obsidiana">{escala.toFixed(4)} pulgadas/píxel</span>
                  <span className="text-humo ml-2 text-xs">(1 px = {escala.toFixed(4)}")</span>
                </p>
              </div>
            </div>

            {/* Sección 4: Umbral de aceptación */}
            <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
              <h2 className="font-serif text-xl font-bold text-tierra mb-1">
                Umbral de aceptación
              </h2>
              <p className="text-sm text-humo mb-4">
                Puntaje máximo permitido por 100 yardas cuadradas antes de rechazar el rollo
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-humo mb-2">
                    Límite máximo{" "}
                    <span className="font-mono text-xs">(pts/100yd²)</span>
                  </label>
                  <input
                    type="number"
                    value={form.umbralPts}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, umbralPts: parseFloat(e.target.value) || 0 }))
                    }
                    min={5}
                    max={200}
                    className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-xl font-bold text-tierra"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-humo mb-2">
                    Zona de advertencia{" "}
                    <span className="font-mono text-xs">(%)</span>
                  </label>
                  <input
                    type="number"
                    value={form.zonaAdvertenciaPct}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        zonaAdvertenciaPct: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min={10}
                    max={99}
                    className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-xl font-bold text-maiz"
                  />
                </div>
              </div>

              {/* Visualización de zonas */}
              <div className="mt-5 space-y-2">
                <p className="text-sm font-medium text-humo mb-3">Zonas de evaluación</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-nopal inline-block" />
                    <span className="text-nopal font-medium">Verde — Aprobado</span>
                  </span>
                  <span className="font-mono text-obsidiana">
                    0 — {umbralAdvertencia} pts
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-maiz inline-block" />
                    <span className="text-maiz font-medium">Amarillo — Advertencia</span>
                  </span>
                  <span className="font-mono text-obsidiana">
                    {umbralAdvertencia} — {form.umbralPts} pts
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-tierra inline-block" />
                    <span className="text-tierra font-medium">Rojo — Rechazado</span>
                  </span>
                  <span className="font-mono text-obsidiana">&gt; {form.umbralPts} pts</span>
                </div>
                <div className="h-5 flex rounded-full overflow-hidden border border-tierra/20 mt-2">
                  <div
                    className="bg-nopal transition-all duration-300"
                    style={{ width: `${form.zonaAdvertenciaPct}%` }}
                  />
                  <div
                    className="bg-maiz transition-all duration-300"
                    style={{ width: `${100 - form.zonaAdvertenciaPct}%` }}
                  />
                </div>
                <p className="text-xs text-humo text-right">
                  Advertencia a partir de: <strong>{umbralAdvertencia} pts</strong>
                </p>
              </div>
            </div>

            {/* Sección 5: Reglas activas */}
            <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
              <h2 className="font-serif text-xl font-bold text-tierra mb-4">Reglas activas</h2>
              <div className="space-y-3">
                {/* Regla 1 — bloqueada */}
                <div className="flex items-start gap-3 p-4 bg-nopal/10 border-2 border-nopal/30 rounded-xl">
                  <Lock className="w-4 h-4 text-nopal mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-obsidiana text-sm">
                      Regla 1 — Puntos por tamaño de defecto
                    </p>
                    <p className="text-xs text-humo mt-0.5">
                      Obligatoria. ≤3&quot; = 1pt · ≤6&quot; = 2pt · ≤9&quot; = 3pt · &gt;9&quot; = 4pt · Agujero = 4pt
                    </p>
                  </div>
                  <span className="text-xs bg-nopal text-arena px-2 py-0.5 rounded font-medium flex-shrink-0">
                    Siempre activa
                  </span>
                </div>

                {/* Regla 2 */}
                <label
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    form.regla2Continuo
                      ? "bg-arena border-tierra/40"
                      : "bg-arena/50 border-tierra/20 opacity-70"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.regla2Continuo}
                    onChange={(e) => setForm((f) => ({ ...f, regla2Continuo: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-tierra flex-shrink-0"
                  />
                  <div>
                    <p className="font-semibold text-obsidiana text-sm">
                      Regla 2 — Defectos continuos
                    </p>
                    <p className="text-xs text-humo mt-0.5">
                      Efecto de barra, sombreado lateral, tono irregular: 4 puntos por cada yarda
                      lineal con defecto continuo.
                    </p>
                  </div>
                </label>

                {/* Regla 3 */}
                <label
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    form.regla3RechazoAuto
                      ? "bg-arena border-tierra/40"
                      : "bg-arena/50 border-tierra/20 opacity-70"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.regla3RechazoAuto}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, regla3RechazoAuto: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 accent-tierra flex-shrink-0"
                  />
                  <div>
                    <p className="font-semibold text-obsidiana text-sm">
                      Regla 3 — Rechazo automático por defecto continuo
                    </p>
                    <p className="text-xs text-humo mt-0.5">
                      Si un defecto continuo supera las 10 yardas en el mismo rollo → RECHAZADO
                      automáticamente, independientemente del puntaje acumulado.
                    </p>
                  </div>
                </label>
              </div>

              {/* Tabla ASTM informativa */}
              <div className="mt-6">
                <p className="text-sm font-semibold text-humo mb-2">
                  Tabla de puntos por tamaño — Regla 1
                </p>
                <div className="overflow-hidden rounded-xl border border-tierra/30">
                  <table className="w-full text-sm">
                    <thead className="bg-tierra text-arena">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Tamaño del defecto</th>
                        <th className="px-4 py-2 text-center font-medium">Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TABLA_ASTM.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-arena" : "bg-lino"}>
                          <td className="px-4 py-2 font-mono text-obsidiana">{row.rango}</td>
                          <td className="px-4 py-2 text-center font-bold text-tierra">
                            {row.puntos}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-humo mt-2">
                  Límite: ningún defecto individual puede sumar más de 4 puntos.
                </p>
              </div>
            </div>

            {/* Sección 6: Presets por tipo de tela */}
            <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
              <h2 className="font-serif text-xl font-bold text-tierra mb-4">
                Presets por tipo de tela
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => aplicarPreset(preset)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all hover:border-tierra",
                      form.preset === preset.id
                        ? "border-arcilla bg-arcilla/10"
                        : "border-tierra/30"
                    )}
                  >
                    {form.preset === preset.id && (
                      <div className="flex justify-end mb-1">
                        <CheckCircle2 className="w-4 h-4 text-nopal" />
                      </div>
                    )}
                    <p className="font-semibold text-obsidiana text-sm">{preset.nombre}</p>
                    <p className="font-mono text-2xl font-bold text-tierra mt-1">
                      {preset.umbral}{" "}
                      <span className="text-sm font-normal">pts máx</span>
                    </p>
                    <p className="text-xs text-humo mt-2">{preset.descripcion}</p>
                    <p className="text-xs text-humo font-mono mt-1">
                      {preset.anchoRollo}&quot; × {preset.largoRollo} yd
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Botón guardar */}
        <div className="space-y-3">
          {mensaje && (
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium",
                mensaje.ok
                  ? "bg-nopal/10 border-nopal text-nopal"
                  : "bg-red-50 border-red-300 text-red-700"
              )}
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {mensaje.texto}
            </div>
          )}
          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full py-4 bg-tierra text-arena rounded-2xl font-semibold text-lg hover:bg-tierra/90 transition-all disabled:opacity-60 flex items-center justify-center gap-3"
          >
            {guardando ? (
              <div className="w-5 h-5 border-2 border-arena border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {guardando ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>

        {/* Log de cambios */}
        <div className="bg-lino border-2 border-tierra/50 rounded-2xl overflow-hidden">
          <button
            onClick={() => setMostrarLog(!mostrarLog)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-arena transition-all"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-tierra" />
              <span className="font-semibold text-tierra">Historial de cambios</span>
              <span className="bg-tierra text-arena text-xs px-2 py-0.5 rounded-full font-mono">
                {log.length}
              </span>
            </div>
            {mostrarLog ? (
              <ChevronDown className="w-5 h-5 text-humo" />
            ) : (
              <ChevronRight className="w-5 h-5 text-humo" />
            )}
          </button>

          {mostrarLog && (
            <div className="px-6 pb-4 space-y-2 max-h-56 overflow-y-auto">
              {log.length === 0 ? (
                <p className="text-humo text-sm text-center py-6">Sin cambios registrados</p>
              ) : (
                [...log].reverse().map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-arena p-3 rounded-lg border border-tierra/20 text-sm"
                  >
                    <div>
                      <p className="font-medium text-obsidiana">{entry.norma}</p>
                      <p className="text-xs text-humo font-mono">
                        {new Date(entry.timestamp).toLocaleString("es-MX")}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-humo line-through text-xs">
                        {entry.umbral_anterior} pts
                      </p>
                      <p className="text-tierra font-bold">{entry.umbral_nuevo} pts</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
