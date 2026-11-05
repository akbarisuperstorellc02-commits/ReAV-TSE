"""Model registry and optional local diarization adapters for ReAV-TSE.

Diarization labels speakers; it does not separate overlapping waveforms. Each
extractor is exposed only for the task it was designed and validated for.
All paths are local so installed processing never silently calls a cloud API.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

MODEL_CATALOG = {
    "pyannote_community_1": {
        "role": "diarization",
        "description": "Speaker turns, embeddings and overlap evidence; not waveform separation.",
        "limit": "No fixed UI speaker cap; practical quality depends on the model and recording.",
        "local_only": True,
        "env": "REAV_PYANNOTE_MODEL",
        "required_for": "Audio-only and video speaker discovery",
    },
    "nvidia_nemotron_diarization": {
        "role": "secondary_diarization",
        "description": "Optional comparison/secondary diarization; current published pipeline has an 8-identity constraint.",
        "limit": "Not a multi-stem waveform separator; not the primary arbitrary-count diarizer.",
        "local_only": True,
        "env": "REAV_NEMOTRON_MODEL",
        "required_for": "Optional cross-check only",
    },
    "falcon_big": {
        "role": "audio_visual_target_extraction",
        "description": "Single selected target using synchronized mouth crops and 16 kHz audio.",
        "limit": "Video-only candidate; one target per inference; requires a verified local checkpoint and adapter.",
        "local_only": True,
        "env": "REAV_FALCON_MODEL",
        "required_for": "Video mode candidate",
    },
    "av_mossformer2": {
        "role": "audio_visual_target_extraction",
        "description": "Existing AV target-speaker extractor retained as the current video baseline.",
        "limit": "Requires real-world identity/overlap quality validation.",
        "local_only": True,
        "env": "REAV_AV_MOSSFORMER2_MODEL",
        "required_for": "Video mode baseline",
    },
    "spex_plus": {
        "role": "audio_only_target_extraction",
        "description": "Reference-conditioned audio-only TSE prototype.",
        "limit": "Public checkpoint is trained/evaluated on two-speaker 8 kHz WSJ0-2Mix; not validated for arbitrary-N or the four target languages.",
        "local_only": True,
        "env": "REAV_SPEX_PLUS_MODEL",
        "required_for": "Audio-only research baseline only",
    },
    "sepformer_wsJ02mix": {
        "role": "audio_only_blind_separation_baseline",
        "description": "Existing two-source 8 kHz blind separation baseline.",
        "limit": "Two estimated sources, not speaker identities and not arbitrary-N.",
        "local_only": True,
        "env": "REAV_AUDIO_MODEL_DIR",
        "required_for": "Legacy baseline only",
    },
}


def model_status() -> dict[str, Any]:
    """Return truthful local readiness without downloading or initializing weights."""
    items = {}
    for name, spec in MODEL_CATALOG.items():
        raw = os.environ.get(spec["env"], "").strip()
        if name == "sepformer_wsJ02mix" and not raw:
            raw = str(Path(__file__).resolve().parent / "audio_models" / "sepformer-wsj02mix")
        path = Path(raw).expanduser() if raw else None
        exists = bool(path and path.exists())
        items[name] = {
            **spec,
            "configured_path": str(path) if path else None,
            "weights_present": exists,
            "status": "weights_present_adapter_pending" if exists and name in {
                "falcon_big", "spex_plus", "nvidia_nemotron_diarization"
            } else ("configured" if exists else "not_installed"),
        }
    # Do not equate model files or a successful CI build with usable,
    # quality-validated speaker extraction. These gates stay closed until
    # production adapters and multilingual real-recording evaluations exist.
    return {
        "offline_mode": True,
        "models": items,
        "capabilities": {
            "local_diarization": bool(items["pyannote_community_1"]["weights_present"]),
            "audio_only_identity_conditioned_extraction": False,
            "arbitrary_speaker_count_waveform_separation": False,
            "video_target_extraction_baseline": bool(items["av_mossformer2"]["weights_present"]),
            "video_target_extraction_quality_validated": False,
        },
        "release_quality_gate": {
            "ready": False,
            "reason": "Audio-only identity-conditioned extraction and real-world multilingual quality validation are not complete.",
            "required_languages": ["fa-af", "ps-af", "ar", "en-us"],
            "required_speaker_counts": [2, 3, 5, 10],
            "requires_overlap_tests": True,
            "requires_target_leakage_and_word_retention_metrics": True,
            "requires_blind_listening_review": True,
        },
        "notice": "A model being listed does not mean its adapter is installed or its quality is validated. Diarization is not waveform separation.",
    }


def _get_local_pyannote_pipeline():
    model_path = os.environ.get("REAV_PYANNOTE_MODEL", "").strip()
    if not model_path:
        raise RuntimeError(
            "pyannote Community-1 is not installed locally. Set REAV_PYANNOTE_MODEL "
            "to a downloaded, license-approved local model directory."
        )
    path = Path(model_path).expanduser()
    if not path.is_dir():
        raise RuntimeError(f"Local pyannote model directory not found: {path}")
    try:
        from pyannote.audio import Pipeline
    except ImportError as exc:
        raise RuntimeError(
            "pyannote.audio is not installed in this build. Install the reviewed "
            "offline dependency bundle before enabling diarization."
        ) from exc
    pipeline = Pipeline.from_pretrained(str(path))
    try:
        import torch
        if torch.cuda.is_available():
            pipeline.to(torch.device("cuda"))
    except Exception:
        # CPU inference remains available; device selection must not break loading.
        pass
    return pipeline


def find_speaker_overlaps(segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return pairwise cross-speaker overlap intervals from diarization turns.

    Input is sorted defensively. Same-speaker overlaps and touching boundaries
    are excluded. A sweep-line active set avoids comparing turns that have
    already ended; output remains deterministic for repeatable UI/tests.
    """
    normalized = []
    for item in segments:
        try:
            start = float(item["start"])
            end = float(item["end"])
            speaker = str(item["speaker"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("Each diarization segment needs numeric start/end and a speaker label.") from exc
        if not (start >= 0.0 and end > start and start < float("inf") and end < float("inf")):
            raise ValueError("Diarization segment times must be finite, non-negative, and end after start.")
        normalized.append({"start": start, "end": end, "speaker": speaker})

    normalized.sort(key=lambda item: (item["start"], item["end"], item["speaker"]))
    active: list[dict[str, Any]] = []
    overlaps = []
    for current in normalized:
        active = [item for item in active if item["end"] > current["start"]]
        for previous in active:
            if previous["speaker"] == current["speaker"]:
                continue
            start = max(previous["start"], current["start"])
            end = min(previous["end"], current["end"])
            if end > start:
                overlaps.append({
                    "start": round(start, 4),
                    "end": round(end, 4),
                    "speakers": sorted([previous["speaker"], current["speaker"]]),
                })
        active.append(current)

    overlaps.sort(key=lambda item: (item["start"], item["end"], item["speakers"]))
    return overlaps


def diarize_audio_file(audio_path: str | Path) -> dict[str, Any]:
    """Run local Community-1 diarization and report turns plus concurrent overlaps."""
    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {path}")
    pipeline = _get_local_pyannote_pipeline()
    annotation = pipeline(str(path))
    if hasattr(annotation, "speaker_diarization"):
        annotation = annotation.speaker_diarization

    segments = []
    for segment, _, speaker in annotation.itertracks(yield_label=True):
        segments.append({
            "speaker": str(speaker),
            "start": round(float(segment.start), 4),
            "end": round(float(segment.end), 4),
            "duration": round(float(segment.duration), 4),
        })
    segments.sort(key=lambda x: (x["start"], x["end"], x["speaker"]))

    overlaps = find_speaker_overlaps(segments)

    speakers = sorted({item["speaker"] for item in segments})
    return {
        "engine": "pyannote_community_1",
        "task": "diarization_only",
        "num_speakers": len(speakers),
        "speakers": speakers,
        "segments": segments,
        "overlaps": overlaps,
        "waveform_separation_performed": False,
    }
