# Target-speaker-only compact output behavior

## User-facing behavior

The user selects one detected speaker (for example, their own voice). The exported result contains only that speaker's speech. This applies to Video Mode and Audio-only Mode.

**Compact mode is the required default.** Non-target speech, unwanted sound and the silent gaps left after their removal are deleted from the output timeline. The retained target-speech portions are concatenated in order into a shorter file. Original duration and synchronization with the source are not required.

## Required output semantics

- Keep only the selected speaker's voice; suppress other speakers, music, effects and background noise as far as the validated extraction model permits.
- Remove non-target-only intervals completely.
- Trim leading, trailing and inter-segment silence from the retained target stem, then concatenate retained speech portions without leaving the original gaps.
- Preserve chronological order and apply short boundary fades only to prevent clicks.
- In Video Mode, cut the source video to the same retained time intervals, concatenate those picture segments in the same order, and mux the compact target-speaker audio. The exported video is shorter; it is not required to remain synchronized to the original timeline.
- Audio-only Mode exports the same compacted speech-only WAV without requiring any video.
- Keep an edit-decision list containing original source start/end times for each retained interval so the user can inspect how the compact file was assembled.
- If no reliable target speech is found, return a clear error rather than an empty or misleading success.

## Clean, natural voice requirements

- Reduce competing speakers, music, TV/radio, sound effects, wind, fan noise, hiss, crowd noise and room reverberation where validated models can do so.
- Preserve natural timbre, pitch, consonants, syllables, intelligibility and dynamics.
- Do not add creative effects, echo, artificial reverb, pitch shifting, robotic processing or unnecessary EQ/compression.
- Avoid aggressive denoising that removes quiet words, breaths that belong to speech, or word endings.
- Use high-quality lossless WAV for speaker audio by default. Preserve source sample rate and channels in the exported stem where supported; internal model resampling must be restored carefully.

## Processing architecture

1. Detect speech activity, estimate the number of speakers, assign anonymous speaker IDs and identify overlapping speech.
2. Let the user identify the target using auditionable voice samples. In Video Mode, use face-to-voice association as an additional cue, not as the sole source of speaker identity.
3. Run speaker-conditioned, overlap-aware extraction. A fixed two-output model must never be described as arbitrary-N diarization or verified identity separation.
4. Apply conservative cleanup and evaluate residual interference and speech distortion.
5. Detect target speech intervals on the extracted stem, trim non-speech gaps, and concatenate the retained intervals.
6. For video, use the exact same source intervals to cut and concatenate picture segments, then mux the compacted target audio.
7. Preserve an edit-decision list and run checks for clipping, empty output, missing speech and duration consistency.

## Validation requirements

Test both modes using target-only speech, other-speaker-only speech, alternating turns, overlapping turns, music/effects, environmental noise and reverberant rooms. Include Afghan Dari, Pashto, Arabic and English, including overlap-heavy samples.

Evaluate diarization/overlap detection (DER/JER), separation (SI-SDR/SI-SDRi where references exist), intelligibility, leakage and human listening. Verify that compact audio and video contain the same retained intervals in the same order.

No model can guarantee perfect separation in every recording. Flag uncertain segments and avoid claiming unlimited speakers or perfect purity without measured evidence.

## Current implementation status and known limitations

- SpeechBrain SepFormer WSJ0-2Mix is a two-source, 8 kHz checkpoint. It is not an arbitrary-N, identity-conditioned separator and is not sufficient as the final general-purpose Audio-only engine.
- AV-MossFormer2 is a visual target-speaker extraction model. Its current use must be validated for speaker identity, overlap and clean compact exports.
- The compact-output helper is a post-processing utility, not a substitute for a capable diarization and speaker-conditioned separation model. Energy-based silence trimming can misclassify quiet speech or residual noise; it must be tested and tuned against real recordings.
- Full offline distribution requires every selected model weight and dependency to be bundled and license-checked.
