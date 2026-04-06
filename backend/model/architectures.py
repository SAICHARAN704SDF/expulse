from __future__ import annotations

import torch
from torch import nn


class TemporalTransformerRPPG(nn.Module):
    def __init__(
        self,
        feature_dim: int = 1,
        hidden_dim: int = 32,
        num_layers: int = 2,
        num_heads: int = 4,
        ff_dim: int = 2048,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.feature_dim = feature_dim
        self.embedding = nn.Linear(feature_dim, hidden_dim)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=num_heads,
            dim_feedforward=ff_dim,
            dropout=dropout,
            batch_first=True,
            activation="relu",
            norm_first=False,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.fc = nn.Linear(hidden_dim, 1)

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        hidden = self.embedding(features)
        hidden = self.transformer(hidden)
        waveform = self.fc(hidden)
        return waveform.squeeze(-1)


class PhysNetFallbackRPPG(nn.Module):
    def __init__(self, feature_dim: int = 9, hidden_dim: int = 64):
        super().__init__()
        self.network = nn.Sequential(
            nn.Conv1d(feature_dim, hidden_dim, kernel_size=5, padding=2),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True),
            nn.Conv1d(hidden_dim, hidden_dim, kernel_size=5, padding=2),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True),
            nn.Conv1d(hidden_dim, hidden_dim // 2, kernel_size=3, padding=1),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.ReLU(inplace=True),
            nn.Conv1d(hidden_dim // 2, 1, kernel_size=1),
        )

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        signal = self.network(features.transpose(1, 2))
        return signal.squeeze(1)