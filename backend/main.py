from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ultralytics import YOLO
from PIL import Image
from typing import Optional, List
from datetime import datetime, timedelta
from fpdf import FPDF
import io, json, hashlib, datetime as dt
import cv2
import numpy as np

from database import get_db, engine
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="LariScan API — ISO 9001")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None

def _get_model():
    global _model
    if _model is None:
        _model = YOLO("fabric_defect_model.pt")
    return _model

CLASES = {
    0: "Vertical",
    1: "Sin defecto",
    2: "Horizontal",
    3: "Agujero",
    4: "Lineas",
    5: "Mancha",
}

# ── Configuración en memoria (existente) ─────────────────────────────────────
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
    "aatcc_173_activo": False,
    "aatcc_tolerancia_h": 15.0,
    "aatcc_tolerancia_s": 15.0,
    "aatcc_tolerancia_v": 15.0,
    "aatcc_frames_confirmacion": 3,
    "aatcc_frames_calibracion": 5,
}
_log: list = []


# ── Lógica ASTM D5430 (existente) ────────────────────────────────────────────
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


# ── Schemas Pydantic ─────────────────────────────────────────────────────────
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
    aatcc_173_activo: bool = False
    aatcc_tolerancia_h: float = 15.0
    aatcc_tolerancia_s: float = 15.0
    aatcc_tolerancia_v: float = 15.0
    aatcc_frames_confirmacion: int = 3
    aatcc_frames_calibracion: int = 5


class CalcularPuntosIn(BaseModel):
    bbox_w: float = 0
    bbox_h: float = 0
    clase: str = ""
    es_continuo: bool = False
    yardas_continuas: float = 0


class DefectoInput(BaseModel):
    tipo: str
    tamano_px_ancho: Optional[int] = None
    tamano_px_alto: Optional[int] = None
    tamano_in: float
    puntos_asignados: int
    posicion_rollo_metros: float
    confianza_deteccion: float
    imagen_evidencia: Optional[str] = None
    validado_por_inspector: bool = False
    accion_tomada: str = "registrado"


class CrearReporteInput(BaseModel):
    id_rollo: str
    numero_lote: str
    proveedor: str
    tipo_tela: str
    ancho_pulgadas: float
    largo_yardas: float
    fecha_recepcion: str
    fecha_inspeccion: str
    inspector_id: str
    inspector_nombre: str
    inspector_turno: str
    umbral_configurado: float
    configuracion_id: Optional[str] = None
    calibracion_escala: Optional[str] = None
    inicio_inspeccion: Optional[str] = None
    fin_inspeccion: Optional[str] = None
    duracion_minutos: Optional[float] = None
    total_defectos_detectados: int
    puntos_totales_astm: float
    score_100yd2: float
    rechazo_automatico: bool = False
    veredicto_final: str
    confianza_modelo: Optional[str] = None
    defectos: List[DefectoInput] = []


class FirmarReporteInput(BaseModel):
    inspector_id: str
    inspector_nombre: str


class ActualizarNCInput(BaseModel):
    disposicion: Optional[str] = None
    accion_correctiva: Optional[str] = None
    responsable_ac: Optional[str] = None
    fecha_limite_ac: Optional[str] = None


# ── Helpers ISO 9001 ─────────────────────────────────────────────────────────
def _generar_id_reporte(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(models.Reporte).filter(
        models.Reporte.fecha_emision >= datetime(year, 1, 1)
    ).count()
    return f"RPT-{year}-{count + 1:04d}"


def _generar_id_nc(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(models.NoConformidad).count()
    return f"NC-{year}-{count + 1:03d}"


def _retencion(veredicto: str) -> datetime:
    anos = 5 if veredicto == "RECHAZADO" else 3
    return datetime.utcnow() + timedelta(days=anos * 365)


def _hash_reporte(r: models.Reporte, defectos) -> str:
    data = {
        "id": r.id,
        "version": r.version,
        "id_rollo": r.id_rollo,
        "inspector_id": r.inspector_id,
        "veredicto_final": r.veredicto_final,
        "score_100yd2": r.score_100yd2,
        "total_defectos": r.total_defectos_detectados,
        "defectos": [{"id": d.id, "tipo": d.tipo, "puntos": d.puntos_asignados} for d in defectos],
    }
    serialized = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return "sha256:" + hashlib.sha256(serialized.encode()).hexdigest()


def _parse_dt(s: Optional[str]) -> datetime:
    if not s:
        return datetime.utcnow()
    try:
        return datetime.fromisoformat(s.replace("Z", ""))
    except Exception:
        return datetime.utcnow()


def _resumen(r: models.Reporte) -> dict:
    return {
        "id": r.id,
        "id_rollo": r.id_rollo,
        "proveedor": r.proveedor,
        "inspector_nombre": r.inspector_nombre,
        "fecha_emision": r.fecha_emision.isoformat() if r.fecha_emision else None,
        "veredicto_final": r.veredicto_final,
        "estado_documento": r.estado_documento,
        "score_100yd2": r.score_100yd2,
        "estado_nc": r.no_conformidad.estado_nc if r.no_conformidad else None,
    }


# ── PDF ───────────────────────────────────────────────────────────────────────
def _s(text) -> str:
    """Sanitize text to Latin-1 — replaces em/en dashes and any non-Latin-1 char."""
    if text is None:
        return "-"
    s = (
        str(text)
        .replace("—", "-")   # em dash —
        .replace("–", "-")   # en dash –
        .replace("‘", "'")   # left single quote '
        .replace("’", "'")   # right single quote '
        .replace("“", '"')   # left double quote "
        .replace("”", '"')   # right double quote "
        .replace("…", "...") # ellipsis …
    )
    return s.encode("latin-1", errors="replace").decode("latin-1")


def _sec(pdf: FPDF, titulo: str):
    pdf.ln(2)
    pdf.set_fill_color(60, 40, 20)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(0, 6, f"  {_s(titulo)}", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 8)
    pdf.ln(1)


def _fila(pdf: FPDF, l1: str, v1, l2: str = "", v2=None):
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(38, 5, _s(l1))
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(52, 5, _s(v1) if v1 is not None else "-")
    if l2:
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(38, 5, _s(l2))
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(52, 5, _s(v2) if v2 is not None else "-")
    pdf.ln()


def generar_pdf(r: models.Reporte, defectos, nc=None) -> bytes:
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(12, 12, 12)

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(130, 8, "LariScan - Inspector de Defectos en Telas")
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, f"Reporte: {r.id}  |  v{r.version}", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(130, 5, "Trazabilidad ISO 9001:2015  |  ASTM D5430")
    pdf.cell(0, 5, f"Estado: {r.estado_documento}  |  {r.norma_gestion}", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(120, 74, 45)
    pdf.line(12, pdf.get_y() + 1, 198, pdf.get_y() + 1)
    pdf.ln(3)

    _sec(pdf, "SECCION 1 - IDENTIFICACION DEL PRODUCTO (Clausula 8.6)")
    _fila(pdf, "ID Rollo:", r.id_rollo, "Numero de Lote:", r.numero_lote)
    _fila(pdf, "Proveedor:", r.proveedor, "Tipo de Tela:", r.tipo_tela)
    _fila(pdf, "Ancho:", f'{r.ancho_pulgadas}"', "Largo:", f"{r.largo_yardas} yd")
    _fila(pdf, "Fecha Recepcion:", r.fecha_recepcion, "Fecha Inspeccion:", r.fecha_inspeccion)

    _sec(pdf, "SECCION 2 - TRAZABILIDAD DEL PROCESO (Clausula 7.5)")
    _fila(pdf, "Inspector:", f"{r.inspector_nombre} ({r.inspector_id})", "Turno:", r.inspector_turno)
    _fila(pdf, "Norma Aplicada:", r.norma_aplicada, "Umbral:", f"{r.umbral_configurado} pts/100yd2")
    _fila(pdf, "Config ID:", r.configuracion_id, "Camara:", r.camara_id)
    _fila(pdf, "Escala:", r.calibracion_escala, "Duracion:", f"{r.duracion_minutos:.1f} min" if r.duracion_minutos else "-")
    inicio = r.inicio_inspeccion.strftime("%H:%M:%S") if r.inicio_inspeccion else "-"
    fin = r.fin_inspeccion.strftime("%H:%M:%S") if r.fin_inspeccion else "-"
    _fila(pdf, "Inicio:", inicio, "Fin:", fin)

    _sec(pdf, "SECCION 3 - RESULTADOS DE INSPECCION (Clausula 8.6)")
    veredicto = r.veredicto_final or "PENDIENTE"
    if veredicto == "APROBADO":
        pdf.set_fill_color(22, 163, 74)
    else:
        pdf.set_fill_color(220, 38, 38)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 9, f"  VEREDICTO FINAL: {_s(veredicto)}", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 8)
    pdf.ln(2)
    _fila(pdf, "Total Defectos:", r.total_defectos_detectados, "Puntos ASTM:", r.puntos_totales_astm)
    _fila(pdf, "Score (pts/100yd2):", f"{r.score_100yd2:.2f}", "Umbral:", r.umbral_aplicado)
    _fila(pdf, "Confianza Modelo:", r.confianza_modelo, "Rechazo Automatico:", "SI" if r.rechazo_automatico else "NO")

    if defectos:
        _sec(pdf, "SECCION 4 - DEFECTOS INDIVIDUALES (Clausula 8.7)")
        widths = [18, 32, 20, 16, 26, 22, 32]
        headers = ["ID", "Tipo", "Tamano (in)", "Puntos", "Posicion (m)", "Confianza", "Accion"]
        pdf.set_fill_color(60, 40, 20)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 7)
        for i, h in enumerate(headers):
            pdf.cell(widths[i], 5, h, border=1, fill=True)
        pdf.ln()
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "", 7)
        for idx, d in enumerate(defectos):
            fill = idx % 2 == 0
            pdf.set_fill_color(245, 242, 235) if fill else pdf.set_fill_color(255, 255, 255)
            pdf.cell(widths[0], 5, d.id[-10:], border=1, fill=fill)
            pdf.cell(widths[1], 5, _s(d.tipo), border=1, fill=fill)
            pdf.cell(widths[2], 5, f"{d.tamano_in:.2f}", border=1, fill=fill)
            pdf.cell(widths[3], 5, str(d.puntos_asignados), border=1, fill=fill)
            pdf.cell(widths[4], 5, f"{d.posicion_rollo_metros:.1f}", border=1, fill=fill)
            pdf.cell(widths[5], 5, f"{d.confianza_deteccion * 100:.1f}%", border=1, fill=fill)
            pdf.cell(widths[6], 5, _s(d.accion_tomada), border=1, fill=fill)
            pdf.ln()

    if nc:
        _sec(pdf, "SECCION 5 - CONTROL DE NO CONFORMIDADES (Clausulas 8.7 / 10.2)")
        _fila(pdf, "ID NC:", nc.id, "Estado:", nc.estado_nc)
        _fila(pdf, "Motivo:", nc.motivo, "Disposicion:", nc.disposicion or "Pendiente")
        _fila(pdf, "Responsable AC:", nc.responsable_ac or "-", "Fecha Limite:", nc.fecha_limite_ac.strftime("%Y-%m-%d") if nc.fecha_limite_ac else "-")
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(0, 5, "Descripcion:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 8)
        pdf.multi_cell(0, 4, _s(nc.descripcion or "-"))
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(0, 5, "Accion Correctiva:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 8)
        pdf.multi_cell(0, 4, _s(nc.accion_correctiva or "Pendiente de asignacion por inspector jefe"))

    _sec(pdf, "SECCION 6 - FIRMA Y CIERRE DEL DOCUMENTO (Clausula 7.5.3)")
    if r.firma_timestamp:
        _fila(pdf, "Firmado por:", r.firma_inspector_id, "Accion:", r.firma_accion)
        _fila(pdf, "Fecha Firma:", r.firma_timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"), "Inmutable desde:", r.inmutable_desde.strftime("%Y-%m-%d %H:%M:%S") if r.inmutable_desde else "-")
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(30, 5, "Hash SHA-256:")
        pdf.set_font("Courier", "", 7)
        pdf.multi_cell(0, 4, r.hash_documento or "-")
    else:
        pdf.set_font("Helvetica", "I", 8)
        pdf.cell(0, 7, "  Documento pendiente de firma - requiere firma del inspector", new_x="LMARGIN", new_y="NEXT")

    export_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    hash_str = (r.hash_documento or "pendiente")[:50] + "..."
    pdf.set_y(-16)
    pdf.set_font("Helvetica", "I", 6)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(0, 3, f"Documento generado por LariScan - Trazabilidad ISO 9001:2015 - Hash: {hash_str} - Exportado: {export_ts}", align="C")

    return bytes(pdf.output())


def _log_acceso(db: Session, uid: str, nombre: str, accion: str, recurso: str, params: dict, ip: str):
    db.add(models.LogAcceso(
        usuario_id=uid,
        usuario_nombre=nombre,
        accion=accion,
        recurso=recurso,
        parametros=json.dumps(params, ensure_ascii=False),
        ip=ip,
        retencion_hasta=datetime.utcnow() + timedelta(days=365 * 2),
    ))


# ── Endpoints existentes ──────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "version": "LariScan v1.0.0 — ISO 9001"}


@app.post("/analizar")
async def analizar(file: UploadFile = File(...)):
    try:
        contenido = await file.read()
        imagen = Image.open(io.BytesIO(contenido)).convert("RGB")
        resultados = _get_model()(imagen)
        probs = resultados[0].probs
        clase_id = int(probs.top1)
        confianza = float(probs.top1conf)
        clase_nombre = CLASES.get(clase_id, "Desconocido")
        tiene_defecto = clase_nombre != "Sin defecto"
        return {"defecto": clase_nombre, "confianza": round(confianza * 100, 2), "tiene_defecto": tiene_defecto}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al analizar: {str(e)}")


# ── Endpoint AATCC 173: análisis de uniformidad de color ────────────────────
@app.post("/analizar-color")
async def analizar_color(
    file: UploadFile = File(...),
    ref_h: Optional[float] = Form(None),
    ref_s: Optional[float] = Form(None),
    ref_v: Optional[float] = Form(None),
):
    contenido = await file.read()
    img_arr = np.frombuffer(contenido, np.uint8)
    img_bgr = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    # Excluir píxeles muy oscuros (fondo, sombras)
    mascara = img_hsv[:, :, 2] > 30
    if not mascara.any():
        mascara = np.ones(img_hsv.shape[:2], dtype=bool)

    h_mean = float(img_hsv[:, :, 0][mascara].mean())
    s_mean = float(img_hsv[:, :, 1][mascara].mean())
    v_mean = float(img_hsv[:, :, 2][mascara].mean())

    if ref_h is None or ref_s is None or ref_v is None:
        return {"h": round(h_mean, 1), "s": round(s_mean, 1), "v": round(v_mean, 1),
                "desviacion_pct": None, "fuera_tolerancia": None}

    tol_h = float(_config.get("aatcc_tolerancia_h", 15.0))
    tol_s = float(_config.get("aatcc_tolerancia_s", 15.0))
    tol_v = float(_config.get("aatcc_tolerancia_v", 15.0))

    # Hue: distancia circular (OpenCV: 0-179 → representa 0-360°)
    diff_h = abs(h_mean - ref_h)
    delta_h_deg = min(diff_h, 180.0 - diff_h) * 2.0  # en grados reales (0-180)

    # Saturación y Valor: diferencia porcentual (escala 0-255 → 0-100%)
    delta_s_pct = abs(s_mean - ref_s) / 255.0 * 100.0
    delta_v_pct = abs(v_mean - ref_v) / 255.0 * 100.0

    fuera = (delta_h_deg > tol_h) or (delta_s_pct > tol_s) or (delta_v_pct > tol_v)

    # Desviación normalizada 0-100 para la barra de UI
    desv_h = min(delta_h_deg / 180.0 * 100.0, 100.0)
    desv_s = min(delta_s_pct, 100.0)
    desv_v = min(delta_v_pct, 100.0)
    desviacion_pct = round(max(desv_h, desv_s, desv_v), 1)

    return {
        "h": round(h_mean, 1),
        "s": round(s_mean, 1),
        "v": round(v_mean, 1),
        "delta_h_deg": round(delta_h_deg, 1),
        "delta_s_pct": round(delta_s_pct, 1),
        "delta_v_pct": round(delta_v_pct, 1),
        "desviacion_pct": desviacion_pct,
        "fuera_tolerancia": fuera,
    }



# ── Endpoints de configuración ───────────────────────────────────────────────
@app.get("/configuracion")
def get_configuracion():
    return _config


@app.post("/configuracion")
async def set_configuracion(nueva: ConfigNormaIn):
    global _config
    _log.append({
        "timestamp": dt.datetime.now().isoformat(),
        "umbral_anterior": _config["umbral_pts"],
        "umbral_nuevo": nueva.umbral_pts,
        "norma": nueva.norma,
    })
    _config = nueva.model_dump()
    return {"ok": True, "mensaje": f"Configuración {nueva.norma} activada — umbral: {nueva.umbral_pts} pts/100yd²"}


@app.get("/configuracion/log")
def get_log():
    return _log


@app.post("/calcular-puntos")
async def calcular_puntos(data: CalcularPuntosIn):
    escala = _config["ancho_camara_in"] / max(_config["resolucion_px"], 1)
    tamano_px = max(data.bbox_w, data.bbox_h)
    tamano_in = tamano_px * escala
    es_agujero = data.clase.lower() == "agujero"
    pts = puntos_astm(tamano_in, es_agujero, data.es_continuo, data.yardas_continuas)
    return {"puntos": pts, "tamano_in": round(tamano_in, 2), "escala": round(escala, 4)}


# ── Endpoints ISO 9001 — Reportes ─────────────────────────────────────────────
@app.post("/reportes")
def crear_reporte(data: CrearReporteInput, db: Session = Depends(get_db)):
    rid = _generar_id_reporte(db)
    now = datetime.utcnow()
    escala = f"{round(_config['ancho_camara_in'] / max(_config['resolucion_px'], 1), 4)} pulgadas/pixel"

    r = models.Reporte(
        id=rid, version="1.0", estado_documento="BORRADOR", fecha_emision=now,
        id_rollo=data.id_rollo, numero_lote=data.numero_lote,
        proveedor=data.proveedor, tipo_tela=data.tipo_tela,
        ancho_pulgadas=data.ancho_pulgadas, largo_yardas=data.largo_yardas,
        fecha_recepcion=data.fecha_recepcion, fecha_inspeccion=data.fecha_inspeccion,
        inspector_id=data.inspector_id, inspector_nombre=data.inspector_nombre,
        inspector_turno=data.inspector_turno,
        umbral_configurado=data.umbral_configurado, umbral_aplicado=data.umbral_configurado,
        configuracion_id=data.configuracion_id or f"CFG-{now.strftime('%Y%m%d')}",
        calibracion_escala=data.calibracion_escala or escala,
        inicio_inspeccion=_parse_dt(data.inicio_inspeccion),
        fin_inspeccion=_parse_dt(data.fin_inspeccion),
        duracion_minutos=data.duracion_minutos or 0,
        total_defectos_detectados=data.total_defectos_detectados,
        puntos_totales_astm=data.puntos_totales_astm,
        score_100yd2=data.score_100yd2,
        rechazo_automatico=data.rechazo_automatico,
        veredicto_final=data.veredicto_final,
        confianza_modelo=data.confianza_modelo or "-",
        retencion_hasta=_retencion(data.veredicto_final),
    )
    db.add(r)

    for i, d in enumerate(data.defectos):
        db.add(models.DefectoIndividual(
            id=f"DEF-{i + 1:03d}-{rid}",
            reporte_id=rid, tipo=d.tipo,
            tamano_px_ancho=d.tamano_px_ancho, tamano_px_alto=d.tamano_px_alto,
            tamano_in=d.tamano_in, puntos_asignados=d.puntos_asignados,
            posicion_rollo_metros=d.posicion_rollo_metros,
            confianza_deteccion=d.confianza_deteccion,
            imagen_evidencia=d.imagen_evidencia,
            validado_por_inspector=d.validado_por_inspector,
            accion_tomada=d.accion_tomada,
        ))

    if data.veredicto_final == "RECHAZADO":
        nc_id = _generar_id_nc(db)
        motivo = "rechazo_automatico" if data.rechazo_automatico else "score_supera_umbral"
        desc = (
            "Defecto continuo supera 10 yardas — rechazo automático ASTM D5430"
            if data.rechazo_automatico
            else f"Puntaje {data.score_100yd2:.1f} pts/100yd² supera umbral de {data.umbral_configurado} pts"
        )
        db.add(models.NoConformidad(
            id=nc_id, reporte_id=rid, motivo=motivo, descripcion=desc,
            estado_nc="ABIERTA", retencion_hasta=_retencion("RECHAZADO"),
        ))

    db.commit()
    return {"id": rid, "estado": "BORRADOR", "veredicto": data.veredicto_final}


@app.get("/reportes")
def listar_reportes(
    veredicto: Optional[str] = None,
    proveedor: Optional[str] = None,
    estado_nc: Optional[str] = None,
    limite: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(models.Reporte)
    if veredicto:
        q = q.filter(models.Reporte.veredicto_final == veredicto)
    if proveedor:
        q = q.filter(models.Reporte.proveedor.contains(proveedor))
    rs = q.order_by(models.Reporte.fecha_emision.desc()).limit(limite).all()
    if estado_nc:
        rs = [r for r in rs if r.no_conformidad and r.no_conformidad.estado_nc == estado_nc]
    return {"total": len(rs), "reportes": [_resumen(r) for r in rs]}


@app.get("/reportes/{reporte_id}")
def obtener_reporte(reporte_id: str, db: Session = Depends(get_db)):
    r = db.query(models.Reporte).filter(models.Reporte.id == reporte_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    nc = r.no_conformidad
    return {
        "encabezado": {
            "id_reporte": r.id, "version": r.version,
            "estado_documento": r.estado_documento,
            "fecha_emision": r.fecha_emision.isoformat() if r.fecha_emision else None,
            "generado_por": r.generado_por, "norma_gestion": r.norma_gestion,
        },
        "identificacion": {
            "id_rollo": r.id_rollo, "numero_lote": r.numero_lote,
            "proveedor": r.proveedor, "tipo_tela": r.tipo_tela,
            "ancho_pulgadas": r.ancho_pulgadas, "largo_yardas": r.largo_yardas,
            "fecha_recepcion": r.fecha_recepcion, "fecha_inspeccion": r.fecha_inspeccion,
        },
        "trazabilidad": {
            "inspector": {"id": r.inspector_id, "nombre": r.inspector_nombre, "turno": r.inspector_turno},
            "norma_aplicada": r.norma_aplicada, "umbral_configurado": r.umbral_configurado,
            "configuracion_id": r.configuracion_id, "camara_id": r.camara_id,
            "calibracion_escala": r.calibracion_escala,
            "inicio_inspeccion": r.inicio_inspeccion.isoformat() if r.inicio_inspeccion else None,
            "fin_inspeccion": r.fin_inspeccion.isoformat() if r.fin_inspeccion else None,
            "duracion_minutos": r.duracion_minutos,
        },
        "resultados": {
            "total_defectos_detectados": r.total_defectos_detectados,
            "puntos_totales_astm": r.puntos_totales_astm,
            "score_100yd2": r.score_100yd2,
            "umbral_aplicado": r.umbral_aplicado,
            "rechazo_automatico": r.rechazo_automatico,
            "veredicto_final": r.veredicto_final,
            "confianza_modelo": r.confianza_modelo,
        },
        "defectos": [
            {
                "id_defecto": d.id, "tipo": d.tipo, "tamano_in": d.tamano_in,
                "puntos_asignados": d.puntos_asignados,
                "posicion_rollo_metros": d.posicion_rollo_metros,
                "confianza_deteccion": d.confianza_deteccion,
                "validado_por_inspector": d.validado_por_inspector,
                "accion_tomada": d.accion_tomada,
            }
            for d in r.defectos
        ],
        "no_conformidad": {
            "id_nc": nc.id, "motivo": nc.motivo, "descripcion": nc.descripcion,
            "disposicion": nc.disposicion, "accion_correctiva": nc.accion_correctiva,
            "responsable_ac": nc.responsable_ac,
            "fecha_limite_ac": nc.fecha_limite_ac.isoformat() if nc.fecha_limite_ac else None,
            "estado_nc": nc.estado_nc,
        } if nc else None,
        "firma": {
            "inspector_id": r.firma_inspector_id,
            "timestamp": r.firma_timestamp.isoformat() if r.firma_timestamp else None,
            "accion": r.firma_accion,
            "hash_documento": r.hash_documento,
            "inmutable_desde": r.inmutable_desde.isoformat() if r.inmutable_desde else None,
        },
    }


@app.post("/reportes/{reporte_id}/firmar")
def firmar_reporte(reporte_id: str, data: FirmarReporteInput, db: Session = Depends(get_db)):
    r = db.query(models.Reporte).filter(models.Reporte.id == reporte_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if r.inmutable_desde:
        raise HTTPException(status_code=400, detail="El reporte ya fue firmado y es inmutable")
    now = datetime.utcnow()
    r.firma_inspector_id = data.inspector_id
    r.firma_timestamp = now
    r.firma_accion = "CERRAR_ROLLO"
    r.inmutable_desde = now
    r.estado_documento = "DEFINITIVO"
    r.hash_documento = _hash_reporte(r, r.defectos)
    db.commit()
    return {"hash": r.hash_documento, "timestamp": now.isoformat(), "estado": "DEFINITIVO"}


@app.get("/reportes/{reporte_id}/pdf")
def exportar_pdf(reporte_id: str, db: Session = Depends(get_db)):
    r = db.query(models.Reporte).filter(models.Reporte.id == reporte_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    pdf_bytes = generar_pdf(r, r.defectos, r.no_conformidad)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{reporte_id}.pdf"'},
    )


# ── No Conformidades ──────────────────────────────────────────────────────────
@app.put("/no-conformidades/{nc_id}")
def actualizar_nc(nc_id: str, data: ActualizarNCInput, db: Session = Depends(get_db)):
    nc = db.query(models.NoConformidad).filter(models.NoConformidad.id == nc_id).first()
    if not nc:
        raise HTTPException(status_code=404, detail="No conformidad no encontrada")
    if data.disposicion is not None:
        nc.disposicion = data.disposicion
    if data.accion_correctiva is not None:
        nc.accion_correctiva = data.accion_correctiva
    if data.responsable_ac is not None:
        nc.responsable_ac = data.responsable_ac
    if data.fecha_limite_ac:
        try:
            nc.fecha_limite_ac = datetime.fromisoformat(data.fecha_limite_ac)
        except Exception:
            pass
    db.commit()
    return {"ok": True}


@app.post("/no-conformidades/{nc_id}/cerrar")
def cerrar_nc(nc_id: str, db: Session = Depends(get_db)):
    nc = db.query(models.NoConformidad).filter(models.NoConformidad.id == nc_id).first()
    if not nc:
        raise HTTPException(status_code=404, detail="No conformidad no encontrada")
    if not nc.accion_correctiva or not nc.disposicion:
        raise HTTPException(status_code=400, detail="Complete disposición y acción correctiva antes de cerrar")
    nc.estado_nc = "CERRADA"
    db.commit()
    return {"ok": True, "estado_nc": "CERRADA"}


# ── KPIs ──────────────────────────────────────────────────────────────────────
@app.get("/kpis")
def obtener_kpis(periodo: str = "mes", db: Session = Depends(get_db)):
    delta = {"semana": 7, "mes": 30, "trimestre": 90}.get(periodo, 30)
    inicio = datetime.utcnow() - timedelta(days=delta)

    rs = db.query(models.Reporte).filter(models.Reporte.fecha_emision >= inicio).all()
    total = len(rs)
    aprobados = sum(1 for r in rs if r.veredicto_final == "APROBADO")

    tipo_counts: dict = {}
    proveedor_stats: dict = {}
    for r in rs:
        for d in r.defectos:
            tipo_counts[d.tipo] = tipo_counts.get(d.tipo, 0) + 1
        p = r.proveedor or "Desconocido"
        if p not in proveedor_stats:
            proveedor_stats[p] = {"total": 0, "rechazados": 0, "score_sum": 0.0}
        proveedor_stats[p]["total"] += 1
        proveedor_stats[p]["score_sum"] += r.score_100yd2 or 0
        if r.veredicto_final == "RECHAZADO":
            proveedor_stats[p]["rechazados"] += 1

    nc_ab = db.query(models.NoConformidad).filter(models.NoConformidad.estado_nc == "ABIERTA").count()
    nc_ce = db.query(models.NoConformidad).filter(models.NoConformidad.estado_nc == "CERRADA").count()
    score_prom = sum(r.score_100yd2 or 0 for r in rs) / total if total else 0

    return {
        "periodo": periodo,
        "total_rollos": total,
        "aprobados": aprobados,
        "rechazados": total - aprobados,
        "pct_aprobados": round(aprobados / total * 100, 1) if total else 0,
        "pct_rechazados": round((total - aprobados) / total * 100, 1) if total else 0,
        "score_promedio": round(score_prom, 2),
        "nc_abiertas": nc_ab,
        "nc_cerradas": nc_ce,
        "defectos_por_tipo": [{"tipo": k, "count": v} for k, v in sorted(tipo_counts.items(), key=lambda x: -x[1])],
        "proveedor_stats": [
            {
                "proveedor": k,
                "total": v["total"],
                "rechazados": v["rechazados"],
                "tasa_rechazo": round(v["rechazados"] / v["total"] * 100, 1) if v["total"] else 0,
                "score_promedio": round(v["score_sum"] / v["total"], 2) if v["total"] else 0,
            }
            for k, v in sorted(proveedor_stats.items(), key=lambda x: -x[1]["rechazados"])
        ],
    }


# ── Auditoría ─────────────────────────────────────────────────────────────────
@app.get("/auditoria/buscar")
def buscar_auditoria(
    request: Request,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    id_rollo: Optional[str] = None,
    proveedor: Optional[str] = None,
    inspector: Optional[str] = None,
    veredicto: Optional[str] = None,
    estado_nc: Optional[str] = None,
    usuario_id: str = "USR-000",
    usuario_nombre: str = "Auditor",
    db: Session = Depends(get_db),
):
    q = db.query(models.Reporte)
    if fecha_inicio:
        try:
            q = q.filter(models.Reporte.fecha_emision >= datetime.fromisoformat(fecha_inicio))
        except Exception:
            pass
    if fecha_fin:
        try:
            q = q.filter(models.Reporte.fecha_emision <= datetime.fromisoformat(fecha_fin))
        except Exception:
            pass
    if id_rollo:
        q = q.filter(models.Reporte.id_rollo.contains(id_rollo))
    if proveedor:
        q = q.filter(models.Reporte.proveedor.contains(proveedor))
    if inspector:
        q = q.filter(models.Reporte.inspector_nombre.contains(inspector))
    if veredicto:
        q = q.filter(models.Reporte.veredicto_final == veredicto)

    rs = q.order_by(models.Reporte.fecha_emision.desc()).all()
    if estado_nc:
        rs = [r for r in rs if r.no_conformidad and r.no_conformidad.estado_nc == estado_nc]

    _log_acceso(db, usuario_id, usuario_nombre, "BUSQUEDA_AUDITORIA", "/auditoria/buscar",
                {"id_rollo": id_rollo, "proveedor": proveedor, "veredicto": veredicto},
                request.client.host if request.client else "unknown")
    db.commit()
    return {"total": len(rs), "reportes": [_resumen(r) for r in rs]}


@app.get("/auditoria/logs")
def obtener_logs(limite: int = 100, db: Session = Depends(get_db)):
    logs = db.query(models.LogAcceso).order_by(models.LogAcceso.timestamp.desc()).limit(limite).all()
    return {"logs": [
        {
            "id": l.id, "usuario_id": l.usuario_id, "usuario_nombre": l.usuario_nombre,
            "accion": l.accion, "recurso": l.recurso, "parametros": l.parametros,
            "ip": l.ip, "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        }
        for l in logs
    ]}
