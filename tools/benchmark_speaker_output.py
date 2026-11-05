"""Aligned, reference-based benchmark for target-speaker separation outputs.

Run this BEFORE compacting/removing silence:
python tools/benchmark_speaker_output.py --mixture mix.wav --target-reference target.wav --estimate candidate.wav
Optionally add --interferer-reference other.wav.

All files must share the same sample rate and aligned source timeline. The tool
intentionally refuses silent-gap-compacted outputs because they are not aligned
to the clean reference without an edit-decision-list-aware evaluator.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import soundfile as sf


def _mono(samples: np.ndarray) -> np.ndarray:
    x = np.asarray(samples, dtype=np.float64)
    if x.ndim == 2:
        x = np.mean(x, axis=1)
    if x.ndim != 1 or not np.isfinite(x).all():
        raise ValueError("Audio must be finite mono or multi-channel samples.")
    return x


def si_sdr(reference: np.ndarray, estimate: np.ndarray) -> float:
    """Scale-invariant SDR in dB; higher is better."""
    ref = _mono(reference)
    est = _mono(estimate)
    if len(ref) != len(est):
        raise ValueError("Reference and estimate must have identical aligned lengths.")
    ref = ref - np.mean(ref)
    est = est - np.mean(est)
    energy = float(np.dot(ref, ref))
    if energy <= 1e-15:
        raise ValueError("Reference contains no usable signal energy.")
    projection = (float(np.dot(est, ref)) / energy) * ref
    residual = est - projection
    target_power = float(np.dot(projection, projection))
    residual_power = float(np.dot(residual, residual))
    return float(10.0 * np.log10(max(target_power, 1e-15) / max(residual_power, 1e-15)))


def _load(path: Path) -> tuple[np.ndarray, int]:
    audio, rate = sf.read(str(path), dtype="float64", always_2d=True)
    if not len(audio):
        raise ValueError(f"Audio file is empty: {path}")
    return _mono(audio), int(rate)


def _projection_leakage_db(
    target: np.ndarray, interferer: np.ndarray, estimate: np.ndarray
) -> float:
    """Approximate interferer-vs-target projection ratio; lower is better."""
    y = _mono(estimate)
    t = _mono(target)
    n = _mono(interferer)
    t = t - np.mean(t)
    n = n - np.mean(n)
    y = y - np.mean(y)
    t_energy = float(np.dot(t, t))
    n_energy = float(np.dot(n, n))
    if t_energy <= 1e-15 or n_energy <= 1e-15:
        raise ValueError("Target/interferer reference must contain signal energy.")
    target_component = (float(np.dot(y, t)) / t_energy) * t
    interferer_component = (float(np.dot(y, n)) / n_energy) * n
    target_power = float(np.dot(target_component, target_component))
    interferer_power = float(np.dot(interferer_component, interferer_component))
    return float(10.0 * np.log10(max(interferer_power, 1e-15) / max(target_power, 1e-15)))


def benchmark(
    mixture_path: Path,
    target_reference_path: Path,
    estimate_path: Path,
    interferer_reference_path: Path | None = None,
) -> dict:
    mixture, mix_sr = _load(mixture_path)
    target, target_sr = _load(target_reference_path)
    estimate, estimate_sr = _load(estimate_path)
    if len({mix_sr, target_sr, estimate_sr}) != 1:
        raise ValueError("Mixture, target reference and estimate must use the same sample rate.")
    if len({len(mixture), len(target), len(estimate)}) != 1:
        raise ValueError(
            "Files must be aligned and have identical sample counts. "
            "Benchmark the full-timeline stem before compact export."
        )
    baseline = si_sdr(target, mixture)
    result = {
        "sample_rate_hz": mix_sr,
        "duration_seconds": round(len(mixture) / mix_sr, 4),
        "samples": int(len(mixture)),
        "target_si_sdr_db": round(si_sdr(target, estimate), 4),
        "mixture_si_sdr_db": round(baseline, 4),
        "si_sdri_db": round(si_sdr(target, estimate) - baseline, 4),
        "alignment": "same-rate, same-length, source-timeline",
        "warning": "SI-SDR is reference-based and does not alone establish perceptual quality or speaker identity.",
    }
    if interferer_reference_path is not None:
        interferer, interferer_sr = _load(interferer_reference_path)
        if interferer_sr != mix_sr or len(interferer) != len(estimate):
            raise ValueError("Interferer reference must match sample rate and aligned sample count.")
        result["interferer_to_target_projection_db"] = round(
            _projection_leakage_db(target, interferer, estimate), 4
        )
        result["leakage_metric_note"] = (
            "Projection ratio is a diagnostic proxy; it is not a standardized source-separation score."
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mixture", required=True, type=Path)
    parser.add_argument("--target-reference", required=True, type=Path)
    parser.add_argument("--estimate", required=True, type=Path)
    parser.add_argument("--interferer-reference", type=Path)
    parser.add_argument("--json-out", type=Path)
    args = parser.parse_args()
    report = benchmark(
        args.mixture, args.target_reference, args.estimate, args.interferer_reference
    )
    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    print(rendered)
    if args.json_out:
        args.json_out.write_text(rendered + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
