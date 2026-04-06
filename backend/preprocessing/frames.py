from __future__ import annotations

import base64
import binascii
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

import cv2
import numpy as np

_DATA_URL_PREFIX = re.compile(r"^data:image/[^;]+;base64,")
_FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


@dataclass
class FrameExtractionResult:
    rgb_trace: np.ndarray
    face_coverage: float
    in_frame_coverage: float
    valid_frames: int
    total_frames: int
    no_face_detected: bool
    any_face_detected: bool
    roi_regions: Dict[str, List[float]]
    region_signal_strength: Dict[str, float]


def decode_frame_payload(payload: str) -> np.ndarray:
    raw_payload = _DATA_URL_PREFIX.sub("", payload.strip())
    try:
        binary = base64.b64decode(raw_payload, validate=False)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("One or more frames could not be decoded.") from exc

    image_array = np.frombuffer(binary, dtype=np.uint8)
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("One or more frames could not be decoded into an image.")
    return frame


def decode_frame_payloads(frame_payloads: Sequence[str]) -> List[np.ndarray]:
    if not frame_payloads:
        raise ValueError("At least one frame is required for prediction.")
    return [decode_frame_payload(payload) for payload in frame_payloads]


def _detect_largest_face(frame_bgr: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    faces = _FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.08,
        minNeighbors=3,
        minSize=(36, 36),
    )
    if len(faces) == 0:
        return None
    return max(faces, key=lambda item: item[2] * item[3])


def _extract_face_roi(frame_bgr: np.ndarray, face_box: Tuple[int, int, int, int]) -> np.ndarray:
    x, y, w, h = face_box
    height, width = frame_bgr.shape[:2]

    roi_x1 = max(0, int(x + 0.12 * w))
    roi_y1 = max(0, int(y + 0.08 * h))
    roi_x2 = min(width, int(x + 0.88 * w))
    roi_y2 = min(height, int(y + 0.72 * h))

    roi = frame_bgr[roi_y1:roi_y2, roi_x1:roi_x2]
    if roi.size == 0:
        roi = frame_bgr[y : y + h, x : x + w]
    return roi


def _mean_rgb(roi_bgr: np.ndarray) -> np.ndarray:
    resized = cv2.resize(roi_bgr, (96, 96), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32)
    rgb = np.clip(rgb, 0.0, 255.0)
    return rgb.mean(axis=(0, 1)) / 255.0


def _extract_center_roi(frame_bgr: np.ndarray) -> np.ndarray:
    height, width = frame_bgr.shape[:2]
    roi_w = int(width * 0.45)
    roi_h = int(height * 0.55)
    x1 = max(0, (width - roi_w) // 2)
    y1 = max(0, (height - roi_h) // 2)
    x2 = min(width, x1 + roi_w)
    y2 = min(height, y1 + roi_h)
    roi = frame_bgr[y1:y2, x1:x2]
    if roi.size == 0:
        return frame_bgr
    return roi


def _safe_box(x1: int, y1: int, x2: int, y2: int, width: int, height: int) -> Tuple[int, int, int, int]:
    sx1 = max(0, min(width - 1, x1))
    sy1 = max(0, min(height - 1, y1))
    sx2 = max(sx1 + 1, min(width, x2))
    sy2 = max(sy1 + 1, min(height, y2))
    return sx1, sy1, sx2, sy2


def _build_region_boxes(face_box: Tuple[int, int, int, int], frame_shape: Tuple[int, int, int]) -> Dict[str, Tuple[int, int, int, int]]:
    x, y, w, h = face_box
    height, width = frame_shape[:2]

    return {
        "forehead": _safe_box(
            int(x + 0.24 * w),
            int(y + 0.06 * h),
            int(x + 0.76 * w),
            int(y + 0.24 * h),
            width,
            height,
        ),
        "left_cheek": _safe_box(
            int(x + 0.10 * w),
            int(y + 0.42 * h),
            int(x + 0.40 * w),
            int(y + 0.74 * h),
            width,
            height,
        ),
        "right_cheek": _safe_box(
            int(x + 0.60 * w),
            int(y + 0.42 * h),
            int(x + 0.90 * w),
            int(y + 0.74 * h),
            width,
            height,
        ),
    }


def _normalize_box(box: Tuple[int, int, int, int], frame_shape: Tuple[int, int, int]) -> List[float]:
    height, width = frame_shape[:2]
    x1, y1, x2, y2 = box
    return [
        round(x1 / max(width, 1), 4),
        round(y1 / max(height, 1), 4),
        round((x2 - x1) / max(width, 1), 4),
        round((y2 - y1) / max(height, 1), 4),
    ]


def _extract_region_mean_rgb(frame_bgr: np.ndarray, region_box: Tuple[int, int, int, int]) -> np.ndarray:
    x1, y1, x2, y2 = region_box
    roi = frame_bgr[y1:y2, x1:x2]
    if roi.size == 0:
        return np.zeros(3, dtype=np.float32)
    return _mean_rgb(roi)


def _is_point_inside_scan_oval(px: float, py: float) -> bool:
    # Match frontend scan oval geometry.
    cx, cy = 0.5, 0.52
    a, b = 0.36, 0.28
    value = ((px - cx) / a) ** 2 + ((py - cy) / b) ** 2
    return value <= 1.0


def _face_fit_score(face_box: Tuple[int, int, int, int], frame_shape: Tuple[int, int, int]) -> float:
    x, y, w, h = face_box
    height, width = frame_shape[:2]
    if width <= 0 or height <= 0:
        return 0.0

    cx = (x + 0.5 * w) / max(width, 1)
    cy = (y + 0.5 * h) / max(height, 1)
    face_h_ratio = h / max(height, 1)
    face_w_ratio = w / max(width, 1)
    face_area_ratio = (w * h) / max(width * height, 1)

    # Relaxed central window to account for camera crop/object-fit mismatch.
    center_x_ok = 0.16 <= cx <= 0.84
    center_y_ok = 0.16 <= cy <= 0.90
    size_ok = 0.09 <= face_h_ratio <= 0.80 and 0.08 <= face_w_ratio <= 0.75 and face_area_ratio >= 0.018

    if not size_ok:
        return 0.0

    base_score = 1.0 if (center_x_ok and center_y_ok) else 0.0
    soft_score = 1.0 - min(abs(cx - 0.5) / 0.5, 1.0) * 0.4 - min(abs(cy - 0.55) / 0.55, 1.0) * 0.4
    return max(0.0, min(1.0, 0.45 * base_score + 0.55 * soft_score))


def extract_rgb_trace(frames_bgr: Sequence[np.ndarray]) -> FrameExtractionResult:
    rgb_values: List[np.ndarray] = []
    green_by_region: Dict[str, List[float]] = {
        "forehead": [],
        "left_cheek": [],
        "right_cheek": [],
    }
    latest_roi_regions: Dict[str, List[float]] = {}
    any_face_detected = False
    in_frame_detected_frames = 0

    for frame_bgr in frames_bgr:
        face_box = _detect_largest_face(frame_bgr)
        if face_box is None:
            continue

        any_face_detected = True

        fit_score = _face_fit_score(face_box, frame_bgr.shape)
        if fit_score < 0.30:
            continue

        in_frame_detected_frames += 1
        region_boxes = _build_region_boxes(face_box, frame_bgr.shape)
        latest_roi_regions = {
            region_name: _normalize_box(region_box, frame_bgr.shape)
            for region_name, region_box in region_boxes.items()
        }

        forehead = _extract_region_mean_rgb(frame_bgr, region_boxes["forehead"])
        left_cheek = _extract_region_mean_rgb(frame_bgr, region_boxes["left_cheek"])
        right_cheek = _extract_region_mean_rgb(frame_bgr, region_boxes["right_cheek"])

        green_by_region["forehead"].append(float(forehead[1]))
        green_by_region["left_cheek"].append(float(left_cheek[1]))
        green_by_region["right_cheek"].append(float(right_cheek[1]))

        composite_rgb = 0.45 * forehead + 0.275 * left_cheek + 0.275 * right_cheek
        rgb_values.append(composite_rgb.astype(np.float32))

    total_frames = len(frames_bgr)
    valid_frames = len(rgb_values)
    face_coverage = valid_frames / max(total_frames, 1)
    in_frame_coverage = in_frame_detected_frames / max(total_frames, 1)

    region_signal_strength = {
        region_name: round(float(np.std(np.asarray(values, dtype=np.float32))), 4) if values else 0.0
        for region_name, values in green_by_region.items()
    }

    if valid_frames == 0:
        return FrameExtractionResult(
            rgb_trace=np.empty((0, 3), dtype=np.float32),
            face_coverage=0.0,
            in_frame_coverage=in_frame_coverage,
            valid_frames=0,
            total_frames=total_frames,
            no_face_detected=True,
            any_face_detected=any_face_detected,
            roi_regions={},
            region_signal_strength={
                "forehead": 0.0,
                "left_cheek": 0.0,
                "right_cheek": 0.0,
            },
        )

    return FrameExtractionResult(
        rgb_trace=np.asarray(rgb_values, dtype=np.float32),
        face_coverage=face_coverage,
        in_frame_coverage=in_frame_coverage,
        valid_frames=valid_frames,
        total_frames=total_frames,
        no_face_detected=False,
        any_face_detected=any_face_detected,
        roi_regions=latest_roi_regions,
        region_signal_strength=region_signal_strength,
    )