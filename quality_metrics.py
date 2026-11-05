"""Objective metrics for paired, time-aligned speaker-separation evaluation.

These metrics require clean reference stems. They do not run separation and
must be computed before silence compaction or any time-changing post-process.
"""
from __future__ import annotations

from typing import Any

import numpy as np


def _mono_finite(audio: np.ndarray, name: str) -> np.ndarray:
    value = np.asarray(audio, dtype=np.float64)
    if value.ndim == 0:
        raise ValueError(f"{name} must contain at least one audio sample.")
    if value.ndim == 2:
        # Accept [samples, channels] and downmix consistently for scoring.
        value = np.mean(value, axis=1)
    elif value.ndim != 1:
        raise ValueError(f"{name} must be mono or [samples, channels].")
    if value.size == 0:
        raise ValueError(f"{name} must not be empty.")
    if not np.isfinite(value).all():
        raise ValueError(f"{name} contains NaN or infinite samples.")
    return value - np.mean(value)


def si_sdr(reference: np.ndarray, estimate: np.ndarray) -> float:
    """Scale-invariant SDR in dB for equal-length, aligned signals."""
    ref = _mono_finite(reference, "reference")
    est = _mono_finite(estimate, "estimate")
    if ref.shape != est.shape:
        raise ValueError("reference and estimate must have equal sample counts; align them first.")
    ref_energy = float(np.dot(ref, ref))
    if ref_energy <= np.finfo(np.float64).eps:
        raise ValueError("reference signal has zero energy; SI-SDR is undefined.")
    scale = float(np.dot(est, ref) / ref_energy)
    target_projection = scale * ref
    residual = est - target_projection
    target_energy = float(np.dot(target_projection, target_projection))
    residual_energy = float(np.dot(residual, residual))
    if target_energy <= np.finfo(np.float64).tiny:
        return -300.0
    # Relative floor avoids infinite SI-SDR for numerically perfect estimates
    # and keeps JSON reports finite and portable.
    residual_floor = target_energy * 1e-15
    return float(10.0 * np.log10(target_energy / max(residual_energy, residual_floor)))


def evaluate_separation(
    target_reference: np.ndarray,
    estimate: np.ndarray,
    mixture: np.ndarray,
    *,
    interference_reference: np.ndarray | None = None,
    sample_rate: int,
) -> dict[str, Any]:
    """Score a separated target against aligned clean references.

    Do not pass compacted audio: all inputs must describe the same time axis.
    """
    if not isinstance(sample_rate, int) or sample_rate <= 0:
        raise ValueError("sample_rate must be a positive integer.")
    target = _mono_finite(target_reference, "target_reference")
    separated = _mono_finite(estimate, "estimate")
    mixed = _mono_finite(mixture, "mixture")
    if target.shape != separated.shape or target.shape != mixed.shape:
        raise ValueError("target_reference, estimate and mixture must be equal-length and time-aligned.")
    target_score = si_sdr(target, separated)
    mixture_score = si_sdr(target, mixed)
    result: dict[str, Any] = {
        "sample_rate": sample_rate,
        "samples_scored": int(target.size),
        "duration_sec": round(target.size / sample_rate, 6),
        "si_sdr_db": round(target_score, 4),
        "mixture_si_sdr_db": round(mixture_score, 4),
        "si_sdri_db": round(target_score - mixture_score, 4),
        "alignment_required": True,
        "compaction_applied": False,
    }
    if interference_reference is not None:
        interference = _mono_finite(interference_reference, "interference_reference")
        if interference.shape != target.shape:
            raise ValueError("interference_reference must be equal-length and time-aligned.")
        result["interference_si_sdr_db"] = round(si_sdr(interference, separated), 4)
        result["target_vs_interference_score_gap_db"] = round(
            target_score - result["interference_si_sdr_db"], 4
        )
    return result
