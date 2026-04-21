"use client";
import { useState, useRef, useEffect, useCallback } from "react";

type Resultado = {
  defecto: string;
  confianza: number;
  tiene_defecto: boolean;
};

type Modo = "imagen" | "vivo";

export default function Home() {
  // ── Modo imagen ──────────────────────────────────────────────────────────
  const [imagen, setImagen] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Selector de modo ─────────────────────────────────────────────────────
  const [modo, setModo] = useState<Modo>("imagen");

  // ── Modo vivo ─────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analizandoRef = useRef(false);

  const [camaraActiva, setCamaraActiva] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [camaraFrontal, setCamaraFrontal] = useState(false);
  const [resultadoVivo, setResultadoVivo] = useState<Resultado | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [contadorDefectos, setContadorDefectos] = useState(0);

  // ── Helpers modo imagen ──────────────────────────────────────────────────
  const analizar = async (file: File) => {
    setCargando(true);
    setResultado(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/analizar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResultado(data);
    } catch {
      alert("Error al conectar con el backend");
    } finally {
      setCargando(false);
    }
  };

  const onArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagen(URL.createObjectURL(file));
    analizar(file);
  };

  // ── Beep (Web Audio API) ─────────────────────────────────────────────────
  const reproducirBeep = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  }, []);

  // ── Capturar frame y enviar al backend ───────────────────────────────────
  const capturarYAnalizar = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || analizandoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    ctx2d.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      analizandoRef.current = true;
      setProcesando(true);
      const formData = new FormData();
      formData.append("file", new File([blob], "frame.jpg", { type: "image/jpeg" }));
      try {
        const res = await fetch("http://localhost:8000/analizar", {
          method: "POST",
          body: formData,
        });
        const data: Resultado = await res.json();
        setResultadoVivo(data);
        if (data.tiene_defecto) {
          setContadorDefectos((c) => c + 1);
          reproducirBeep();
        }
      } catch {
        // fallo silencioso en modo vivo
      } finally {
        analizandoRef.current = false;
        setProcesando(false);
      }
    }, "image/jpeg", 0.85);
  }, [reproducirBeep]);

  // ── Iniciar cámara ───────────────────────────────────────────────────────
  const iniciarCamara = useCallback(async (frontal: boolean) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: frontal ? "user" : "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamaraActiva(true);
      setPausado(false);
      setResultadoVivo(null);
    } catch {
      alert("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
    }
  }, []);

  // ── Detener cámara ───────────────────────────────────────────────────────
  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCamaraActiva(false);
    setResultadoVivo(null);
    setPausado(false);
    setProcesando(false);
    analizandoRef.current = false;
  }, []);

  // ── Gestionar intervalo de análisis ─────────────────────────────────────
  useEffect(() => {
    if (camaraActiva && !pausado) {
      intervalRef.current = setInterval(capturarYAnalizar, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [camaraActiva, pausado, capturarYAnalizar]);

  // ── Limpiar al desmontar componente ──────────────────────────────────────
  useEffect(() => () => detenerCamara(), [detenerCamara]);

  const cambiarCamara = async () => {
    const nuevaFrontal = !camaraFrontal;
    setCamaraFrontal(nuevaFrontal);
    await iniciarCamara(nuevaFrontal);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-3 py-4 sm:px-6 sm:py-8">

      {/* ── Encabezado ── */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 mt-2 sm:mt-4 text-center">
        Inspector de Telas IA
      </h1>
      <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 text-center">
        Detecta defectos en telas con inteligencia artificial
      </p>

      {/* ── Selector de modo ── */}
      <div className="flex bg-gray-200 rounded-xl p-1 mb-5 sm:mb-8 w-full max-w-lg">
        <button
          onClick={() => { detenerCamara(); setModo("imagen"); }}
          className={`flex-1 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
            modo === "imagen"
              ? "bg-white text-gray-800 shadow"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📷 Subir imagen
        </button>
        <button
          onClick={() => setModo("vivo")}
          className={`flex-1 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
            modo === "vivo"
              ? "bg-white text-gray-800 shadow"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🎥 Análisis en vivo
        </button>
      </div>

      {/* ══════════════════════════════ MODO IMAGEN ══════════════════════════ */}
      {modo === "imagen" && (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            className="w-full max-w-lg h-44 sm:h-56 md:h-64 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 active:bg-blue-50 transition-all"
          >
            {imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagen}
                alt="tela"
                className="h-full w-full object-contain rounded-xl"
              />
            ) : (
              <div className="text-center text-gray-400 px-4">
                <p className="text-3xl sm:text-4xl mb-1 sm:mb-2">📷</p>
                <p className="text-sm sm:text-base">Toca para subir una imagen</p>
                <p className="text-xs sm:text-sm mt-1 text-gray-400">
                  o toma una foto con la cámara
                </p>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onArchivo}
            className="hidden"
          />

          {cargando && (
            <div className="mt-5 text-blue-500 text-sm font-medium animate-pulse">
              Analizando imagen...
            </div>
          )}

          {resultado && (
            <div
              className={`mt-5 w-full max-w-lg rounded-xl p-4 sm:p-6 text-center ${
                resultado.tiene_defecto
                  ? "bg-red-50 border border-red-200"
                  : "bg-green-50 border border-green-200"
              }`}
            >
              <p className="text-4xl sm:text-5xl mb-2 sm:mb-3">
                {resultado.tiene_defecto ? "⚠️" : "✅"}
              </p>
              <p
                className={`text-xl sm:text-2xl font-bold ${
                  resultado.tiene_defecto ? "text-red-600" : "text-green-600"
                }`}
              >
                {resultado.defecto}
              </p>
              <p className="text-gray-500 text-sm sm:text-base mt-2">
                Confianza:{" "}
                <span className="font-semibold">{resultado.confianza}%</span>
              </p>
              <button
                onClick={() => { setImagen(null); setResultado(null); }}
                className="mt-4 px-5 py-2.5 bg-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-300 active:bg-gray-300 transition"
              >
                Analizar otra
              </button>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════ MODO VIVO ══════════════════════════════ */}
      {modo === "vivo" && (
        <div className="w-full max-w-lg flex flex-col items-center gap-3 sm:gap-4">

          {/* Barra de estado */}
          <div className="flex gap-2 sm:gap-3 w-full items-center">
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600">
              Defectos:{" "}
              <span className="font-bold text-red-600">{contadorDefectos}</span>
            </div>
            {procesando && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-2.5 sm:px-3 py-2 text-xs text-blue-600 animate-pulse whitespace-nowrap">
                Analizando...
              </div>
            )}
            {pausado && camaraActiva && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-2.5 sm:px-3 py-2 text-xs text-yellow-700 whitespace-nowrap">
                En pausa
              </div>
            )}
          </div>

          {/* Feed de cámara con overlay */}
          <div
            className={`relative w-full rounded-xl overflow-hidden bg-black ${
              resultadoVivo?.tiene_defecto ? "ring-4 ring-red-500 ring-opacity-80" : ""
            }`}
            style={{ aspectRatio: "4/3" }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Placeholder sin cámara */}
            {!camaraActiva && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-3 bg-gray-900">
                <span className="text-4xl sm:text-5xl">🎥</span>
                <p className="text-gray-300 text-xs sm:text-sm text-center px-6">
                  Presiona &quot;Iniciar cámara&quot; para comenzar el análisis en vivo
                </p>
              </div>
            )}

            {/* Overlay de resultado */}
            {resultadoVivo && camaraActiva && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2 sm:pb-3 pointer-events-none">
                <div
                  className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl text-white text-center backdrop-blur-sm ${
                    resultadoVivo.tiene_defecto
                      ? "bg-red-600/80"
                      : "bg-green-600/80"
                  }`}
                >
                  <p className="font-bold text-sm sm:text-base leading-tight">
                    {resultadoVivo.tiene_defecto ? "⚠️ " : "✅ "}
                    {resultadoVivo.defecto}
                  </p>
                  <p className="text-xs opacity-90 mt-0.5">
                    Confianza: {resultadoVivo.confianza}%
                  </p>
                </div>
              </div>
            )}

            {/* Borde pulsante de alerta */}
            {resultadoVivo?.tiene_defecto && camaraActiva && (
              <div className="absolute inset-0 border-4 border-red-500 rounded-xl pointer-events-none animate-pulse" />
            )}
          </div>

          {/* Controles */}
          {!camaraActiva ? (
            <button
              onClick={() => iniciarCamara(camaraFrontal)}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-medium text-sm sm:text-base hover:bg-blue-700 active:scale-95 transition-all"
            >
              Iniciar cámara
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
              <button
                onClick={() => setPausado((p) => !p)}
                className={`col-span-1 py-3 sm:py-3.5 rounded-xl font-medium text-xs sm:text-sm transition-all active:scale-95 ${
                  pausado
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-yellow-500 text-white hover:bg-yellow-600"
                }`}
              >
                {pausado ? "▶ Reanudar" : "⏸ Pausar"}
              </button>
              <button
                onClick={cambiarCamara}
                className="col-span-1 py-3 sm:py-3.5 bg-gray-200 text-gray-700 rounded-xl font-medium text-xs sm:text-sm hover:bg-gray-300 active:scale-95 transition-all"
                title="Cambiar entre cámara frontal y trasera"
              >
                🔄 {camaraFrontal ? "Frontal" : "Trasera"}
              </button>
              <button
                onClick={() => { detenerCamara(); setContadorDefectos(0); }}
                className="col-span-1 py-3 sm:py-3.5 bg-red-100 text-red-600 rounded-xl font-medium text-xs sm:text-sm hover:bg-red-200 active:scale-95 transition-all"
              >
                Detener
              </button>
            </div>
          )}

          {/* Ayuda */}
          <p className="text-xs text-gray-400 text-center px-2">
            Análisis automático cada 2 segundos.
            {camaraActiva && " Suena una alerta al detectar defecto."}
          </p>
        </div>
      )}
    </main>
  );
}
