from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock
from typing import Deque, Dict, List

import numpy as np

from model.loader import ModelPreference, RPPGModelManager
from preprocessing.frames import decode_frame_payloads, extract_rgb_trace
from preprocessing.signals import (
    bandpass_filter,
    build_feature_matrix,
    estimate_bpm_from_signal,
    estimate_hrv_metrics,
    estimate_respiratory_rate,
    signal_quality_score,
    smooth_signal,
)

from .quality import confidence_to_label


@dataclass
class SessionState:
    rgb_trace: Deque[np.ndarray] = field(default_factory=lambda: deque(maxlen=180))
    bpm_history: Deque[float] = field(default_factory=lambda: deque(maxlen=3))
    updated_at: datetime = field(default_factory=datetime.utcnow)


class RPPGSessionStore:
    def __init__(self):
        self._sessions: Dict[str, SessionState] = {}
        self._lock = Lock()

    def reset(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def append_trace(self, session_id: str, rgb_trace: np.ndarray) -> SessionState:
        with self._lock:
            state = self._sessions.setdefault(session_id, SessionState())
            for row in rgb_trace:
                state.rgb_trace.append(np.asarray(row, dtype=np.float32))
            state.updated_at = datetime.utcnow()
            return state

    def get_trace(self, session_id: str) -> np.ndarray:
        with self._lock:
            state = self._sessions.get(session_id)
            if not state or not state.rgb_trace:
                return np.empty((0, 3), dtype=np.float32)
            return np.asarray(list(state.rgb_trace), dtype=np.float32)

    def update_bpm_history(self, session_id: str, bpm: float) -> float:
        with self._lock:
            state = self._sessions.setdefault(session_id, SessionState())
            state.bpm_history.append(float(bpm))
            state.updated_at = datetime.utcnow()
            if not state.bpm_history:
                return float(bpm)

            # Keep output responsive while still dampening one-frame spikes.
            if len(state.bpm_history) == 1:
                return float(state.bpm_history[-1])

            prev_mean = float(np.mean(list(state.bpm_history)[:-1]))
            current = float(state.bpm_history[-1])
            return 0.65 * current + 0.35 * prev_mean

    def get_last_bpm(self, session_id: str) -> float | None:
        with self._lock:
            state = self._sessions.get(session_id)
            if not state or not state.bpm_history:
                return None
            return float(state.bpm_history[-1])


class RPPGPipeline:
    def __init__(self):
        self.models = RPPGModelManager()
        self.sessions = RPPGSessionStore()

    @staticmethod
    def _estimate_candidate(signal: np.ndarray, fps: float):
        filtered = bandpass_filter(signal, fps=fps)
        bpm, confidence, snr = estimate_bpm_from_signal(filtered, fps=fps)
        return bpm, confidence, snr, filtered

    def predict(
        self,
        session_id: str,
        frame_payloads: List[str],
        fps: float,
        model_preference: ModelPreference = "auto",
        reset_session: bool = False,
    ):
        if reset_session:
            self.sessions.reset(session_id)

        frames = decode_frame_payloads(frame_payloads)
        extraction = extract_rgb_trace(frames)
        if extraction.no_face_detected:
            from schemas import RPPGPredictResponse

            if extraction.any_face_detected:
                warning = "Face detected but outside the blue frame. Align face fully inside the oval."
                model_used = "face_out_of_frame"
            else:
                warning = "Face not detected. No vitals are computed until your face is visible."
                model_used = "no_face"

            return RPPGPredictResponse(
                bpm=0.0,
                respiratory_rate=0.0,
                sdnn_ms=0.0,
                rmssd_ms=0.0,
                confidence=0.0,
                signal_quality=0.0,
                quality_label="low",
                model_used=model_used,
                face_detected=extraction.any_face_detected,
                face_in_frame=False,
                in_frame_coverage=round(float(extraction.in_frame_coverage), 3),
                roi_regions={},
                region_signal_strength=extraction.region_signal_strength,
                frames_received=len(frame_payloads),
                frames_used=0,
                timestamp=datetime.utcnow(),
                warning=warning,
            )

        self.sessions.append_trace(session_id, extraction.rgb_trace)
        accumulated_trace = self.sessions.get_trace(session_id)
        if accumulated_trace.size == 0:
            raise ValueError("No usable face frames were extracted from the submitted batch.")

        window_size = min(len(accumulated_trace), 96)
        if window_size < 12:
            raise ValueError("Not enough usable frames yet. Capture a few more seconds and try again.")

        window_trace = accumulated_trace[-window_size:]
        feature_matrix = build_feature_matrix(window_trace)
        model_signal, model_used = self.models.predict_waveform(
            feature_matrix,
            preference=model_preference,
            fps=fps,
        )
        if model_signal.size == 0 or model_used == "unavailable_models":
            from schemas import RPPGPredictResponse

            return RPPGPredictResponse(
                bpm=0.0,
                respiratory_rate=0.0,
                sdnn_ms=0.0,
                rmssd_ms=0.0,
                confidence=0.0,
                signal_quality=0.0,
                quality_label="low",
                model_used="unavailable_models",
                face_detected=True,
                face_in_frame=True,
                in_frame_coverage=round(float(extraction.in_frame_coverage), 3),
                roi_regions=extraction.roi_regions,
                region_signal_strength=extraction.region_signal_strength,
                frames_received=len(frame_payloads),
                frames_used=window_size,
                timestamp=datetime.utcnow(),
                warning="Trained model checkpoints are unavailable or incompatible.",
            )

        model_smoothed = smooth_signal(model_signal.astype(np.float32), window_size=5)
        bpm, confidence, snr, filtered_signal = self._estimate_candidate(model_smoothed, fps=fps)

        def _valid_bpm(value: float) -> bool:
            return 40.0 <= value <= 180.0

        if not _valid_bpm(bpm):
            bpm = 0.0
            confidence = 0.0
            snr = 0.0
            filtered_signal = np.zeros_like(model_smoothed, dtype=np.float32)
            model_used = f"{model_used}_invalid"

        quality_score = signal_quality_score(extraction.face_coverage, confidence, snr)

        # Keep strictness around geometric validity, but avoid suppressing all low-amplitude real signals.
        min_face_coverage = 0.22
        if bpm > 0.0 and extraction.face_coverage < min_face_coverage:
            bpm = 0.0
            confidence = 0.0
            snr = 0.0
            filtered_signal = np.zeros_like(filtered_signal, dtype=np.float32)
            model_used = f"{model_used}_low_fidelity"
            quality_score = 0.0

        respiratory_rate = estimate_respiratory_rate(filtered_signal, fps=fps) if bpm > 0.0 else 0.0
        sdnn_ms, rmssd_ms = estimate_hrv_metrics(filtered_signal, fps=fps) if bpm > 0.0 else (0.0, 0.0)
        bpm_smoothed = self.sessions.update_bpm_history(session_id, bpm) if bpm > 0.0 else 0.0
        quality_label = confidence_to_label(confidence, quality_score)

        warning = None
        if bpm <= 0.0:
            warning = "No valid vitals computed from trained model. Keep forehead and cheeks visible and steady."
        elif quality_label == "low":
            warning = "Signal quality is low. Reduce movement, improve lighting, and keep your face fully visible."

        from schemas import RPPGPredictResponse

        return RPPGPredictResponse(
            bpm=round(float(bpm_smoothed), 1),
            respiratory_rate=round(float(respiratory_rate), 1),
            sdnn_ms=round(float(sdnn_ms), 1),
            rmssd_ms=round(float(rmssd_ms), 1),
            confidence=round(float(confidence), 3),
            signal_quality=round(float(quality_score), 3),
            quality_label=quality_label,
            model_used=model_used,
            face_detected=True,
            face_in_frame=True,
            in_frame_coverage=round(float(extraction.in_frame_coverage), 3),
            roi_regions=extraction.roi_regions,
            region_signal_strength=extraction.region_signal_strength,
            frames_received=len(frame_payloads),
            frames_used=window_size,
            timestamp=datetime.utcnow(),
            warning=warning,
        )