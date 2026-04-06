from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Literal, Optional, Tuple

import numpy as np
import torch

from preprocessing.signals import bandpass_filter, estimate_bpm_from_signal

from .architectures import TemporalTransformerRPPG


ModelPreference = Literal["auto", "temporal_transformer", "physnet"]


def _resolve_checkpoint_state(checkpoint: object) -> dict:
    if isinstance(checkpoint, dict):
        for key in ("state_dict", "model_state_dict", "model", "net", "weights"):
            state_dict = checkpoint.get(key)
            if isinstance(state_dict, dict):
                return state_dict
        if all(isinstance(key, str) for key in checkpoint.keys()):
            return checkpoint
    return {}


def _strip_module_prefix(state_dict: dict) -> dict:
    return {
        key.replace("module.", "", 1) if key.startswith("module.") else key: value
        for key, value in state_dict.items()
    }


@dataclass
class LoadedModel:
    name: str
    model: torch.nn.Module
    checkpoint_path: Optional[Path]
    load_ratio: float
    feature_dim: int

    @property
    def available(self) -> bool:
        return self.load_ratio > 0.1


class RPPGModelManager:
    def __init__(self, model_dir: Optional[Path] = None):
        root_dir = model_dir or Path(__file__).resolve().parents[2] / "models"
        self.device = torch.device("cpu")
        self.temporal_transformer = self._load_model(
            name="temporal_transformer",
            model=TemporalTransformerRPPG(),
            checkpoint_path=root_dir / "transformer_rppg.pth",
        )
        self.secondary_transformer = self._load_model(
            name="checkpoint_transformer",
            model=TemporalTransformerRPPG(),
            checkpoint_path=root_dir / "checkpoint.pth",
        )
        self._fallback_feature_dim = 1

    def _load_model(self, name: str, model: torch.nn.Module, checkpoint_path: Path) -> LoadedModel:
        model = model.to(self.device)
        load_ratio = 0.0
        if checkpoint_path.exists():
            try:
                checkpoint = torch.load(checkpoint_path, map_location="cpu")
                state_dict = _strip_module_prefix(_resolve_checkpoint_state(checkpoint))
                if state_dict:
                    model_state = model.state_dict()
                    matched_keys = set(model_state.keys()) & set(state_dict.keys())
                    load_ratio = len(matched_keys) / max(len(model_state), 1)
                    model.load_state_dict(state_dict, strict=False)
            except Exception:
                load_ratio = 0.0
        model.eval()
        return LoadedModel(
            name=name,
            model=model,
            checkpoint_path=checkpoint_path if checkpoint_path.exists() else None,
            load_ratio=load_ratio,
            feature_dim=getattr(model, "feature_dim", 1),
        )

    def _prepare_tensor(self, feature_matrix: np.ndarray, feature_dim: int) -> torch.Tensor:
        if feature_matrix.ndim != 2:
            feature_matrix = np.asarray(feature_matrix, dtype=np.float32).reshape(-1, 1)
        if feature_dim == 1:
            # Prefer normalized green channel for 1D checkpoint compatibility and illumination robustness.
            if feature_matrix.shape[1] >= 5:
                input_matrix = feature_matrix[:, 4:5]
            else:
                input_matrix = feature_matrix[:, :1]
        else:
            input_matrix = feature_matrix[:, :feature_dim]
        tensor = torch.from_numpy(input_matrix.astype(np.float32)).unsqueeze(0)
        return tensor.to(self.device)

    def _score_waveform(self, waveform: np.ndarray, fps: float) -> float:
        filtered = bandpass_filter(waveform, fps=fps)
        _, confidence, snr = estimate_bpm_from_signal(filtered, fps=fps)
        return float(confidence + 0.2 * np.tanh(snr / 5.0))

    def predict_waveform(
        self,
        feature_matrix: np.ndarray,
        preference: ModelPreference = "auto",
        fps: float = 5.0,
    ) -> Tuple[np.ndarray, str]:
        if preference == "temporal_transformer":
            candidates = [self.temporal_transformer, self.secondary_transformer]
        elif preference == "physnet":
            candidates = [self.secondary_transformer, self.temporal_transformer]
        else:
            candidates = [self.temporal_transformer, self.secondary_transformer]

        ranked_predictions: List[Tuple[float, np.ndarray, str]] = []
        for candidate in candidates:
            if not candidate.available:
                continue
            tensor = self._prepare_tensor(feature_matrix, feature_dim=candidate.feature_dim)
            with torch.no_grad():
                waveform = candidate.model(tensor)
            signal = waveform.squeeze(0).detach().cpu().numpy().astype(np.float32)
            score = self._score_waveform(signal, fps=fps)
            ranked_predictions.append((score, signal, candidate.name))

        if ranked_predictions:
            ranked_predictions.sort(key=lambda item: item[0], reverse=True)
            best_score, best_signal, best_name = ranked_predictions[0]

            if len(ranked_predictions) > 1:
                second_score, second_signal, second_name = ranked_predictions[1]
                fused_signal = (best_signal + second_signal) / 2.0
                fused_score = self._score_waveform(fused_signal, fps=fps)
                if fused_score > best_score + 0.03:
                    return fused_signal, f"{best_name}+{second_name}_fused"

            return best_signal, best_name

        return np.empty((0,), dtype=np.float32), "unavailable_models"