from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AnalysisResponse(BaseModel):
    id: int
    heart_rate: float
    oxygen_level: float
    stress_level: float
    respiratory_rate: float
    blood_pressure_systolic: int
    blood_pressure_diastolic: int
    health_score: int
    risk_level: str
    analysis_date: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    timestamp: Optional[datetime] = None


class RPPGPredictRequest(BaseModel):
    session_id: str
    frames: List[str]
    fps: float = 5.0
    model_preference: Literal["auto", "temporal_transformer", "physnet"] = "auto"
    reset_session: bool = False


class RPPGPredictResponse(BaseModel):
    bpm: float
    respiratory_rate: float
    sdnn_ms: float
    rmssd_ms: float
    confidence: float
    signal_quality: float
    quality_label: str
    model_used: str
    face_detected: bool
    face_in_frame: bool
    in_frame_coverage: float
    roi_regions: Dict[str, List[float]] = Field(default_factory=dict)
    region_signal_strength: Dict[str, float] = Field(default_factory=dict)
    frames_received: int
    frames_used: int
    timestamp: datetime
    warning: Optional[str] = None
