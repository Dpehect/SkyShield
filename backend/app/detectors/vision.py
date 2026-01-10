import asyncio
from typing import AsyncGenerator
from ..schemas import DetectionCreate
import random
import time

class VisionDetector:
    def __init__(self, model=None):
        self.model = model
        self._running = False

    async def start(self):
        self._running = True
        # placeholder loop: in a real integration this would hook into camera frames
        while self._running:
            await asyncio.sleep(2.0)
            det = DetectionCreate(
                id=f"vision-{int(time.time()*1000)%100000}",
                source='vision',
                x=random.uniform(-0.8,0.8),
                y=random.uniform(-0.8,0.8),
                r=0.04,
                label='object',
                threat=False,
            )
            yield det

    async def stop(self):
        self._running = False
