"use client"

import { useState } from "react"
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
  Cell
} from "recharts"
import { TrendingUp, TrendingDown, Calendar, Filter, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const defectosPorProveedor = [
  { proveedor: "Textiles del Valle", defectos: 23, rollos: 8 },
  { proveedor: "Hilos Oaxaqueños", defectos: 15, rollos: 6 },
  { proveedor: "Telar San Bartolo", defectos: 31, rollos: 10 },
  { proveedor: "Fibras del Istmo", defectos: 8, rollos: 5 },
]

const tendenciaSemanal = [
  { dia: "Lun", aprobados: 12, rechazados: 2 },
  { dia: "Mar", aprobados: 15, rechazados: 1 },
  { dia: "Mié", aprobados: 10, rechazados: 3 },
  { dia: "Jue", aprobados: 14, rechazados: 2 },
  { dia: "Vie", aprobados: 18, rechazados: 1 },
  { dia: "Sáb", aprobados: 8, rechazados: 0 },
]

const tiposDefectos = [
  { tipo: "Hilo roto", cantidad: 45, color: "#7C4A2D" },
  { tipo: "Mancha", cantidad: 28, color: "#B5622A" },
  { tipo: "Costura abierta", cantidad: 18, color: "#D4973A" },
  { tipo: "Trama faltante", cantidad: 12, color: "#4A6741" },
  { tipo: "Otros", cantidad: 8, color: "#7A6A5A" },
]

const rollosProblematicos = [
  { id: "R-2024-0823", proveedor: "Telar San Bartolo", defectos: 12, puntos: 52, estado: "rechazado" as const },
  { id: "R-2024-0819", proveedor: "Telar San Bartolo", defectos: 9, puntos: 48, estado: "rechazado" as const },
  { id: "R-2024-0831", proveedor: "Textiles del Valle", defectos: 8, puntos: 38, estado: "advertencia" as const },
  { id: "R-2024-0828", proveedor: "Hilos Oaxaqueños", defectos: 7, puntos: 35, estado: "advertencia" as const },
  { id: "R-2024-0835", proveedor: "Telar San Bartolo", defectos: 6, puntos: 32, estado: "aprobado" as const },
]

export default function HistorialDashboard() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("semana")

  const totalRollos = 77
  const totalAprobados = 65
  const tasaAprobacion = ((totalAprobados / totalRollos) * 100).toFixed(1)
  const tendencia = +2.3 // porcentaje de mejora

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
              Análisis de calidad • Última actualización: hace 5 minutos
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
              Esta semana
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
            <p className="text-sm text-humo mb-1">Tendencia</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "font-mono text-3xl md:text-4xl font-bold",
                tendencia >= 0 ? "text-nopal" : "text-tierra"
              )}>
                {tendencia >= 0 ? "+" : ""}{tendencia}%
              </p>
              {tendencia >= 0 ? (
                <TrendingUp className="w-6 h-6 text-nopal" />
              ) : (
                <TrendingDown className="w-6 h-6 text-tierra" />
              )}
            </div>
            <p className="text-sm text-humo mt-2">vs semana anterior</p>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Defectos por proveedor */}
          <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
            <h2 className="font-serif text-xl font-bold text-tierra mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Defectos por proveedor
            </h2>
            <div className="h-64">
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
                    formatter={(value: number, name: string) => [value, name === "defectos" ? "Defectos" : "Rollos"]}
                  />
                  <Bar dataKey="defectos" fill="#B5622A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
          </div>
        </div>
      </div>
    </AppShell>
  )
}
