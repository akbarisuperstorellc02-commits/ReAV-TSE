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
