"""Output compaction helpers shared by video and audio-only workflows.

Compaction is deliberately post-processing: it cannot identify a speaker or
remove interference by itself. Retained source intervals are normalized,
sorted and merged before concatenation so callers cannot duplicate or reorder
samples accidentally.
"""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Iterable

import numpy as np
import soundfile as sf


def detect_speech_intervals(
    audio: np.ndarray,
    sample_rate: int,
    *,
    frame_ms: int = 20,
    top_db: float = 38.0,
    min_speech_ms: int = 100,
    join_gap_ms: int = 100,
    padding_ms: int = 25,
) -> list[tuple[int, int]]:
    """Return candidate speech intervals using a conservative RMS heuristic.

    This is not a speech recognizer/VAD model. Quiet words and low-level noise
    may be misclassified; callers should review intervals for high-stakes use.
    """
    if sample_rate <= 0:
        raise ValueError("sample_rate must be a positive integer.")
    if frame_ms <= 0 or min_speech_ms < 0 or join_gap_ms < 0 or padding_ms < 0:
        raise ValueError("Frame and interval settings must be non-negative; frame_ms must be positive.")
    if not np.isfinite(top_db) or top_db <= 0:
        raise ValueError("top_db must be a finite positive number.")

    x = np.asarray(audio, dtype=np.float32)
    if x.ndim == 0:
        x = x.reshape(1)
    if x.ndim > 1:
        x = np.mean(x, axis=1)
    x = np.nan_to_num(x, copy=False, nan=0.0, posinf=0.0, neginf=0.0)
    if not len(x):
        return []

    frame = max(1, int(sample_rate * frame_ms / 1000))
    count = int(np.ceil(len(x) / frame))
    rms = np.zeros(count, dtype=np.float32)
    for i in range(count):
        part = x[i * frame:min(len(x), (i + 1) * frame)]
        if len(part):
            rms[i] = float(np.sqrt(np.mean(part * part)))

    peak = float(np.max(rms))
    if not np.isfinite(peak) or peak <= 1e-7:
        return []
    threshold = max(1e-5, peak * (10.0 ** (-top_db / 20.0)))
    active = rms >= threshold
    min_frames = max(1, int(np.ceil(min_speech_ms / frame_ms)))
    join_frames = max(0, int(join_gap_ms / frame_ms))
    pad_frames = max(0, int(padding_ms / frame_ms))
    raw = np.flatnonzero(active)
    if not len(raw):
        return []

    groups: list[list[int]] = [[int(raw[0]), int(raw[0])]]
    for idx in raw[1:]:
        idx = int(idx)
        if idx - groups[-1][1] <= join_frames + 1:
            groups[-1][1] = idx
        else:
            groups.append([idx, idx])

    intervals = []
    for first, last in groups:
        if last - first + 1 < min_frames:
            continue
        start = max(0, (first - pad_frames) * frame)
        end = min(len(x), (last + 1 + pad_frames) * frame)
        if end > start:
            intervals.append((start, end))
    return intervals


def normalize_intervals(
    intervals: Iterable[tuple[int, int]],
    total_samples: int,
) -> list[tuple[int, int]]:
    """Clamp, sort and merge overlapping/touching sample intervals."""
    if total_samples < 0:
        raise ValueError("total_samples cannot be negative.")
    valid = []
    for interval in intervals:
        if len(interval) != 2:
            raise ValueError("Each interval must contain exactly start and end samples.")
        start, end = interval
        start = max(0, min(total_samples, int(start)))
        end = max(0, min(total_samples, int(end)))
        if end > start:
            valid.append((start, end))
    valid.sort(key=lambda item: (item[0], item[1]))
    merged: list[list[int]] = []
    for start, end in valid:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [(start, end) for start, end in merged]


def compact_audio(
    audio: np.ndarray,
    sample_rate: int,
    *,
    intervals: Iterable[tuple[int, int]] | None = None,
) -> tuple[np.ndarray, list[tuple[int, int]]]:
    """Concatenate selected intervals in chronological order without gaps."""
    if sample_rate <= 0:
        raise ValueError("sample_rate must be a positive integer.")
    x = np.asarray(audio, dtype=np.float32)
    if x.ndim == 0:
        x = x.reshape(1, 1)
    elif x.ndim == 1:
        x = x[:, None]
    elif x.ndim != 2:
        raise ValueError("audio must be a mono or multichannel array.")
    x = np.nan_to_num(x, copy=False, nan=0.0, posinf=0.0, neginf=0.0)

    chosen = list(intervals) if intervals is not None else detect_speech_intervals(x, sample_rate)
    clean = normalize_intervals(chosen, len(x))
    if not clean:
        return np.zeros((0, x.shape[1]), dtype=np.float32), []
    pieces = [x[start:end] for start, end in clean]
    return np.concatenate(pieces, axis=0), clean



def restore_estimate_scale(
    estimate: np.ndarray,
    normalized_source: np.ndarray,
    sample_rate: int,
    *,
    max_adjustment_ms: int = 20,
) -> np.ndarray:
    """Restore a model estimate to the source segment's gain and exact length.

    The separator input is peak-normalized before inference. Its output must be
    rescaled by the original segment peak; normalizing every estimate to its
    own peak destroys natural loudness differences between utterances.
    Small decoder length drift is padded/cropped, while larger drift is rejected
    to prevent silent timeline misalignment.
    """
    if not isinstance(sample_rate, int) or sample_rate <= 0:
        raise ValueError("sample_rate must be a positive integer.")
    if not isinstance(max_adjustment_ms, int) or max_adjustment_ms < 0:
        raise ValueError("max_adjustment_ms must be a non-negative integer.")

    est = np.asarray(estimate, dtype=np.float32).reshape(-1)
    source = np.asarray(normalized_source, dtype=np.float32).reshape(-1)
    if est.size == 0 or source.size == 0:
        raise ValueError("Estimate and source segment must not be empty.")
    if not np.isfinite(est).all() or not np.isfinite(source).all():
        raise ValueError("Estimate and source segment must contain only finite samples.")

    tolerance = int(round(sample_rate * max_adjustment_ms / 1000.0))
    delta = len(est) - len(source)
    if abs(delta) > tolerance:
        raise ValueError(
            f"Model output length differs from source by {abs(delta)} samples; "
            f"allowed adjustment is {tolerance}. Refusing timeline misalignment."
        )
    if delta > 0:
        est = est[:len(source)]
    elif delta < 0:
        est = np.pad(est, (0, -delta), mode="constant")

    source_peak = float(np.max(np.abs(source)))
    if source_peak <= 1e-8:
        return np.zeros_like(source, dtype=np.float32)
    return (est * source_peak).astype(np.float32, copy=False)

def write_compacted_wav(source_audio: Path, output_wav: Path) -> dict:
    audio, sr = sf.read(str(source_audio), dtype="float32", always_2d=True)
    compacted, intervals = compact_audio(audio, sr)
    if not len(compacted):
        raise ValueError("No reliable target-speech interval was found; no compact export was created.")
    output_wav.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(output_wav), compacted, sr, subtype="PCM_24")
    return {
        "sample_rate": sr,
        "source_duration_sec": round(len(audio) / sr, 3),
        "output_duration_sec": round(len(compacted) / sr, 3),
        "removed_duration_sec": round((len(audio) - len(compacted)) / sr, 3),
        "intervals_samples": [[int(a), int(b)] for a, b in intervals],
        "intervals_seconds": [[round(a / sr, 4), round(b / sr, 4)] for a, b in intervals],
    }


def compact_video_to_intervals(
    source_video: Path,
    output_video: Path,
    intervals_seconds: list[list[float]],
    compacted_audio: Path,
    ffmpeg: str,
) -> None:
    """Cut source video to retained audio intervals and mux compact target audio."""
    if not intervals_seconds:
        raise ValueError("Cannot create compact video without retained speech intervals.")
    normalized = []
    for pair in intervals_seconds:
        if len(pair) != 2:
            raise ValueError("Each video interval must contain start and end seconds.")
        start, end = float(pair[0]), float(pair[1])
        if not np.isfinite(start) or not np.isfinite(end) or start < 0 or end <= start:
            raise ValueError("Video intervals must be finite, non-negative and have end > start.")
        normalized.append((start, end))
    normalized.sort(key=lambda item: (item[0], item[1]))
    merged: list[list[float]] = []
    for start, end in normalized:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])

    filters = []
    labels = []
    for idx, (start, end) in enumerate(merged):
        filters.append(
            f"[0:v]trim=start={start:.6f}:end={end:.6f},setpts=PTS-STARTPTS[v{idx}]"
        )
        labels.append(f"[v{idx}]")
    filters.append("".join(labels) + f"concat=n={len(labels)}:v=1:a=0[vout]")
    output_video.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source_video), "-i", str(compacted_audio),
        "-filter_complex", ";".join(filters),
        "-map", "[vout]", "-map", "1:a:0",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-c:a", "aac", "-b:a", "256k", "-shortest",
        str(output_video),
    ]
    subprocess.run(cmd, check=True)
