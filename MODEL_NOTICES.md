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
- This checkpoint is a two-source model at 8 kHz. It returns two estimated audio sources, not an arbitrary number of speakers, and Source 1/Source 2 are not verified speaker identities. Quality must be tested on real multilingual recordings.
- Check the upstream model card and license before distributing builds.
