from __future__ import annotations

from typing import Tuple

import numpy as np
from scipy.signal import butter, detrend, filtfilt, find_peaks


def smooth_signal(signal: np.ndarray, window_size: int = 5) -> np.ndarray:
    if signal.size == 0 or window_size <= 1:
        return signal
    window = np.ones(window_size, dtype=np.float32) / float(window_size)
    return np.convolve(signal, window, mode="same")


def chrom_rppg_signal(rgb_trace: np.ndarray) -> np.ndarray:
    if rgb_trace.ndim != 2 or rgb_trace.shape[0] == 0:
        return np.array([], dtype=np.float32)

    normalized = rgb_trace / (np.sum(rgb_trace, axis=1, keepdims=True) + 1e-8)
    normalized = normalized - np.mean(normalized, axis=0, keepdims=True)

    s1 = 3.0 * normalized[:, 0] - 2.0 * normalized[:, 1]
    s2 = 1.5 * normalized[:, 0] + normalized[:, 1] - 1.5 * normalized[:, 2]
    alpha = np.std(s1) / (np.std(s2) + 1e-8)
    signal = s1 - alpha * s2
    return signal.astype(np.float32)


def build_feature_matrix(rgb_trace: np.ndarray) -> np.ndarray:
    if rgb_trace.ndim != 2 or rgb_trace.shape[0] == 0:
        return np.empty((0, 9), dtype=np.float32)

    raw = rgb_trace.astype(np.float32)
    normalized = raw / (np.sum(raw, axis=1, keepdims=True) + 1e-8)
    chrom = chrom_rppg_signal(raw).reshape(-1, 1)
    deltas = np.vstack([np.zeros((1, raw.shape[1]), dtype=np.float32), np.diff(raw, axis=0)])
    features = np.concatenate([raw, normalized, deltas], axis=1)
    if chrom.shape[0] == features.shape[0]:
        features[:, 0:1] = (features[:, 0:1] + chrom) / 2.0
    return features.astype(np.float32)


def bandpass_filter(signal: np.ndarray, fps: float, low_hz: float = 0.7, high_hz: float = 4.0) -> np.ndarray:
    if signal.size < 8 or fps <= 0:
        return signal.astype(np.float32)

    nyquist = 0.5 * fps
    low = max(low_hz / nyquist, 1e-4)
    high = min(high_hz / nyquist, 0.999)
    if low >= high:
        return signal.astype(np.float32)

    b, a = butter(3, [low, high], btype="band")
    centered = detrend(signal.astype(np.float32), type="linear")
    try:
        filtered = filtfilt(b, a, centered)
    except ValueError:
        filtered = centered
    return filtered.astype(np.float32)


def estimate_bpm_from_signal(signal: np.ndarray, fps: float) -> Tuple[float, float, float]:
    if signal.size < 8 or fps <= 0:
        return 0.0, 0.0, 0.0

    centered = detrend(signal.astype(np.float32), type="linear")
    centered = centered - np.mean(centered)
    if np.allclose(centered, 0.0):
        return 0.0, 0.0, 0.0

    spectrum = np.abs(np.fft.rfft(centered))
    frequencies = np.fft.rfftfreq(centered.size, d=1.0 / fps)
    band_mask = (frequencies >= 0.7) & (frequencies <= 4.0)
    if not np.any(band_mask):
        return 0.0, 0.0, 0.0

    band_frequencies = frequencies[band_mask]
    band_spectrum = spectrum[band_mask]
    peak_index = int(np.argmax(band_spectrum))
    peak_frequency = float(band_frequencies[peak_index])
    peak_power = float(band_spectrum[peak_index])
    band_power = float(np.sum(band_spectrum) + 1e-8)
    median_power = float(np.median(band_spectrum) + 1e-8)

    bpm = peak_frequency * 60.0
    snr = peak_power / (median_power + 1e-8)
    confidence = np.clip((peak_power / band_power) * np.tanh(snr / 4.0), 0.0, 1.0)
    return float(bpm), float(confidence), float(snr)


def signal_quality_score(face_coverage: float, confidence: float, snr: float) -> float:
    coverage_score = np.clip(face_coverage, 0.0, 1.0)
    confidence_score = np.clip(confidence, 0.0, 1.0)
    snr_score = np.clip(np.tanh(snr / 4.0), 0.0, 1.0)
    return float(np.clip(0.35 * coverage_score + 0.4 * confidence_score + 0.25 * snr_score, 0.0, 1.0))


def estimate_respiratory_rate(signal: np.ndarray, fps: float) -> float:
    if signal.size < 16 or fps <= 0:
        return 0.0

    resp_signal = bandpass_filter(signal, fps=fps, low_hz=0.1, high_hz=0.6)
    centered = resp_signal - np.mean(resp_signal)
    if np.allclose(centered, 0.0):
        return 0.0

    spectrum = np.abs(np.fft.rfft(centered))
    frequencies = np.fft.rfftfreq(centered.size, d=1.0 / fps)
    band_mask = (frequencies >= 0.1) & (frequencies <= 0.6)
    if not np.any(band_mask):
        return 0.0

    peak_frequency = float(frequencies[band_mask][int(np.argmax(spectrum[band_mask]))])
    return float(np.clip(peak_frequency * 60.0, 6.0, 30.0))


def estimate_hrv_metrics(signal: np.ndarray, fps: float) -> Tuple[float, float]:
    if signal.size < 24 or fps <= 0:
        return 0.0, 0.0

    heart_signal = bandpass_filter(signal, fps=fps, low_hz=0.7, high_hz=4.0)
    centered = heart_signal - np.mean(heart_signal)
    if np.allclose(centered, 0.0):
        return 0.0, 0.0

    distance = max(int(0.33 * fps), 1)
    peaks, _ = find_peaks(centered, distance=distance)
    if peaks.size < 3:
        return 0.0, 0.0

    rr_intervals_s = np.diff(peaks) / fps
    rr_intervals_ms = rr_intervals_s * 1000.0
    if rr_intervals_ms.size < 2:
        return 0.0, 0.0

    sdnn = float(np.std(rr_intervals_ms))
    rmssd = float(np.sqrt(np.mean(np.diff(rr_intervals_ms) ** 2)))
    return max(sdnn, 0.0), max(rmssd, 0.0)