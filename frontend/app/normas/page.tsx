"use client"

import { useState } from "react"
import { AppShell } from "@/components/lariscan/app-shell"
import { GrecaSeparator } from "@/components/lariscan/greca-separator"
import { Save, RotateCcw, ChevronDown, Plus, Trash2, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfiguracionCliente {
  id: string
  nombre: string
  tipoTela: string
  proveedor: string
  limiteASTM: number
  activo: boolean
}

const presetsIniciales = [
  { nombre: "Estándar ASTM D5430", limite: 40, descripcion: "Norma internacional para telas de primera calidad" },
  { nombre: "Alta exigencia", limite: 25, descripcion: "Para clientes premium que requieren calidad superior" },
  { nombre: "Económico", limite: 60, descripcion: "Para productos de línea económica" },
]

const configuracionesIniciales: ConfiguracionCliente[] = [
  { id: "1", nombre: "Exportación USA", tipoTela: "Algodón 100%", proveedor: "Textiles del Valle", limiteASTM: 30, activo: true },
  { id: "2", nombre: "Nacional estándar", tipoTela: "Mezcla poliéster", proveedor: "Todos", limiteASTM: 40, activo: true },
  { id: "3", nombre: "Artesanal Oaxaca", tipoTela: "Algodón orgánico", proveedor: "Telar San Bartolo", limiteASTM: 50, activo: false },
]

const tiposTela = [
  "Algodón 100%",
  "Mezcla poliéster",
  "Algodón orgánico",
  "Lino",
  "Seda",
  "Lana",
]

const proveedores = [
  "Todos",
  "Textiles del Valle",
  "Hilos Oaxaqueños",
  "Telar San Bartolo",
  "Fibras del Istmo",
]

export default function ConfiguracionNormas() {
  const [configuraciones, setConfiguraciones] = useState(configuracionesIniciales)
  const [configEditando, setConfigEditando] = useState<ConfiguracionCliente | null>(null)
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [presetSeleccionado, setPresetSeleccionado] = useState<number | null>(null)

  const [nuevaConfig, setNuevaConfig] = useState<Omit<ConfiguracionCliente, "id" | "activo">>({
    nombre: "",
    tipoTela: tiposTela[0],
    proveedor: proveedores[0],
    limiteASTM: 40,
  })

  const aplicarPreset = (limite: number) => {
    setNuevaConfig((prev) => ({ ...prev, limiteASTM: limite }))
  }

  const guardarNuevaConfig = () => {
    const nueva: ConfiguracionCliente = {
      ...nuevaConfig,
      id: Date.now().toString(),
      activo: true,
    }
    setConfiguraciones([...configuraciones, nueva])
    setMostrarNuevo(false)
    setNuevaConfig({
      nombre: "",
      tipoTela: tiposTela[0],
      proveedor: proveedores[0],
      limiteASTM: 40,
    })
    setPresetSeleccionado(null)
  }

  const eliminarConfig = (id: string) => {
    setConfiguraciones(configuraciones.filter((c) => c.id !== id))
  }

  const toggleActivo = (id: string) => {
    setConfiguraciones(
      configuraciones.map((c) => (c.id === id ? { ...c, activo: !c.activo } : c))
    )
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-tierra">
              Configuración de Normas
            </h1>
            <p className="text-humo mt-1">
              Ajusta los umbrales ASTM D5430 por cliente, tipo de tela y proveedor
            </p>
          </div>
        </div>

        <GrecaSeparator />

        {/* Info de la norma */}
        <div className="bg-maiz/20 border-2 border-maiz rounded-2xl p-4 flex gap-3">
          <Info className="w-6 h-6 text-maiz flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-obsidiana">Norma ASTM D5430</p>
            <p className="text-sm text-humo">
              Sistema de puntos basado en tamaño de defectos. El puntaje se calcula como puntos totales 
              por cada 100 yardas cuadradas. Un límite menor significa mayor exigencia de calidad.
            </p>
          </div>
        </div>

        {/* Presets rápidos */}
        <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
          <h2 className="font-serif text-xl font-bold text-tierra mb-4">
            Presets de calidad
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presetsIniciales.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPresetSeleccionado(idx)
                  aplicarPreset(preset.limite)
                  setMostrarNuevo(true)
                }}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  presetSeleccionado === idx
                    ? "border-arcilla bg-arcilla/10"
                    : "border-tierra/30 hover:border-tierra"
                )}
              >
                <p className="font-semibold text-obsidiana">{preset.nombre}</p>
                <p className="font-mono text-2xl font-bold text-tierra mt-1">
                  {preset.limite} <span className="text-sm font-normal">pts máx</span>
                </p>
                <p className="text-xs text-humo mt-2">{preset.descripcion}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Configuraciones existentes */}
        <div className="bg-lino border-2 border-tierra rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-tierra">
              Configuraciones por cliente
            </h2>
            <button
              onClick={() => setMostrarNuevo(true)}
              className="flex items-center gap-2 px-4 py-2 bg-tierra text-arena rounded-lg hover:bg-tierra/90 transition-all font-medium"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden md:inline">Nueva configuración</span>
            </button>
          </div>

          <div className="space-y-3">
            {configuraciones.map((config) => (
              <div
                key={config.id}
                className={cn(
                  "flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all",
                  config.activo
                    ? "bg-arena border-tierra/30"
                    : "bg-arena/50 border-tierra/10 opacity-60"
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-obsidiana">{config.nombre}</p>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        config.activo ? "bg-nopal text-arena" : "bg-humo/30 text-humo"
                      )}
                    >
                      {config.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-sm text-humo mt-1">
                    {config.tipoTela} • {config.proveedor}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono text-2xl font-bold text-tierra">
                      {config.limiteASTM}
                    </p>
                    <p className="text-xs text-humo">pts máx</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActivo(config.id)}
                      className={cn(
                        "p-2 rounded-lg border-2 transition-all",
                        config.activo
                          ? "border-nopal text-nopal hover:bg-nopal/10"
                          : "border-humo text-humo hover:bg-humo/10"
                      )}
                      title={config.activo ? "Desactivar" : "Activar"}
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => eliminarConfig(config.id)}
                      className="p-2 rounded-lg border-2 border-tierra text-tierra hover:bg-tierra/10 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulario nueva configuración */}
        {mostrarNuevo && (
          <div className="bg-lino border-2 border-arcilla rounded-2xl p-6">
            <h2 className="font-serif text-xl font-bold text-tierra mb-4">
              Nueva configuración
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-humo mb-2">
                  Nombre de la configuración
                </label>
                <input
                  type="text"
                  value={nuevaConfig.nombre}
                  onChange={(e) => setNuevaConfig({ ...nuevaConfig, nombre: e.target.value })}
                  placeholder="Ej: Cliente Premium USA"
                  className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-humo mb-2">
                  Límite ASTM (puntos máx)
                </label>
                <input
                  type="number"
                  value={nuevaConfig.limiteASTM}
                  onChange={(e) => setNuevaConfig({ ...nuevaConfig, limiteASTM: parseInt(e.target.value) || 0 })}
                  min={10}
                  max={100}
                  className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none font-mono text-lg font-bold"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-humo mb-2">
                  Tipo de tela
                </label>
                <div className="relative">
                  <select
                    value={nuevaConfig.tipoTela}
                    onChange={(e) => setNuevaConfig({ ...nuevaConfig, tipoTela: e.target.value })}
                    className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none appearance-none font-medium"
                  >
                    {tiposTela.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-humo pointer-events-none" />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-humo mb-2">
                  Proveedor
                </label>
                <div className="relative">
                  <select
                    value={nuevaConfig.proveedor}
                    onChange={(e) => setNuevaConfig({ ...nuevaConfig, proveedor: e.target.value })}
                    className="w-full px-4 py-3 bg-arena border-2 border-tierra/30 rounded-xl focus:border-tierra focus:outline-none appearance-none font-medium"
                  >
                    {proveedores.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-humo pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={guardarNuevaConfig}
                disabled={!nuevaConfig.nombre}
                className="btn-tactile flex-1 bg-tierra text-arena rounded-xl flex items-center justify-center gap-2 hover:bg-tierra/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                Guardar configuración
              </button>
              <button
                onClick={() => {
                  setMostrarNuevo(false)
                  setPresetSeleccionado(null)
                }}
                className="btn-tactile px-6 bg-arena text-tierra border-2 border-tierra rounded-xl hover:bg-lino transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
