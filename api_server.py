import os
import sys
import json
import time
import shutil
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from job_pipeline import create_job, analyze_video_job, extract_job_speaker, JOBS_DIR
from audio_output import compact_audio, detect_speech_intervals

app = FastAPI(title="ReAV-TSE Multi-Job API", description="Dynamic Audio-Visual Target Speaker Extraction Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["null", "http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))
DATA_DIR = Path(os.environ.get('REAV_DATA_DIR', str(Path.home() / 'ReAV-TSE')))
DATA_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}

class AnalyzeRequest(BaseModel):
    job_id: str

class ExtractJobRequest(BaseModel):
    job_id: str
    target: str
    mode: str = "person"

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ReAV-TSE Multi-Job", "timestamp": time.time()}

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """Uploads a user-provided video into an isolated job workspace."""

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No video file uploaded. Please select a video file.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed video formats: {', '.join(sorted(ALLOWED_VIDEO_EXTS))}."
        )

    # Temporary save
    temp_dir = DATA_DIR / "uploads"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_file = temp_dir / f"upload_{uuid.uuid4().hex}{ext}"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    if temp_file.stat().st_size == 0:
        temp_file.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="The uploaded file is empty (0 bytes).")

    job_id = create_job(temp_file)
    return {
        "status": "uploaded",
        "job_id": job_id,
        "filename": file.filename,
        "video_url": f"/api/jobs/{job_id}/video"
    }

@app.post("/api/analyze")
def analyze_video(req: AnalyzeRequest):
    """Runs fresh face detection, tracking, thumbnail generation, and speaker clustering for the specific job."""
    if not req.job_id or not (JOBS_DIR / req.job_id).exists():
        raise HTTPException(status_code=404, detail=f"Job '{req.job_id}' not found.")
    try:
        data = analyze_video_job(req.job_id)
        return data
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[Analyze Error] {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/jobs/latest")
def get_latest_job():
    if not JOBS_DIR.exists():
        return {"job_id": None}
    jobs = [p for p in JOBS_DIR.iterdir() if p.is_dir() and (p / "speakers.json").exists()]
    if not jobs:
        return {"job_id": None}
    latest_job = max(jobs, key=lambda p: (p / "speakers.json").stat().st_mtime)
    with open(latest_job / "speakers.json", "r") as f:
        speakers = json.load(f)
    return {
        "job_id": latest_job.name,
        "video_url": f"/api/jobs/{latest_job.name}/video",
        "speakers": speakers
    }

@app.get("/api/jobs/{job_id}/speakers")
def get_job_speakers(job_id: str):
    job_dir = JOBS_DIR / job_id
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    speakers_file = job_dir / "speakers.json"
    if not speakers_file.exists():
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' has not been analyzed yet")
    with open(speakers_file, "r") as f:
        data = json.load(f)
    return data

@app.get("/api/jobs/{job_id}/status")
def get_job_status(job_id: str):
    job_dir = JOBS_DIR / job_id
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    status_file = job_dir / "status.json"
    if not status_file.exists():
        return {
            "job_id": job_id,
            "stage": "pending",
            "message": "Initializing workspace...",
            "progress": 0.05
        }
    with open(status_file, "r") as f:
        return json.load(f)

@app.get("/api/jobs/{job_id}/video")
def get_job_video(job_id: str):
    video_path = JOBS_DIR / job_id / "video.mp4"
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    return FileResponse(video_path, media_type="video/mp4")

@app.get("/api/jobs/{job_id}/audio/original")
def get_job_original_audio(job_id: str):
    audio_path = JOBS_DIR / job_id / "audio.wav"
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Original audio not found")
    return FileResponse(audio_path, media_type="audio/wav")

@app.get("/api/jobs/{job_id}/thumbnails/{filename}")
def get_job_thumbnail(job_id: str, filename: str):
    thumb_path = JOBS_DIR / job_id / "thumbnails" / filename
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    response = FileResponse(thumb_path, media_type="image/jpeg")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response

@app.post("/api/extract")
def extract_speaker(req: ExtractJobRequest):
    """Extracts target speaker audio specifically for this job."""
    job_dir = JOBS_DIR / req.job_id
    if not req.job_id or not job_dir.exists():
        raise HTTPException(status_code=404, detail=f"Job '{req.job_id}' not found.")
    speakers_file = job_dir / "speakers.json"
    if not speakers_file.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Video analysis has not been performed for job '{req.job_id}'. Please run analysis first."
        )
    try:
        report = extract_job_speaker(req.job_id, req.target, req.mode)
        target_clean = req.target.strip().lower()
        return {
            "status": "success",
            "job_id": req.job_id,
            "targetId": req.target,
            "targetName": report.get("target_name", req.target),
            "audioUrl": f"/api/jobs/{req.job_id}/audio/target?person={target_clean}&t={int(time.time()*1000)}",
            "downloadUrl": f"/api/jobs/{req.job_id}/audio/download?person={target_clean}",
            "videoUrl": f"/api/jobs/{req.job_id}/video/compact?person={target_clean}" if report.get("video_export") else None,
            "report": report
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[Extract Error] {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@app.get("/api/jobs/{job_id}/video/compact")
def get_job_compact_video(job_id: str, person: str = "person1"):
    clean_p = person.strip().lower()
    path = JOBS_DIR / job_id / f"target_video_{clean_p}.mp4"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Compact target-speaker video is not available.")
    return FileResponse(path, media_type="video/mp4", filename=f"ReAV_TSE_{job_id}_{clean_p}_compact.mp4")


@app.get("/api/jobs/{job_id}/audio/target")
def get_job_target_audio(job_id: str, person: str = "person1"):
    clean_p = person.strip().lower()
    target_path = JOBS_DIR / job_id / f"target_speaker_{clean_p}.wav"
    if not target_path.exists():
        raise HTTPException(status_code=404, detail=f"Target speaker audio not found for {person}")
    response = FileResponse(target_path, media_type="audio/wav")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response

@app.get("/api/jobs/{job_id}/audio/download")
def download_job_target_audio(job_id: str, person: str = "person1"):
    clean_p = person.strip().lower()
    target_path = JOBS_DIR / job_id / f"target_speaker_{clean_p}.wav"
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Target speaker audio not found")
    return FileResponse(
        target_path,
        media_type="audio/wav",
        filename=f"ReAV_TSE_{job_id}_{clean_p}.wav"
    )

@app.get("/api/audio/target")
def get_legacy_target_audio(person: str = "person1"):
    latest = get_latest_job()
    if not latest.get("job_id"):
        raise HTTPException(status_code=404, detail="No active jobs found")
    return get_job_target_audio(latest["job_id"], person)

@app.get("/api/audio/download")
def get_legacy_download_audio(person: str = "person1"):
    latest = get_latest_job()
    if not latest.get("job_id"):
        raise HTTPException(status_code=404, detail="No active jobs found")
    return download_job_target_audio(latest["job_id"], person)

@app.get("/api/audio/original")
def get_legacy_original_audio():
    latest = get_latest_job()
    if not latest.get("job_id"):
        raise HTTPException(status_code=404, detail="No active jobs found")
    return get_job_original_audio(latest["job_id"])


# Audio-only workflow (offline SepFormer model bundled by the Windows workflow)
AUDIO_EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac"}
_AUDIO_MODEL = None

def _get_audio_separator():
    global _AUDIO_MODEL
    if _AUDIO_MODEL is None:
        model_dir = Path(os.environ.get("REAV_AUDIO_MODEL_DIR", str(BASE_DIR / "audio_models" / "sepformer-wsj02mix")))
        if not model_dir.exists():
            raise RuntimeError("The offline audio separation model is missing. Reinstall the complete model bundle.")
        from speechbrain.inference.separation import SepformerSeparation
        _AUDIO_MODEL = SepformerSeparation.from_hparams(
            source=str(model_dir), savedir=str(model_dir),
            run_opts={"device": "cuda" if __import__("torch").cuda.is_available() else "cpu"}
        )
    return _AUDIO_MODEL

@app.post("/api/audio/upload")
async def upload_audio(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Select an audio file.")
    ext = Path(file.filename).suffix.lower()
    if ext not in AUDIO_EXTS:
        raise HTTPException(status_code=400, detail="Supported audio formats: WAV, MP3, M4A, FLAC, OGG and AAC.")
    audio_dir = DATA_DIR / "audio_jobs" / uuid.uuid4().hex
    audio_dir.mkdir(parents=True, exist_ok=True)
    source = audio_dir / ("source" + ext)
    with open(source, "wb") as dst:
        shutil.copyfileobj(file.file, dst)
    if source.stat().st_size == 0:
        shutil.rmtree(audio_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="The selected audio file is empty.")
    return {"job_id": audio_dir.name, "filename": file.filename, "status": "uploaded"}

@app.get("/api/models")
def get_model_status():
    """Show local model readiness and their supported roles without downloading weights."""
    from speaker_models import model_status
    return model_status()


@app.post("/api/audio/diarize")
def diarize_uploaded_audio(req: AnalyzeRequest):
    """Run local speaker diarization; this endpoint does not claim to separate voices."""
    job_dir = DATA_DIR / "audio_jobs" / req.job_id
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Audio job not found.")
    candidates = [p for p in job_dir.iterdir() if p.is_file() and p.name.startswith("source")]
    if not candidates:
        raise HTTPException(status_code=404, detail="Uploaded source audio was not found.")
    try:
        from speaker_models import diarize_audio_file
        result = diarize_audio_file(candidates[0])
        result["job_id"] = req.job_id
        with open(job_dir / "diarization.json", "w", encoding="utf-8") as handle:
            json.dump(result, handle, indent=2, ensure_ascii=False)
        return result
    except (RuntimeError, FileNotFoundError) as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        print(f"[Diarization Error] {exc}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Diarization failed: {exc}")


@app.post("/api/audio/separate")
def separate_audio(req: AnalyzeRequest):
    job_dir = DATA_DIR / "audio_jobs" / req.job_id
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Audio job not found.")
    source_files = [p for p in job_dir.iterdir() if p.is_file() and p.name.startswith("source.")]
    if not source_files:
        raise HTTPException(status_code=404, detail="Uploaded audio file not found.")
    try:
        import imageio_ffmpeg
        import numpy as np
        import soundfile as sf
        source = source_files[0]
        normalized = job_dir / "normalized_8k.wav"
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        import subprocess
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
                        "-vn", "-ac", "1", "-ar", "8000", str(normalized)], check=True)
        separator = _get_audio_separator()
        estimates = separator.separate_file(path=str(normalized))
        stems = []
        data = estimates.detach().cpu().numpy()
        # SpeechBrain SepFormer WSJ02Mix is a two-source model; do not imply
        # support for arbitrary speaker counts or stable speaker identity.
        if data.ndim == 3:
            data = data[0]
        if data.ndim != 2 or data.shape[-1] != 2:
            raise RuntimeError("The bundled separator returned an unexpected output shape.")
        for idx in range(2):
            compacted, intervals = compact_audio(data[:, idx], 8000)
            if not len(compacted):
                continue
            out = job_dir / f"speaker_{idx + 1}.wav"
            sf.write(str(out), compacted, 8000, subtype="PCM_24")
            duration = round(len(compacted) / 8000, 3)
            stems.append({
                "speaker": idx + 1,
                "duration_sec": duration,
                "retained_intervals": [[round(a / 8000, 3), round(b / 8000, 3)] for a, b in intervals],
                "downloadUrl": f"/api/audio/jobs/{req.job_id}/speaker/{idx + 1}"
            })
        if not stems:
            raise RuntimeError("No speech activity was detected in the separated sources.")
        return {"status": "success", "job_id": req.job_id, "model": "SepFormer WSJ02Mix",
                "separated_sources": stems, "speaker_limit": 2,
                "output_mode": "compact",
                "notice": "Compact two-source estimate. Source labels are not verified speaker identities; arbitrary speaker counts are not supported by this checkpoint."}
    except Exception as exc:
        print(f"[Audio Separation Error] {exc}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Audio separation failed: {exc}")

@app.get("/api/audio/jobs/{job_id}/speaker/{speaker_id}")
def download_audio_speaker(job_id: str, speaker_id: int):
    if speaker_id not in (1, 2):
        raise HTTPException(status_code=404, detail="Speaker output not found.")
    path = DATA_DIR / "audio_jobs" / job_id / f"speaker_{speaker_id}.wav"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Speaker output is not ready.")
    return FileResponse(path, media_type="audio/wav", filename=f"ReAV_TSE_{job_id}_source_{speaker_id}.wav")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="127.0.0.1", port=int(os.environ.get("REAV_API_PORT", "8765")), reload=False)
