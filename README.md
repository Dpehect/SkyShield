# SkyShield (Passive Detection & Radar UI)

**Disclaimer:** This project is *defensive and passive only*. It **does not** include active interference (de-auth, jamming, or any offensive attacks). Use it only where you have legal authorization to monitor radio and visual signals. The maintainers are not responsible for misuse.

## Project goal
A modular, professional scaffold that runs on a small single-board device (Raspberry Pi or similar) and displays a live radar UI on a connected HDMI monitor. The demo includes a simulated live data feed so you can see a real-time radar on startup; later you can plug in camera or RF sniffer modules.

## Quick start (development)
1. Create a Python venv.
   - Windows (PowerShell):
     - python -m venv .venv
     - .venv\Scripts\Activate.ps1
     - pip install -r backend\requirements.txt
   - Linux/macOS:
     - python -m venv .venv
     - source .venv/bin/activate
     - pip install -r backend/requirements.txt
2. Run the backend:
   - uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   - or use the provided helper scripts: `run_dev.bat` (Windows) or `run_dev.sh` (Linux/macOS)
   - or run the convenience script: `python start_demo.py` (will launch server and open browser)
3. Open the frontend:
   - On the device (or connected HDMI monitor) open a browser to `http://localhost:8000`
   - For kiosk mode on a Raspberry Pi, use Chromium:
     - `chromium-browser --kiosk http://localhost:8000 --incognito --noerrdialogs`
4. Notes:
   - The backend serves the primary frontend, but you can also run a **pure-frontend standalone demo** that does not require Python or any server.
   - Open `frontend/static/standalone.html` directly in a browser (double-click the file or serve the `frontend/static/` folder with a static server). This demo uses only HTML, CSS (Bootstrap) and JS and shows a military-style animated radar with a locked demo target.
   - For an easy demo server and automatic browser launch, you can run the frontend via Node.js:
     - cd frontend
     - npm install
     - npm start
   - The main `index.html` will still connect to the backend when available; `standalone.html` is the file to use for an offline, presentation-ready screen.


## Structure
- `backend/` — FastAPI app, WebSocket, simulator and (stub) detector hooks
- `frontend/` — static files: an HTML5 Canvas radar UI with live demo
- `detector/` — stubs & guidelines for vision (YOLOv10/OpenCV) and RF sniffing (passive only)

## Next steps
- Integrate real YOLOv10 model (GPU recommended) for camera-based detection
- Implement passive RF capture plug-in (only monitor mode) with strict legal checks
- Add CI, tests, Docker, and deployment guides

---
*See `docs/` for compliance checklist and deployment details (TODO).* 

---

Yunus Emre Gurlek tarafından yapılmışıtırı
