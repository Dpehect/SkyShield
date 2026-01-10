from ..schemas import DetectionCreate, Detection
from time import time
from loguru import logger
from typing import List, Dict, Any

class DetectionService:
    def __init__(self):
        self._store: List[Detection] = []

    def persist(self, payload: DetectionCreate) -> Detection:
        data = payload.dict()
        data['ts'] = time()
        det = Detection(**data)
        self._store.append(det)
        logger.info(f"Persisted detection {det.id} source={det.source} rssi={det.rssi}")
        return det

    def persist_from_raw(self, raw: Dict[str, Any]) -> Detection:
        base = {k: v for k, v in raw.items() if k in DetectionCreate.__fields__}
        payload = DetectionCreate(**base)
        return self.persist(payload)

    def list_recent(self, limit: int = 100):
        return list(reversed(self._store))[:limit]

    def clear(self):
        self._store.clear()
