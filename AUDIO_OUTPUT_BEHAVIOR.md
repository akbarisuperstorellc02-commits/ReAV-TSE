# Target-speaker-only output behavior

## User-facing goal

The user can choose one detected speaker (for example, their own voice) and export a track containing only that speaker. This behavior applies identically to Video Mode and Audio-only Mode. Video Mode may use visual face-to-voice association to help the user identify a speaker; the audio processing and output semantics remain shared.

## Required timeline semantics

- Preserve the original recording's full duration and timeline alignment. Do not close gaps or shift later speech earlier.
- When the selected speaker is not speaking, write digital silence for that interval. Do not leave another speaker, music, effects, room tone, or environmental noise in the selected speaker's output.
- When another speaker talks alone, that interval must be silent in the selected speaker's output.
- When the selected speaker talks alone, retain only the selected speaker's voice.
- During overlapping speech, extract the selected speaker while suppressing the other speaker(s). If reliable extraction is not possible, mark the interval as uncertain / low confidence and prefer conservative suppression over leaking a clearly different speaker into the selected stem.
- If the selected speaker is silent while other speakers overlap, output silence.
- Do not shorten the file by deleting time ranges. "Delete" means remove the unwanted sound content and replace that time range with silence, preserving synchronization with video and other tracks.

## Clean, natural voice requirements

- Suppress non-selected speakers, music, TV/radio, sound effects, and environmental noise (wind, fan, hiss, crowd) as far as validated models can do so.
- Reduce room reverberation where possible without creating metallic, watery, gated, or robotic artifacts.
- Preserve the selected speaker's natural timbre, pitch, consonants, syllables, intelligibility, and dynamics.
- Do not add creative effects, echo, artificial reverb, pitch shifting, or unnecessary EQ/compression.
- Avoid aggressive denoising that removes quiet words, breaths that are part of speech, or word endings.
- Keep silence genuinely silent; do not fill it with residual background noise.
- Provide a high-quality lossless WAV export by default where practical. Preserve source timing and avoid unnecessary downmixing or low-rate conversion in the final export. Internal model resampling must be handled explicitly and restored carefully.

## Shared processing architecture

1. Detect speech activity, estimate the number of speakers, assign stable anonymous speaker IDs, and detect overlapping speech.
2. Let the user identify the target speaker using auditionable samples and, in Video Mode where available, face-to-voice association.
3. Run speaker-conditioned, overlap-aware extraction for the selected identity. Do not treat a fixed two-output separator as arbitrary-N speaker separation, and do not label anonymous source channels as verified people.
4. Apply conservative speech cleanup (noise/music suppression and dereverberation) to the selected stem, with artifact checks.
5. Apply a target-speaker activity mask so intervals with no target speech become digital silence. Use short boundary fades only to prevent clicks; do not alter timing.
6. Run quality checks for residual other-speaker leakage, speech distortion, clipping, missing syllables, and unexpected non-silent gaps. Flag uncertain regions instead of claiming perfect extraction.

## Validation requirements

- Test both Video Mode and Audio-only Mode with target-only speech, other-speaker-only speech, alternating turns, overlapping turns, music/effects, environmental noise, and reverberant rooms.
- Include Afghan Dari, Pashto, Arabic, and English recordings, including overlap-heavy examples.
- Evaluate diarization and overlap detection (for example DER/JER), separation quality (for example SI-SDR/SI-SDRi where references exist), speech intelligibility, leakage, and human listening.
- Verify that output duration and timestamps remain aligned with the original.
- No claim of perfect or guaranteed separation: heavily overlapping or acoustically ambiguous speech may require a low-confidence warning or manual review.

## Current implementation warning

The existing SpeechBrain SepFormer WSJ0-2Mix checkpoint is a two-source, 8 kHz model and is not a valid final implementation of automatic-N, identity-conditioned target-speaker extraction. It may remain only as an explicitly experimental path until replaced and evaluated. The existing AV target-speaker path also needs to be validated against the same target-only silence and clean-voice requirements.