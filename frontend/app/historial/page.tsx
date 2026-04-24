"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/lariscan/app-shell"
import { GrecaSeparator } from "@/components/lariscan/greca-separator"
import { StatusBadge } from "@/components/lariscan/status-badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown, Calendar, Filter, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const PALETTE = ["#7C4A2D", "#B5622A", "#D4973A", "#4A6741", "#7A6A5A", "#3B5B8A", "#8A3B5B"]
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

interface ReporteResumen {
  id: string
  id_rollo: string
  proveedor: string
  score_100yd2: number
  veredicto_final: string
  fecha_emision: string
}

interface Kpis {
  total_rollos: number
  aprobados: number
  rechazados: number
  pct_aprobados: number
  defectos_por_tipo: { tipo: string; count: number }[]
  proveedor_stats: { proveedor: string; total: number; rechazados: number; score_promedio: number }[]
}

export default function HistorialDashboard() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("semana")
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [reportes, setReportes] = useState<ReporteResumen[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const mapPeriodo: Record<string, string> = { "día": "semana", semana: "semana", mes: "mes" }
    const p = mapPeriodo[periodoSeleccionado] ?? "semana"
    setCargando(true)
    Promise.all([
      fetch(`http://localhost:8000/kpis?periodo=${p}`).then((r) => r.json()),
      fetch(`http://localhost:8000/reportes?limite=50`).then((r) => r.json()),
    ])
      .then(([kpisData, reportesData]) => {
        setKpis(kpisData)
        setReportes(reportesData.reportes ?? [])
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [periodoSeleccionado])

  // Tendencia semanal: agrupar los reportes cargados por día de la semana
  const tendenciaSemanal = DIAS.map((dia, idx) => {
    const delDia = reportes.filter((r) => new Date(r.fecha_emision).getDay() === idx)
    return {
      dia,
      aprobados: delDia.filter((r) => r.veredicto_final === "APROBADO").length,
      rechazados: delDia.filter((r) => r.veredicto_final === "RECHAZADO").length,
    }
  })

  const defectosPorProveedor = (kpis?.proveedor_stats ?? []).slice(0, 6).map((p) => ({
    proveedor: p.proveedor,
    defectos: p.rechazados,
    rollos: p.total,
  }))

  const tiposDefectos = (kpis?.defectos_por_tipo ?? []).slice(0, 5).map((t, i) => ({
    tipo: t.tipo,
    cantidad: t.count,
    color: PALETTE[i % PALETTE.length],
  }))

  const rollosProblematicos = reportes
    .filter((r) => r.score_100yd2 != null)
    .sort((a, b) => (b.score_100yd2 ?? 0) - (a.score_100yd2 ?? 0))
    .slice(0, 5)
    .map((r) => ({
      id: r.id_rollo || r.id,
      proveedor: r.proveedor,
      puntos: Math.round(r.score_100yd2 ?? 0),
      estado: (
        r.veredicto_final === "RECHAZADO" ? "rechazado" :
        r.score_100yd2 > 32 ? "advertencia" : "aprobado"
      ) as "rechazado" | "advertencia" | "aprobado",
    }))

  const totalRollos = kpis?.total_rollos ?? 0
  const totalAprobados = kpis?.aprobados ?? 0
  const tasaAprobacion = kpis ? kpis.pct_aprobados.toFixed(1) : "0.0"

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-tierra">
              Dashboard de Historial
            </h1>
            <p className="text-humo mt-1">
              Análisis de calidad • {cargando ? "Actualizando..." : "Datos actualizados"}
            </p>
          </div>

          {/* Selector de periodo */}
          <div className="flex gap-2 bg-lino p-1 rounded-xl border-2 border-tierra">
            {["día", "semana", "mes"].map((periodo) => (
              <button
                key={periodo}
                onClick={() => setPeriodoSeleccionado(periodo)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all capitalize",
                  periodoSeleccionado === periodo
                    ? "bg-tierra text-arena"
                    : "text-humo hover:text-obsidiana"
                )}
              >
                {periodo}
              </button>
            ))}
          </div>
        </div>

        <GrecaSeparator />

        {/* Métricas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-lino border-2 border-tierra rounded-2xl p-4 md:p-6">
            <p className="text-sm text-humo mb-1">Total rollos</p>
            <p className="font-mono text-3xl md:text-4xl font-bold text-obsidiana">{totalRollos}</p>
            <div className="flex items-center gap-1 mt-2 text-sm text-humo">
              <Calendar className="w-4 h-4" />
              Esta {periodoSeleccionado}
            </div>
          </div>

          <div className="bg-nopal border-2 border-nopal rounded-2xl p-4 md:p-6">
            <p className="text-sm text-arena/80 mb-1">Aprobados</p>
            <p className="font-mono text-3xl md:text-4xl font-bold text-arena">{totalAprobados}</p>
            <p className="text-sm text-arena/80 mt-2">{tasaAprobacion}% de tasa</p>
          </div>

          <div className="bg-tierra border-2 border-tierra rounded-2xl p-4 md:p-6">
            <p className="text-sm text-arena/80 mb-1">Rechazados</p>
            <p className="font-mono text-3xl md:text-4xl font-bold text-arena">{totalRollos - totalAprobados}</p>
            <p className="text-sm text-arena/80 mt-2">{(100 - parseFloat(tasaAprobacion)).toFixed(1)}% del total</p>
          </div>

          <div className="bg-lino border-2 border-tierra rounded-2xl p-4 md:p-6">
            <p className="text-sm text-humo mb-1">Tasa aprobación</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "font-mono text-3xl md:text-4xl font-bold",
                parseFloat(tasaAprobacion) >= 50 ? "text-nopal" : "text-tierra"
              )}>
                {tasaAprobacion}%
              </p>
              {parseFloat(tasaAprobacion) >= 50 ? (
                <TrendingUp className="w-6 h-6 text-nopal" />
              ) : (
                <TrendingDown className="w-6 h-6 text-tierra" />
              )}
            </div>
            <p className="text-sm text-humo mt-2">del total inspeccionado</p>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rechazos por proveedor */}
          <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
            <h2 className="font-serif text-xl font-bold text-tierra mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Rechazos por proveedor
            </h2>
            <div className="h-64">
              {defectosPorProveedor.length === 0 ? (
                <div className="h-full flex items-center justify-center text-humo text-sm">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={defectosPorProveedor} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#7C4A2D" opacity={0.2} />
                    <XAxis type="number" stroke="#7A6A5A" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="proveedor"
                      stroke="#7A6A5A"
                      fontSize={11}
                      width={100}
                      tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + "..." : value}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#EAD9BC",
                        border: "2px solid #7C4A2D",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number, name: string) => [value, name === "defectos" ? "Rechazados" : "Rollos"]}
                    />
                    <Bar dataKey="defectos" fill="#B5622A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tendencia semanal */}
          <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
            <h2 className="font-serif text-xl font-bold text-tierra mb-4">
              Tendencia semanal
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tendenciaSemanal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#7C4A2D" opacity={0.2} />
                  <XAxis dataKey="dia" stroke="#7A6A5A" fontSize={12} />
                  <YAxis stroke="#7A6A5A" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#EAD9BC",
                      border: "2px solid #7C4A2D",
                      borderRadius: "8px"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aprobados"
                    stroke="#4A6741"
                    strokeWidth={3}
                    dot={{ fill: "#4A6741", strokeWidth: 2, r: 4 }}
                    name="Aprobados"
                  />
                  <Line
                    type="monotone"
                    dataKey="rechazados"
                    stroke="#7C4A2D"
                    strokeWidth={3}
                    dot={{ fill: "#7C4A2D", strokeWidth: 2, r: 4 }}
                    name="Rechazados"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-nopal" />
                <span className="text-sm text-humo">Aprobados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-tierra" />
                <span className="text-sm text-humo">Rechazados</span>
              </div>
            </div>
          </div>

          {/* Tipos de defectos */}
          <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
            <h2 className="font-serif text-xl font-bold text-tierra mb-4">
              Distribución de defectos
            </h2>
            <div className="h-64 flex items-center justify-center">
              {tiposDefectos.length === 0 ? (
                <p className="text-humo text-sm">Sin datos de defectos</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tiposDefectos}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="cantidad"
                      nameKey="tipo"
                    >
                      {tiposDefectos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#EAD9BC",
                        border: "2px solid #7C4A2D",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number) => [`${value} defectos`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {tiposDefectos.map((tipo) => (
                <div key={tipo.tipo} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tipo.color }} />
                  <span className="text-sm text-humo">{tipo.tipo}</span>
                  <span className="text-sm font-mono text-obsidiana ml-auto">{tipo.cantidad}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rollos problemáticos */}
          <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
            <h2 className="font-serif text-xl font-bold text-tierra mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Rollos con más fallas
            </h2>
            {rollosProblematicos.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-humo text-sm">Sin datos</div>
            ) : (
              <div className="space-y-3">
                {rollosProblematicos.map((rollo, idx) => (
                  <div
                    key={rollo.id}
                    className="flex items-center justify-between bg-arena p-3 rounded-xl border border-tierra/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-tierra w-6">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-mono text-sm font-semibold text-obsidiana">{rollo.id}</p>
                        <p className="text-xs text-humo">{rollo.proveedor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold text-obsidiana">{rollo.puntos}</p>
                        <p className="text-xs text-humo">pts</p>
                      </div>
                      <StatusBadge status={rollo.estado} size="sm" showIcon={false} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
