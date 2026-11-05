# ReAV-TSE AudioShake-Parity Upgrade Plan

## Product target

Use AudioShake Multi-Speaker 2.0 as the quality reference, not as a runtime dependency. ReAV-TSE remains a Windows 10 desktop application whose installed processing path works without internet. The required user workflow is target-speaker selection, identity-consistent extraction through overlapping speech, conservative cleanup, and compact export with the retained target speech concatenated in chronological order.

A quality claim is not accepted from a successful build or a model paper alone. It requires paired real recordings, objective measurements where clean references exist, and blinded listening.

## Findings verified on 2026-11-05

### AudioShake reference
- AudioShake announced Multi-Speaker 2.0 on 2026-09-22.
- Its announcement describes one stem per detected speaker, including overlapping dialogue, an ambience stem, source-rate output from 8 to 48 kHz, and 20 ms confidence markers.
- Public developer documentation creates a `multi_voice` task through the AudioShake API. This is a cloud API workflow, not evidence of an offline redistributable model or local SDK capability.
- Do not ship API keys, require network access, or silently fall back to cloud processing. A commercial/local licensing inquiry is a separate option, not the default implementation.

### Candidate models and their limits
- **Falcon / Falcon-Big** (JusperLee/Falcon): Apache-2.0 repository and released weights; 16 kHz audio-visual target-speaker extraction, with local inference after weights are downloaded. It uses synchronized mouth crops and extracts one selected target (n_src=1). It is a promising Video Mode candidate, not an Audio-only engine, not an all-speaker stem separator, and not evidence of arbitrary-speaker diarization. Its published workflow uses 2-second windows and 25 fps 96x96 grayscale mouth crops. It must be validated against the current AV-MossFormer2 path before replacement.
- **pyannote.audio Community-1**: open-source diarization toolkit with speech activity, speaker embeddings and overlap-related building blocks. It provides speaker/time evidence, not separated waveforms. The model has gated Hugging Face access/conditions and must be downloaded and licensed/redistribution-reviewed before it can be bundled. Local inference is possible after the model is cached.
- **NVIDIA NeMo / Nemotron-3-Diarization**: local diarization candidate with a published eight-speaker limit in the current Voice Agent documentation. The cited streaming service emits at most one speaker label per frame/utterance, so it is not sufficient by itself for recovering simultaneous waveforms.
- **ClearerVoice-Studio**: Apache-2.0 toolkit with speech enhancement, separation and target-speaker extraction. Its published task taxonomy includes an audio-only reference-conditioned extraction task at 8 kHz and AV extraction at 16 kHz. The available public information does not establish that a ready-to-bundle multilingual, arbitrary-N Audio-only checkpoint exists. Model-specific checkpoint availability, training mixture limits, license and quality must be checked separately.
- **Current SpeechBrain SepFormer WSJ0-2Mix**: two estimated sources at 8 kHz; not stable speaker identities, not arbitrary-N, and not acceptable as the final general-purpose Audio-only engine.

## Target architecture

1. **Media ingest**: decode audio without destructive downsampling; preserve source rate/channels and retain an immutable source copy.
2. **Speaker discovery**: VAD, diarization, speaker embeddings, speaker-count estimation and explicit overlap regions. Keep diarization distinct from waveform separation.
3. **Target enrollment**: let the user audition detected turns and optionally provide a clean voice reference. In Video Mode, face-to-voice association is additional evidence, not the only identity signal.
4. **Target extraction**:
   - Video Mode: evaluate Falcon and AV-MossFormer2 using synchronized target mouth crops; preserve the existing engine until comparative tests pass.
   - Audio-only Mode: use reference-conditioned extraction only when a model is verified for the intended sample rate, language/accent conditions, overlap and speaker-count domain. Do not call a two-stem blind separator a speaker-identity engine.
   - Multi-speaker separation: evaluate genuine per-speaker stem models separately from single-target extraction.
5. **Conservative cleanup**: dialogue/noise/reverb processing must be optional, order-aware and validated not to erase quiet syllables or consonants.
6. **Confidence and review**: mark low-confidence and overlap-heavy regions. Never turn uncertain segments into confident speaker labels.
7. **Compact export**: apply one shared edit-decision list to audio and video; remove non-target intervals and inter-segment gaps; concatenate target speech in source order; use short boundary fades only to avoid clicks.
8. **Offline packaging**: bundle exact checkpoints, configs, runtime dependencies and notices; verify a clean Windows 10 machine can run with network disabled.

## Acceptance gates before replacing current engines

- Correct target identity across alternating turns and long pauses.
- Target speech retained during overlap; competing speaker leakage measured separately.
- Tests include 2, 3, 5 and 10+ speakers where supported by the candidate, and report unsupported conditions rather than inventing capacity.
- Afghan Dari, Pashto, Arabic and English, including accented and code-switched recordings.
- Music, TV, sound effects, crowd noise, wind, fan noise, echo and reverberation.
- Original sample rate/channel preservation or a documented, tested conversion-and-restore path.
- Compare each candidate with the same input and clean references; report SI-SDR/SI-SDRi and leakage proxies where references exist, plus blinded listening for naturalness/intelligibility.
- No destructive compacting before the aligned separation metrics are computed.
- Full offline smoke test after installation with network disabled.
- Verify all code, checkpoint, dataset and font licenses separately. Dataset terms do not inherit the model-code license.

## Immediate implementation sequence

1. Add a reproducible aligned-audio benchmark harness (this change).
2. Build a small, consented evaluation pack covering target-only, non-target-only, alternating, overlap, background music/noise and the four required languages.
3. Benchmark current AV-MossFormer2 and SepFormer honestly as baselines.
4. Prototype Falcon as an optional Video Mode candidate and compare it with AV-MossFormer2; do not replace either by assumption.
5. Evaluate a true reference-conditioned Audio-only engine and overlap-aware multi-speaker options. If no redistributable checkpoint meets the gates, keep the limitation visible rather than shipping a misleading two-speaker UI.
6. Integrate only candidates that pass quality, licensing, dependency and offline Windows tests.

## Current state

This plan does not claim that AudioShake quality has been achieved. Falcon, pyannote, NeMo and ClearerVoice are candidates with different roles and limitations. The current installer remains a baseline build, not proof of AudioShake-parity quality.
