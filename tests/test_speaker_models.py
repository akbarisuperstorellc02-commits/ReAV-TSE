import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from speaker_models import MODEL_CATALOG, model_status


class SpeakerModelRegistryTests(unittest.TestCase):
    def test_catalog_contains_distinct_roles(self):
        self.assertEqual(MODEL_CATALOG["pyannote_community_1"]["role"], "diarization")
        self.assertEqual(MODEL_CATALOG["falcon_big"]["role"], "audio_visual_target_extraction")
        self.assertEqual(MODEL_CATALOG["spex_plus"]["role"], "audio_only_target_extraction")
        self.assertEqual(MODEL_CATALOG["nvidia_nemotron_diarization"]["role"], "secondary_diarization")

    def test_status_does_not_download_models(self):
        with patch.dict(os.environ, {}, clear=True):
            status = model_status()
        self.assertTrue(status["offline_mode"])
        self.assertIn("pyannote_community_1", status["models"])
        self.assertFalse(status["models"]["pyannote_community_1"]["weights_present"])
        self.assertIn("not mean", status["notice"])

    def test_local_model_path_is_detected(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"REAV_FALCON_MODEL": directory}, clear=True):
                status = model_status()
        self.assertTrue(status["models"]["falcon_big"]["weights_present"])
        self.assertEqual(status["models"]["falcon_big"]["status"], "weights_present_adapter_pending")


if __name__ == "__main__":
    unittest.main()
