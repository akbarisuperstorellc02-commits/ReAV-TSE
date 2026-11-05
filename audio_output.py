"""Output compaction helpers shared by video and audio-only workflows.

The compact export removes non-target intervals and trims residual quiet gaps.
Intervals are detected conservatively from the extracted target stem; source timing
is retained in a JSON edit-decision list for auditability.
"""
from __future__ import annotations

import json
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
    """Return sample intervals with energy above an adaptive conservative floor."""
    x = np.asarray(audio, dtype=np.float32)
    if x.ndim > 1:
        x = np.mean(x, axis=1)
    if not len(x) or sample_rate <= 0:
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
    # Absolute floor avoids treating quantization noise as speech; adaptive floor
    # removes low-level residual room tone without aggressive gating.
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


def compact_audio(
    audio: np.ndarray,
    sample_rate: int,
    *,
    intervals: Iterable[tuple[int, int]] | None = None,
) -> tuple[np.ndarray, list[tuple[int, int]]]:
    """Concatenate target speech intervals; output has no inter-interval silence."""
    x = np.asarray(audio, dtype=np.float32)
    if x.ndim == 1:
        x = x[:, None]
    chosen = list(intervals) if intervals is not None else detect_speech_intervals(x, sample_rate)
    pieces = []
    clean = []
    for start, end in chosen:
        start = max(0, int(start))
        end = min(len(x), int(end))
        if end <= start:
            continue
        pieces.append(x[start:end])
        clean.append((start, end))
    if not pieces:
        return np.zeros((0, x.shape[1]), dtype=np.float32), []
    return np.concatenate(pieces, axis=0), clean


def write_compacted_wav(source_audio: Path, output_wav: Path) -> dict:
    audio, sr = sf.read(str(source_audio), dtype="float32", always_2d=True)
    compacted, intervals = compact_audio(audio, sr)
    if not len(compacted):
        raise ValueError("No reliable target-speech interval was found; no compact export was created.")
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
    """Cut source video to the exact retained audio intervals and mux compact audio."""
    if not intervals_seconds:
        raise ValueError("Cannot create compact video without retained speech intervals.")
    filters = []
    labels = []
    for idx, (start, end) in enumerate(intervals_seconds):
        filters.append(
            f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{idx}]"
        )
        labels.append(f"[v{idx}]")
    filters.append("".join(labels) + f"concat=n={len(labels)}:v=1:a=0[vout]")
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
