"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { AppShell } from "@/components/lariscan/app-shell"
import { ScoreDisplay, ScoreCard } from "@/components/lariscan/score-display"
import { StatusBadge } from "@/components/lariscan/status-badge"
import { GrecaSeparator } from "@/components/lariscan/greca-separator"
import { Pause, Play, RotateCcw, AlertCircle, Eye, Camera, Upload, Video, AlertTriangle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Resultado = {
  defecto: string
  confianza: number
  tiene_defecto: boolean
}

type Modo = "imagen" | "vivo" | "dashboard"

interface Defecto {
  id: string
  tipo: string
  tamaño: string
  puntos: number
  timestamp: string
  x: number
  y: number
}

export default function InspeccionActiva() {
  const [modo, setModo] = useState<Modo>("dashboard")
  const [isPaused, setIsPaused] = useState(false)
  const [metrosInspeccionados, setMetrosInspeccionados] = useState(0)
  const [defectos, setDefectos] = useState<Defecto[]>([])
  const [velocidadMpm, setVelocidadMpm] = useState(5)

  const [limiteAceptable, setLimiteAceptable] = useState(40)
  const [zonaAdvertenciaPct, setZonaAdvertenciaPct] = useState(80)
  const [anchoRolloIn, setAnchoRolloIn] = useState(45)
  const [largoRolloYd, setLargoRolloYd] = useState(120)

  const totalPuntos = defectos.reduce((sum, d) => sum + d.puntos, 0)
  // ASTM D5430: (puntos × 36 × 100) / (ancho_in × largo_yd)
  const puntosASTM = (anchoRolloIn > 0 && largoRolloYd > 0)
    ? ((totalPuntos * 36 * 100) / (anchoRolloIn * largoRolloYd)).toFixed(1)
    : "0"

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const loopActivoRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const anteriorTeniaDefectoRef = useRef(false)

  const [camaraActiva, setCamaraActiva] = useState(false)
  const [camaraFrontal, setCamaraFrontal] = useState(false)
  const [resultadoVivo, setResultadoVivo] = useState<Resultado | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [contadorDefectos, setContadorDefectos] = useState(0)
  const [errorRed, setErrorRed] = useState(false)
  const [iniciando, setIniciando] = useState(false)

  const [imagen, setImagen] = useState<string | null>(null)
  const [resultadoImagen, setResultadoImagen] = useState<Resultado | null>(null)
  const [cargandoImagen, setCargandoImagen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("http://localhost:8000/configuracion")
      .then((r) => r.json())
      .then((d) => {
        setLimiteAceptable(d.umbral_pts ?? 40)
        setZonaAdvertenciaPct(d.zona_advertencia_pct ?? 80)
        setAnchoRolloIn(d.ancho_rollo_in ?? 45)
        setLargoRolloYd(d.largo_rollo_yd ?? 120)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isPaused || modo !== "dashboard") return
    const interval = setInterval(() => {
      setMetrosInspeccionados((m) => m + 0.1)
    }, 500)
    return () => clearInterval(interval)
  }, [isPaused, modo])

  useEffect(() => {
    if (!camaraActiva || modo !== "vivo") return
    const interval = setInterval(() => {
      setMetrosInspeccionados((m) => m + velocidadMpm / 120)
    }, 500)
    return () => clearInterval(interval)
  }, [camaraActiva, modo, velocidadMpm])

  const getEstadoPuntaje = () => {
    const pts = parseFloat(puntosASTM)
    const umbralAdvertencia = limiteAceptable * (zonaAdvertenciaPct / 100)
    if (pts <= umbralAdvertencia) return "success"
    if (pts <= limiteAceptable) return "warning"
    return "danger"
  }

  const reproducirBeep = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  }, [])

  const capturarYAnalizar = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    if (video.readyState < 2) return

    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx2d = canvas.getContext("2d")
    if (!ctx2d) return
    ctx2d.drawImage(video, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    })
    if (!blob) return

    setProcesando(true)
    const formData = new FormData()
    formData.append("file", new File([blob], "frame.jpg", { type: "image/jpeg" }))
    try {
      const res = await fetch("http://localhost:8000/analizar", {
        method: "POST",
        body: formData,
      })
      const data: Resultado = await res.json()
      setResultadoVivo(data)
      setErrorRed(false)

      if (data.tiene_defecto && !anteriorTeniaDefectoRef.current) {
        setContadorDefectos((c) => c + 1)
        reproducirBeep()
        const nuevoDefecto: Defecto = {
          id: `D${Date.now()}`,
          tipo: data.defecto,
          tamaño: "Variable",
          puntos: data.confianza > 80 ? 3 : data.confianza > 50 ? 2 : 1,
          timestamp: new Date().toLocaleTimeString(),
          x: Math.random() * 100,
          y: Math.random() * 100,
        }
        setDefectos((prev) => [...prev, nuevoDefecto])
      }
      anteriorTeniaDefectoRef.current = data.tiene_defecto
    } catch {
      setErrorRed(true)
    } finally {
      setProcesando(false)
    }
  }, [reproducirBeep])

  const iniciarCamara = useCallback(async (frontal: boolean) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    setIniciando(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: frontal ? "user" : "environment" },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCamaraActiva(true)
      setResultadoVivo(null)
      anteriorTeniaDefectoRef.current = false
    } catch {
      alert("No se pudo acceder a la cámara.")
    } finally {
      setIniciando(false)
    }
  }, [])

  const detenerCamara = useCallback(() => {
    loopActivoRef.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCamaraActiva(false)
    setResultadoVivo(null)
    setProcesando(false)
    setErrorRed(false)
    setIniciando(false)
    anteriorTeniaDefectoRef.current = false
  }, [])

  useEffect(() => {
    if (!camaraActiva || modo !== "vivo") {
      loopActivoRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    loopActivoRef.current = true

    const loop = async () => {
      if (!loopActivoRef.current) return
      await capturarYAnalizar()
      if (!loopActivoRef.current) return
      timeoutRef.current = setTimeout(loop, 500)
    }

    loop()

    return () => {
      loopActivoRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [camaraActiva, modo, capturarYAnalizar])

  useEffect(() => () => detenerCamara(), [detenerCamara])

  const analizarImagen = async (file: File) => {
    setCargandoImagen(true)
    setResultadoImagen(null)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("http://localhost:8000/analizar", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      setResultadoImagen(data)
      if (data.tiene_defecto) {
        const nuevoDefecto: Defecto = {
          id: `D${Date.now()}`,
          tipo: data.defecto,
          tamaño: "Variable",
          puntos: data.confianza > 80 ? 3 : data.confianza > 50 ? 2 : 1,
          timestamp: new Date().toLocaleTimeString(),
          x: 50,
          y: 50,
        }
        setDefectos((prev) => [...prev, nuevoDefecto])
      }
    } catch {
      alert("Error al conectar con el backend")
    } finally {
      setCargandoImagen(false)
    }
  }

  const onArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagen(URL.createObjectURL(file))
    analizarImagen(file)
  }

  const cambiarModo = (nuevoModo: Modo) => {
    if (nuevoModo === "vivo") {
      detenerCamara()
    }
    setModo(nuevoModo)
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-tierra">
              {modo === "dashboard" ? "Inspección Activa" : modo === "imagen" ? "Análisis de Imagen" : "Análisis en Vivo"}
            </h1>
            <p className="text-humo mt-1">
              Rollo #R-2024-0847 • Proveedor: Textiles del Valle • Algodón 100%
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={isPaused ? "advertencia" : "proceso"} size="md" />
            {modo !== "dashboard" && (
              <button
                onClick={() => cambiarModo("dashboard")}
                className="px-4 py-2 bg-tierra text-arena rounded-lg hover:bg-tierra/90 transition-all text-sm font-medium"
              >
                Volver al Dashboard
              </button>
            )}
          </div>
        </div>

        <GrecaSeparator />

        {modo === "dashboard" && (
          <DashboardView
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            metrosInspeccionados={metrosInspeccionados}
            defectos={defectos}
            totalPuntos={totalPuntos}
            puntosASTM={puntosASTM}
            limiteAceptable={limiteAceptable}
            getEstadoPuntaje={getEstadoPuntaje}
            setMetrosInspeccionados={setMetrosInspeccionados}
            setDefectos={setDefectos}
          />
        )}

        {modo === "imagen" && (
          <ModoImagen
            imagen={imagen}
            resultado={resultadoImagen}
            cargando={cargandoImagen}
            inputRef={inputRef}
            onArchivo={onArchivo}
            setImagen={setImagen}
            setResultado={setResultadoImagen}
          />
        )}

        {modo === "vivo" && (
          <ModoVideoVivo
            videoRef={videoRef}
            canvasRef={canvasRef}
            camaraActiva={camaraActiva}
            camaraFrontal={camaraFrontal}
            resultadoVivo={resultadoVivo}
            procesando={procesando}
            errorRed={errorRed}
            iniciando={iniciando}
            contadorDefectos={contadorDefectos}
            metrosInspeccionados={metrosInspeccionados}
            velocidadMpm={velocidadMpm}
            setVelocidadMpm={setVelocidadMpm}
            iniciarCamara={iniciarCamara}
            detenerCamara={detenerCamara}
            setCamaraFrontal={setCamaraFrontal}
          />
        )}

        {modo === "dashboard" && (
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => cambiarModo("imagen")}
              className="flex-1 min-w-[200px] max-w-[300px] btn-tactile rounded-xl bg-lino text-tierra border-2 border-tierra hover:bg-arena transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>Subir Imagen</span>
            </button>
            <button
              onClick={() => cambiarModo("vivo")}
              className="flex-1 min-w-[200px] max-w-[300px] btn-tactile rounded-xl bg-nopal text-arena border-2 border-nopal hover:bg-nopal/90 transition-all flex items-center justify-center gap-2"
            >
              <Video className="w-5 h-5" />
              <span>Video en Vivo</span>
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function DashboardView({
  isPaused, setIsPaused, metrosInspeccionados, defectos, totalPuntos,
  puntosASTM, limiteAceptable, getEstadoPuntaje, setMetrosInspeccionados, setDefectos
}: {
  isPaused: boolean
  setIsPaused: (v: boolean) => void
  metrosInspeccionados: number
  defectos: Defecto[]
  totalPuntos: number
  puntosASTM: string
  limiteAceptable: number
  getEstadoPuntaje: () => string
  setMetrosInspeccionados: (v: number) => void
  setDefectos: (v: Defecto[]) => void
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="relative bg-obsidiana rounded-2xl overflow-hidden border-2 border-tierra aspect-video">
          <div className="absolute inset-0 bg-gradient-to-br from-obsidiana via-gray-900 to-obsidiana">
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(234, 217, 188, 0.1) 4px, rgba(234, 217, 188, 0.1) 5px),
                  repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(234, 217, 188, 0.1) 4px, rgba(234, 217, 188, 0.1) 5px)
                `,
              }}
            />
            {defectos.map((defecto, idx) => (
              <div
                key={defecto.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${defecto.x}%`, top: `${defecto.y}%` }}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full border-3 flex items-center justify-center animate-pulse",
                  defecto.puntos >= 3 ? "border-maiz bg-maiz/20" : "border-arcilla bg-arcilla/20"
                )}>
                  <span className="font-mono text-sm font-bold text-arena">{idx + 1}</span>
                </div>
              </div>
            ))}
            {!isPaused && (
              <div 
                className="absolute left-0 right-0 h-1 bg-arcilla/60 animate-pulse"
                style={{ top: "50%", boxShadow: "0 0 20px 4px rgba(181, 98, 42, 0.4)" }}
              />
            )}
          </div>
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", isPaused ? "bg-maiz" : "bg-nopal animate-pulse")} />
            <span className="text-arena font-mono text-sm">{isPaused ? "PAUSADO" : "EN VIVO"}</span>
          </div>
          <div className="absolute top-4 right-4 bg-obsidiana/80 px-3 py-1 rounded-lg">
            <span className="font-mono text-arena text-sm">{metrosInspeccionados.toFixed(1)} m</span>
          </div>
          {isPaused && (
            <div className="absolute inset-0 bg-obsidiana/50 flex items-center justify-center">
              <div className="text-center">
                <Pause className="w-16 h-16 text-arena mx-auto mb-2" />
                <p className="text-arena font-semibold">Inspección Pausada</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              "flex-1 btn-tactile rounded-xl flex items-center justify-center gap-3 transition-all border-2",
              isPaused ? "bg-nopal text-arena border-nopal hover:bg-nopal/90" : "bg-maiz text-obsidiana border-maiz hover:bg-maiz/90"
            )}
          >
            {isPaused ? <><Play className="w-6 h-6" /> Reanudar</> : <><Pause className="w-6 h-6" /> Pausar</>}
          </button>
          <button 
            onClick={() => { setMetrosInspeccionados(0); setDefectos([]); }}
            className="btn-tactile px-6 rounded-xl bg-lino text-tierra border-2 border-tierra hover:bg-arena transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="hidden md:inline">Reiniciar</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-lino border-2 border-tierra rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-tierra" />
            <span className="text-humo font-medium">Puntaje ASTM D5430</span>
          </div>
          <ScoreDisplay
            value={parseFloat(puntosASTM)}
            label={`Límite aceptable: ${limiteAceptable} pts`}
            unit="pts/100yd²"
            size="xl"
            variant={getEstadoPuntaje() as "default" | "success" | "warning" | "danger"}
          />
          <div className="mt-6">
            <div className="h-3 bg-arena rounded-full overflow-hidden border border-tierra/30">
              <div
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  getEstadoPuntaje() === "success" && "bg-nopal",
                  getEstadoPuntaje() === "warning" && "bg-maiz",
                  getEstadoPuntaje() === "danger" && "bg-tierra"
                )}
                style={{ width: `${Math.min((parseFloat(puntosASTM) / limiteAceptable) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-humo mt-2">
              {((parseFloat(puntosASTM) / limiteAceptable) * 100).toFixed(0)}% del límite
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ScoreCard value={defectos.length} label="Defectos" />
          <ScoreCard value={totalPuntos} label="Puntos totales" />
        </div>

        <div className="bg-lino border-2 border-tierra rounded-2xl p-4">
          <h3 className="font-semibold text-tierra mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Defectos detectados
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {defectos.length === 0 ? (
              <p className="text-humo text-sm text-center py-4">Sin defectos detectados</p>
            ) : (
              defectos.slice().reverse().map((defecto) => (
                <div key={defecto.id} className="flex items-center justify-between bg-arena p-3 rounded-lg border border-tierra/20">
                  <div>
                    <p className="font-medium text-obsidiana text-sm">{defecto.tipo}</p>
                    <p className="text-xs text-humo font-mono">{defecto.timestamp}</p>
                  </div>
                  <span className={cn(
                    "font-mono font-bold px-2 py-1 rounded",
                    defecto.puntos >= 3 ? "bg-maiz text-obsidiana" : "bg-arcilla/20 text-arcilla"
                  )}>
                    +{defecto.puntos}pt
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ModoImagen({
  imagen, resultado, cargando, inputRef, onArchivo, setImagen, setResultado
}: {
  imagen: string | null
  resultado: Resultado | null
  cargando: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onArchivo: (e: React.ChangeEvent<HTMLInputElement>) => void
  setImagen: (v: string | null) => void
  setResultado: (v: Resultado | null) => void
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-tierra rounded-2xl overflow-hidden cursor-pointer hover:bg-lino transition-all"
        style={{ minHeight: "300px" }}
      >
        {imagen ? (
          <img src={imagen} alt="tela" className="h-full w-full object-contain" />
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-humo">
            <Upload className="w-12 h-12 mb-3 text-tierra" />
            <p className="text-lg font-medium text-tierra">Toca para subir una imagen</p>
            <p className="text-sm mt-1">o toma una foto con la cámara</p>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onArchivo} className="hidden" />

      {cargando && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-maiz text-obsidiana rounded-lg animate-pulse">
            <div className="w-4 h-4 border-2 border-obsidiana border-t-transparent rounded-full animate-spin" />
            Analizando imagen...
          </div>
        </div>
      )}

      {resultado && (
        <div className={cn(
          "rounded-2xl p-6 text-center border-2",
          resultado.tiene_defecto ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300"
        )}>
          <div className={cn("w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center",
            resultado.tiene_defecto ? "bg-red-100" : "bg-green-100"
          )}>
            {resultado.tiene_defecto ? (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
          </div>
          <p className={cn("text-2xl font-bold", resultado.tiene_defecto ? "text-red-600" : "text-green-600")}>
            {resultado.defecto}
          </p>
          <p className="text-humo mt-2">
            Confianza: <span className="font-semibold">{resultado.confianza}%</span>
          </p>
          <button
            onClick={() => { setImagen(null); setResultado(null); }}
            className="mt-4 px-6 py-2 bg-tierra text-arena rounded-xl hover:bg-tierra/90 transition-all"
          >
            Analizar otra
          </button>
        </div>
      )}
    </div>
  )
}

function ModoVideoVivo({
  videoRef, canvasRef, camaraActiva, camaraFrontal, resultadoVivo, procesando,
  errorRed, iniciando, contadorDefectos, metrosInspeccionados, velocidadMpm,
  setVelocidadMpm, iniciarCamara, detenerCamara, setCamaraFrontal
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  camaraActiva: boolean
  camaraFrontal: boolean
  resultadoVivo: Resultado | null
  procesando: boolean
  errorRed: boolean
  iniciando: boolean
  contadorDefectos: number
  metrosInspeccionados: number
  velocidadMpm: number
  setVelocidadMpm: (v: number) => void
  iniciarCamara: (frontal: boolean) => void
  detenerCamara: () => void
  setCamaraFrontal: (v: boolean) => void
}) {
  const cambiarCamara = async () => {
    const nuevaFrontal = !camaraFrontal
    setCamaraFrontal(nuevaFrontal)
    await iniciarCamara(nuevaFrontal)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Métricas en vivo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-lino border-2 border-tierra rounded-xl px-4 py-3 text-center">
          <p className="text-humo text-xs mb-1">Metros inspeccionados</p>
          <p className="font-bold text-tierra text-2xl font-mono">
            {metrosInspeccionados.toFixed(1)}
            <span className="text-sm font-normal ml-1">m</span>
          </p>
        </div>
        <div className="bg-lino border-2 border-tierra rounded-xl px-4 py-3 text-center">
          <p className="text-humo text-xs mb-1">Defectos detectados</p>
          <p className="font-bold text-tierra text-2xl font-mono">{contadorDefectos}</p>
        </div>
      </div>

      {/* Control de velocidad de línea */}
      <div className="bg-lino border-2 border-tierra/50 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-obsidiana">Velocidad de línea</p>
          <p className="text-xs text-humo">metros por minuto que avanza la tela</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVelocidadMpm(Math.max(1, velocidadMpm - 1))}
            className="w-8 h-8 rounded-lg bg-arena border-2 border-tierra text-tierra font-bold hover:bg-lino transition-all"
          >
            −
          </button>
          <span className="font-mono font-bold text-tierra text-lg w-16 text-center">
            {velocidadMpm} m/min
          </span>
          <button
            onClick={() => setVelocidadMpm(Math.min(60, velocidadMpm + 1))}
            className="w-8 h-8 rounded-lg bg-arena border-2 border-tierra text-tierra font-bold hover:bg-lino transition-all"
          >
            +
          </button>
        </div>
      </div>

      {/* Alertas de estado */}
      <div className="flex gap-3 flex-wrap">
        {errorRed && (
          <div className="flex-1 bg-yellow-50 border-2 border-yellow-400 rounded-xl px-4 py-2 text-sm text-yellow-700">
            Sin conexión con backend
          </div>
        )}
        {procesando && !errorRed && (
          <div className="flex-1 bg-maiz/20 border-2 border-maiz rounded-xl px-4 py-2 text-sm text-tierra animate-pulse">
            Analizando...
          </div>
        )}
      </div>

      <div
        className={cn(
          "relative w-full rounded-2xl overflow-hidden bg-obsidiana",
          resultadoVivo?.tiene_defecto ? "ring-4 ring-red-500 ring-opacity-80" : ""
        )}
        style={{ aspectRatio: "16/9" }}
      >
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {!camaraActiva && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-obsidiana">
            {iniciando ? (
              <>
                <div className="w-10 h-10 border-4 border-maiz border-t-transparent rounded-full animate-spin" />
                <p className="text-arena text-sm">Iniciando cámara...</p>
              </>
            ) : (
              <>
                <Video className="w-16 h-16 text-humo" />
                <p className="text-arena text-sm text-center px-6">
                  Presiona "Iniciar cámara" para comenzar el análisis en vivo
                </p>
              </>
            )}
          </div>
        )}

        {resultadoVivo && camaraActiva && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-4 pointer-events-none">
            <div className={cn("px-6 py-3 rounded-xl text-white text-center backdrop-blur-sm",
              resultadoVivo.tiene_defecto ? "bg-red-600/80" : "bg-nopal/80"
            )}>
              <p className="font-bold text-lg leading-tight flex items-center gap-2">
                {resultadoVivo.tiene_defecto ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                {resultadoVivo.defecto}
              </p>
              <p className="text-sm opacity-90 mt-0.5">Confianza: {resultadoVivo.confianza}%</p>
            </div>
          </div>
        )}

        {resultadoVivo?.tiene_defecto && camaraActiva && (
          <div className="absolute inset-0 border-4 border-red-500 rounded-2xl pointer-events-none animate-pulse" />
        )}
      </div>

      {!camaraActiva ? (
        <button
          onClick={() => iniciarCamara(camaraFrontal)}
          disabled={iniciando}
          className="w-full py-4 bg-nopal text-arena rounded-xl font-semibold text-lg hover:bg-nopal/90 transition-all disabled:opacity-60"
        >
          {iniciando ? "Iniciando..." : "Iniciar cámara"}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={cambiarCamara}
            className="py-3 bg-lino text-tierra border-2 border-tierra rounded-xl font-medium hover:bg-arena transition-all active:scale-95"
          >
            🔄 Cambiar a {camaraFrontal ? "trasera" : "frontal"}
          </button>
          <button
            onClick={detenerCamara}
            className="py-3 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-all active:scale-95"
          >
            Detener cámara
          </button>
        </div>
      )}

      <p className="text-xs text-humo text-center">
        Análisis continuo: espera respuesta del modelo + 500ms entre capturas.
        {camaraActiva && " Suena una alerta al detectar defecto."}
      </p>
    </div>
  )
}