from pydantic import BaseModel, Field
from typing import Literal

class DetectionBase(BaseModel):
    id: str
    source: Literal['vision','rf','sim','other'] = 'other'
    x: float = Field(..., ge=-1.0, le=1.0)
    y: float = Field(..., ge=-1.0, le=1.0)
    r: float | None = None
    rssi: float | None = None
    alt: float | None = None
    label: str | None = None
    threat: bool = False

class DetectionCreate(DetectionBase):
    pass

class Detection(DetectionBase):
    ts: float

    class Config:
        orm_mode = True
