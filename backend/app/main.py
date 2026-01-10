from fastapi import FastAPI, WebSocket, APIRouter, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import asyncio
from .simulator import Simulator
from .ws_manager import WebSocketManager
from .services.detection_service import DetectionService
from .schemas import DetectionCreate
from .config import settings
from .logging_config import logger

app = FastAPI(title="SkyShield Backend")
app.mount("", StaticFiles(directory="../frontend/static", html=True), name="static")

router = APIRouter(prefix="/api")
ws_mgr = WebSocketManager()
det_svc = DetectionService()
sim = Simulator(pub=det_svc, broadcaster=ws_mgr)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(sim.run())
    asyncio.create_task(_health_blink())

async def _health_blink():
    while True:
        await asyncio.sleep(30)
        try:
            await ws_mgr.broadcast({"type":"heartbeat","ts":__import__('time').time()})
        except Exception:
            pass

@router.post('/detections', status_code=201)
async def post_detection(payload: DetectionCreate):
    det = det_svc.persist(payload)
    await ws_mgr.broadcast(det.dict())
    return det

@app.get('/health')
async def health():
    return {"status": "ok"}

@app.websocket('/ws')
async def websocket_endpoint(ws: WebSocket):
    await ws_mgr.connect(ws)
    try:
        while True:
            await asyncio.sleep(3600)
    finally:
        await ws_mgr.disconnect(ws)

app.include_router(router)
