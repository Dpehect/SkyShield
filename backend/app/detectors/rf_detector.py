import asyncio
from typing import AsyncGenerator
from ..schemas import DetectionCreate
import os
import time
import random
from loguru import logger

class PassiveRFDetector:
    def __init__(self, iface: str | None = None):
        self.iface = iface
        self._running = False

    async def start(self) -> AsyncGenerator[DetectionCreate, None]:
        if os.environ.get('ENABLE_RF', '').lower() not in ('1','true','yes'):
            logger.warning('PassiveRFDetector disabled. Set ENABLE_RF=1 to enable.')
            return
        if os.environ.get('CONFIRM_LEGAL', '').lower() not in ('1','true','yes'):
            logger.warning('PassiveRFDetector requires CONFIRM_LEGAL=1 to run.')
            return
        self._running = True
        while self._running:
            await asyncio.sleep(1.5)
            det = DetectionCreate(
                id=f"rf-{int(time.time()*1000)%100000}",
                source='rf',
                x=random.uniform(-0.9,0.9),
                y=random.uniform(-0.9,0.9),
                r=0.03,
                rssi=random.uniform(-95,-30),
                label='rf-beacon',
                threat=False,
            )
            yield det

    async def stop(self):
        self._running = False
