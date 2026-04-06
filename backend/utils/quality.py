from __future__ import annotations


def confidence_to_label(confidence: float, signal_quality: float) -> str:
    score = max(0.0, min(1.0, 0.6 * confidence + 0.4 * signal_quality))
    if score >= 0.75:
        return "good"
    if score >= 0.5:
        return "fair"
    return "low"