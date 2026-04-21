# LidxiScan — Inspector de Defectos en Telas con IA

## Descripción
App web para detección automática de defectos en telas usando YOLOv8.
Desarrollado como práctica para HackaTec 2025 (Reto 5: Software Inteligente).

## Stack
- **Frontend:** Next.js (app/page.tsx), Tailwind CSS
- **Backend:** FastAPI + Ultralytics YOLOv8, Python
- **Modelo:** YOLOv8n-cls entrenado con 94.2% accuracy, 6 clases

## Estructura del proyecto
fabric-defect-detector/
├── backend/
│   ├── main.py                    # FastAPI server
│   └── fabric_defect_model.pt     # Modelo entrenado (no en git)
└── frontend/
    └── app/page.tsx               # Página principal

## Backend
- Corre en: http://localhost:8000
- Endpoint: POST /analizar
- Recibe: imagen (multipart/form-data, campo "file")
- Devuelve:
{
  "defecto": "Horizontal | Vertical | Agujero | Líneas | Mancha | Sin defecto",
  "confianza": 99.33,
  "tiene_defecto": true
}

## Clases del modelo
- 0: Vertical
- 1: Sin defecto
- 2: Horizontal
- 3: Agujero
- 4: Líneas
- 5: Mancha

## Comandos para levantar el proyecto

Backend:
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

Frontend:
cd frontend
npm run dev

## Flujo de la app
1. Usuario abre la app en el navegador (PC o celular)
2. Sube una foto de tela O activa el modo en vivo con la cámara
3. La imagen se manda al backend via POST /analizar
4. El modelo YOLOv8 clasifica el defecto
5. Se muestra el resultado con nombre del defecto y porcentaje de confianza
6. En modo en vivo: análisis automático cada 2 segundos con alerta de sonido si hay defecto

## Contexto del hackathon
- Evento: HackaTec 2025 — TecNM Etapa Local
- Reto: 5 - Software Inteligente
- Temáticas posibles: Inteligencia Artificial o Aprendizaje Automático
- Tiempo: 18-24 horas
- Equipo: 4 de sistemas + 1 de industrial
- Plataforma asignada: Web (Next.js) o Móvil (Flutter) — se decide el día del evento

## Notas importantes
- El modelo funciona mejor con imágenes de tela plana y bien iluminada
- Confianza baja (menos de 70%) indica imagen fuera de distribución del dataset
- El archivo .pt no está en git — guardarlo en Drive o carpeta local
- Para el demo usar imágenes similares al dataset de entrenamiento
- Dataset original: Fabric Defects Dataset (Kaggle, nexuswho), licencia CC 4.0