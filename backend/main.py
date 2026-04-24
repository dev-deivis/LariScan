from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
from PIL import Image
import io
import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("fabric_defect_model.pt")

CLASES = {
    0: "Vertical",
    1: "Sin defecto",
    2: "Horizontal",
    3: "Agujero",
    4: "Líneas",
    5: "Mancha"
}

# ── Configuración activa en memoria ─────────────────────────────────────────
_config: dict = {
    "norma": "ASTM D5430",
    "ancho_rollo_in": 45.0,
    "largo_rollo_yd": 120.0,
    "ancho_camara_in": 45.0,
    "resolucion_px": 1920,
    "umbral_pts": 40.0,
    "zona_advertencia_pct": 80.0,
    "regla_continuo": True,
    "regla_rechazo_auto": True,
    "preset": "exportacion",
}
_log: list[dict] = []


# ── Lógica ASTM D5430 ────────────────────────────────────────────────────────
def puntos_astm(tamano_in: float, es_agujero: bool = False,
                es_continuo: bool = False, yardas_continuas: float = 0) -> int:
    if es_continuo:
        return int(4 * yardas_continuas)
    if es_agujero:
        return 4
    if tamano_in <= 3:
        return 1
    if tamano_in <= 6:
        return 2
    if tamano_in <= 9:
        return 3
    return 4


def score_astm(puntos_total: float, largo_yd: float, ancho_in: float) -> float:
    if largo_yd <= 0 or ancho_in <= 0:
        return 0.0
    return (puntos_total * 36 * 100) / (ancho_in * largo_yd)


def verificar_rechazo_automatico(defectos: list[dict]) -> tuple[bool, str | None]:
    for d in defectos:
        if d.get("es_continuo") and d.get("yardas_continuas", 0) > 10:
            return True, "Defecto continuo mayor a 10 yardas — rechazo automático"
    return False, None


# ── Modelos Pydantic ─────────────────────────────────────────────────────────
class ConfigNormaIn(BaseModel):
    norma: str
    ancho_rollo_in: float
    largo_rollo_yd: float
    ancho_camara_in: float
    resolucion_px: int
    umbral_pts: float
    zona_advertencia_pct: float
    regla_continuo: bool
    regla_rechazo_auto: bool
    preset: str


class CalcularPuntosIn(BaseModel):
    bbox_w: float = 0
    bbox_h: float = 0
    clase: str = ""
    es_continuo: bool = False
    yardas_continuas: float = 0


# ── Endpoint existente: análisis de imagen ───────────────────────────────────
@app.post("/analizar")
async def analizar(file: UploadFile = File(...)):
    contenido = await file.read()
    imagen = Image.open(io.BytesIO(contenido)).convert("RGB")
    resultados = model(imagen)
    probs = resultados[0].probs
    clase_id = int(probs.top1)
    confianza = float(probs.top1conf)
    clase_nombre = CLASES.get(clase_id, "Desconocido")
    tiene_defecto = clase_nombre != "Sin defecto"

    return {
        "defecto": clase_nombre,
        "confianza": round(confianza * 100, 2),
        "tiene_defecto": tiene_defecto,
    }


# ── Endpoints de configuración ───────────────────────────────────────────────
@app.get("/configuracion")
def get_configuracion():
    return _config


@app.post("/configuracion")
async def set_configuracion(nueva: ConfigNormaIn):
    global _config
    _log.append({
        "timestamp": datetime.datetime.now().isoformat(),
        "umbral_anterior": _config["umbral_pts"],
        "umbral_nuevo": nueva.umbral_pts,
        "norma": nueva.norma,
    })
    _config = nueva.model_dump()
    return {
        "ok": True,
        "mensaje": f"Configuración {nueva.norma} activada — umbral: {nueva.umbral_pts} pts/100yd²",
    }


@app.get("/configuracion/log")
def get_log():
    return _log


# ── Endpoint: calcular puntos ASTM desde bbox YOLO ───────────────────────────
@app.post("/calcular-puntos")
async def calcular_puntos(data: CalcularPuntosIn):
    escala = _config["ancho_camara_in"] / max(_config["resolucion_px"], 1)
    tamano_px = max(data.bbox_w, data.bbox_h)
    tamano_in = tamano_px * escala
    es_agujero = data.clase.lower() == "agujero"
    pts = puntos_astm(tamano_in, es_agujero, data.es_continuo, data.yardas_continuas)
    return {
        "puntos": pts,
        "tamano_in": round(tamano_in, 2),
        "escala": round(escala, 4),
    }


@app.get("/")
def root():
    return {"status": "ok"}
