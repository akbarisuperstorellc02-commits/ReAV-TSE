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

    def test_overlap_detection_finds_cross_speaker_intersections(self):
        from speaker_models import find_speaker_overlaps

        segments = [
            {"speaker": "S1", "start": 0.0, "end": 2.0},
            {"speaker": "S2", "start": 1.0, "end": 3.0},
            {"speaker": "S3", "start": 1.5, "end": 2.5},
        ]
        self.assertEqual(
            find_speaker_overlaps(segments),
            [
                {"start": 1.0, "end": 2.0, "speakers": ["S1", "S2"]},
                {"start": 1.5, "end": 2.0, "speakers": ["S1", "S3"]},
                {"start": 1.5, "end": 2.5, "speakers": ["S2", "S3"]},
            ],
        )

    def test_overlap_detection_excludes_same_speaker_and_touching_edges(self):
        from speaker_models import find_speaker_overlaps

        segments = [
            {"speaker": "S1", "start": 0.0, "end": 2.0},
            {"speaker": "S1", "start": 1.0, "end": 3.0},
            {"speaker": "S2", "start": 3.0, "end": 4.0},
        ]
        self.assertEqual(find_speaker_overlaps(segments), [])

    def test_overlap_detection_sorts_unsorted_input_deterministically(self):
        from speaker_models import find_speaker_overlaps

        segments = [
            {"speaker": "B", "start": 2.0, "end": 4.0},
            {"speaker": "A", "start": 0.0, "end": 3.0},
        ]
        self.assertEqual(
            find_speaker_overlaps(segments),
            [{"start": 2.0, "end": 3.0, "speakers": ["A", "B"]}],
        )

    def test_overlap_detection_rejects_invalid_times(self):
        from speaker_models import find_speaker_overlaps

        with self.assertRaises(ValueError):
            find_speaker_overlaps([{"speaker": "S1", "start": 2.0, "end": 1.0}])

    def test_status_does_not_download_models(self):
        with patch.dict(os.environ, {}, clear=True):
            status = model_status()
        self.assertTrue(status["offline_mode"])
        self.assertIn("pyannote_community_1", status["models"])
        self.assertFalse(status["models"]["pyannote_community_1"]["weights_present"])
        self.assertIn("not mean", status["notice"])
        self.assertFalse(status["capabilities"]["audio_only_identity_conditioned_extraction"])
        self.assertFalse(status["capabilities"]["arbitrary_speaker_count_waveform_separation"])
        self.assertFalse(status["release_quality_gate"]["ready"])
        self.assertEqual(status["release_quality_gate"]["required_languages"],
                         ["fa-af", "ps-af", "ar", "en-us"])

    def test_local_model_path_is_detected(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"REAV_FALCON_MODEL": directory}, clear=True):
                status = model_status()
        self.assertTrue(status["models"]["falcon_big"]["weights_present"])
        self.assertEqual(status["models"]["falcon_big"]["status"], "weights_present_adapter_pending")


if __name__ == "__main__":
    unittest.main()
