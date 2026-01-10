# SkyShield (Passive Detection & Radar UI)

**Disclaimer:** This project is *defensive and passive only*. It **does not** include active interference (de-auth, jamming, or any offensive attacks). Use it only where you have legal authorization to monitor radio and visual signals. The maintainers are not responsible for misuse.

## Project goal
A modular, professional scaffold that runs on a small single-board device (Raspberry Pi or similar) and displays a live radar UI on a connected HDMI monitor. The demo includes a simulated live data feed so you can see a real-time radar on startup; later you can plug in camera or RF sniffer modules.


## Structure
- `backend/` — FastAPI app, WebSocket, simulator and (stub) detector hooks
- `frontend/` — static files: an HTML5 Canvas radar UI with live demo
- `detector/` — stubs & guidelines for vision (YOLOv10/OpenCV) and RF sniffing (passive only)

## Next steps
- Integrate real YOLOv10 model (GPU recommended) for camera-based detection
- Implement passive RF capture plug-in (only monitor mode) with strict legal checks
- Add CI, tests, Docker, and deployment guides



