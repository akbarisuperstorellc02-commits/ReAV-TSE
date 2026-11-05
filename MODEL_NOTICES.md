# Model and bundled asset notices

## AV-MossFormer2 target-speaker extraction weights

- Model: `AV_MossFormer2_TSE_16K`
- Source: https://huggingface.co/alibabasglab/AV_MossFormer2_TSE_16K
- File bundled: `last_best_checkpoint.pt`
- Upstream license: Apache License 2.0 (see the model repository)
- The Windows build downloads this checkpoint from the upstream Hugging Face repository and verifies its SHA-256 before including it in the installer.

## ResNet-18 visual feature weights

- Source: https://download.pytorch.org/models/resnet18-f37072fd.pth
- Distributed by the PyTorch project for use with torchvision's ResNet-18 model.
- The Windows build includes the pretrained weights in the application resources.

## Arabic-script UI font

- Package: `@fontsource/noto-sans-arabic`
- Font family: Noto Sans Arabic
- License: SIL Open Font License; see the package's included license files.

## Audio-only separation model

- Model: SpeechBrain SepFormer WSJ0-2Mix.
- Source: https://huggingface.co/speechbrain/sepformer-wsj02mix
- The Windows workflow downloads the model files into the installer and validates local loading.
- This checkpoint is a two-source model at 8 kHz. It returns two estimated audio sources, not an arbitrary number of speakers, and Source 1/Source 2 are not verified speaker identities. The current audio-only endpoint compacts these two estimated stems by removing low-energy gaps, but this does not establish speaker identity or arbitrary-N diarization. Quality must be tested on real multilingual recordings.
- Check the upstream model card and license before distributing builds.

## Compact output post-processing

- `audio_output.py` provides energy-based speech interval detection, silence-gap compaction, and a matching video-trim helper.
- Video-mode target audio is now exported as a shorter compact WAV; the pipeline also attempts to cut and concatenate the corresponding source-video intervals and mux the compact target audio.
- Audio-only SepFormer outputs are compacted independently. Because the bundled checkpoint is still a two-source model, the two outputs are provisional source estimates rather than confirmed people.
- Energy-based trimming is a post-processing heuristic, not a diarization or source-separation model. Quiet speech, breath sounds, and residual noise can be misclassified; this requires evaluation and tuning on real recordings.

## AudioShake-parity research candidates (not bundled or enabled)

- **Falcon / Falcon-Big**: https://github.com/JusperLee/Falcon and https://huggingface.co/JusperLee/Falcon. The upstream repository and released weights declare Apache-2.0. This is a 16 kHz audio-visual target-speaker extractor requiring synchronized mouth crops; it extracts one selected target and is not an Audio-only engine or an all-speaker stem separator. It is a Video Mode candidate only. The current ReAV-TSE installer does not include Falcon code or weights.
- **pyannote.audio Community-1**: https://github.com/pyannote/pyannote-audio. Diarization/speaker evidence only; it does not separate overlapping waveforms. Its pretrained pipeline has gated model access conditions. Do not bundle until model access, checkpoint redistribution, license and offline loading have been verified.
- **NVIDIA NeMo / Nemotron-3-Diarization**: https://docs.nvidia.com/nemo/labs-voice-agent/about/core-concepts/speech-pipeline/speaker-diarization. Current documentation describes up to eight diarization identities for this model. Diarization labels are not source-separated audio; the documented streaming service emits at most one speaker label per frame/utterance.
- **ClearerVoice-Studio**: https://github.com/modelscope/ClearerVoice-Studio. Apache-2.0 toolkit with multiple tasks. Its documented audio-only reference-conditioned TSE task is 8 kHz; verify exact downloadable checkpoint, training mixture limits, language coverage and redistribution terms before treating it as a production engine.
- **AudioShake Multi-Speaker 2.0**: https://audioshake.ai/press-releases/audioshake-releases-multi-speaker-2-0-to-isolate-overlapping-dialogue. Announced as Studio/API functionality. Public API docs do not establish a redistributable offline local model or SDK.

## Comparative evaluation tool

- `tools/benchmark_speaker_output.py` measures aligned target SI-SDR and SI-SDR improvement, with an optional interferer-to-target projection leakage diagnostic.
- Run the benchmark on full-timeline stems before silence removal. It intentionally rejects compacted or misaligned files. SI-SDR and the leakage proxy do not replace listening tests or prove speaker identity.
- The current workflow's unit-test step exercises the benchmark's metric and alignment checks.

## ReAV-TSE local model registry and diarization endpoint

The desktop backend now exposes `GET /api/models` to report local checkpoint presence and model roles without downloading anything. It also exposes `POST /api/audio/diarize` for optional local pyannote diarization when `pyannote.audio` and a previously downloaded, approved Community-1 model directory are installed and configured with `REAV_PYANNOTE_MODEL`.

The diarization endpoint returns speaker turns and concurrent overlap intervals. It explicitly reports `waveform_separation_performed: false`: diarization is not audio extraction. The app does not fetch gated model weights, request a token, or contact a cloud service during processing.

Falcon-Big, SpEx+, and Nemotron are represented in the model registry with their correct task roles and readiness states. A checkpoint path alone is not treated as a working adapter. Falcon and SpEx+ still require verified inference adapters and end-to-end quality tests; Nemotron remains an optional secondary diarization candidate and is not treated as an unlimited-speaker engine. The current SepFormer and AV-MossFormer2 baselines remain unchanged until candidates pass the acceptance gates in `AUDIO_ENGINE_UPGRADE.md`.
