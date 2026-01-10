import asyncio
import random
import time
from typing import Optional, Any
from ..services.detection_service import DetectionService

class Simulator:
    def __init__(self, pub: Optional[DetectionService] = None, broadcaster: Optional[Any] = None):
        self._queue = asyncio.Queue()
        self._running = True
        self._pub = pub
        self._broadcaster = broadcaster

    async def _pub_raw(self, raw: dict):
        if self._pub:
            try:
                self._pub.persist_from_raw(raw)
            except Exception:
                pass

    async def _broadcast(self, raw: dict):
        if self._broadcaster:
            try:
                await self._broadcaster.broadcast(raw)
            except Exception:
                pass

    async def run(self):
        await asyncio.sleep(0.3)
        big = {
            "id": "intruder-1",
            "source": "sim",
            "x": 0.35,
            "y": 0.5,
            "r": 0.12,
            "rssi": -18,
            "alt": 120.5,
            "label": "Unidentified UAV",
            "threat": True,
            "ts": time.time(),
        }
        await self._queue.put(big)
        await self._pub_raw(big)
        await self._broadcast(big)

        for i in range(4):
            tid = f"intruder-1-echo-{i}"
            msg = {
                "id": tid,
                "source": "sim",
                "x": big["x"] + random.uniform(-0.08, 0.08),
                "y": big["y"] + random.uniform(-0.08, 0.08),
                "r": random.uniform(0.03, 0.06),
                "rssi": random.uniform(-70, -30),
                "alt": big["alt"] + random.uniform(-10, 10),
                "label": "echo",
                "threat": False,
                "ts": time.time(),
            }
            await self._queue.put(msg)
            await self._pub_raw(msg)
            await self._broadcast(msg)

        await asyncio.sleep(1.0)

        targets = {}
        for i in range(6):
            tid = f"sim-{i}"
            targets[tid] = {
                "id": tid,
                "source": "sim",
                "x": random.uniform(-0.9, 0.9),
                "y": random.uniform(-0.9, 0.9),
                "r": random.uniform(0.02, 0.08),
                "rssi": random.uniform(-90, -30),
                "alt": random.uniform(5, 200),
                "label": "unknown",
                "ts": time.time(),
            }
        while self._running:
            for t in list(targets.values()):
                t['x'] += random.uniform(-0.02, 0.02)
                t['y'] += random.uniform(-0.02, 0.02)
                t['x'] = max(-1.0, min(1.0, t['x']))
                t['y'] = max(-1.0, min(1.0, t['y']))
                t['rssi'] += random.uniform(-1.5, 1.5)
                t['ts'] = time.time()
                await self._queue.put({**t})
                await self._pub_raw(t)
                await self._broadcast(t)
            await asyncio.sleep(0.5)

    async def subscribe(self):
        while True:
            msg = await self._queue.get()
            yield msg

    def stop(self):
        self._running = False