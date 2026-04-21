from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import io

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
        "tiene_defecto": tiene_defecto
    }

@app.get("/")
def root():
    return {"status": "ok"}