import unittest
import numpy as np
from audio_output import compact_audio, detect_speech_intervals, normalize_intervals, restore_estimate_scale


class CompactOutputTests(unittest.TestCase):
    def test_silence_between_speech_is_removed(self):
        sr = 16000
        voice = np.ones(sr, dtype=np.float32) * 0.2
        silence = np.zeros(sr, dtype=np.float32)
        source = np.concatenate([voice, silence, voice])
        compacted, intervals = compact_audio(source, sr)
        self.assertEqual(len(intervals), 2)
        self.assertLess(len(compacted), len(source))
        self.assertGreaterEqual(len(compacted) / sr, 2.0)
        self.assertLess(len(compacted) / sr, 2.1)

    def test_empty_audio_has_no_intervals(self):
        intervals = detect_speech_intervals(np.zeros(8000, dtype=np.float32), 8000)
        self.assertEqual(intervals, [])

    def test_unsorted_overlapping_intervals_are_merged(self):
        audio = np.arange(20, dtype=np.float32)
        compacted, intervals = compact_audio(
            audio, 10, intervals=[(10, 15), (2, 8), (6, 12), (-5, 1), (18, 40)]
        )
        self.assertEqual(intervals, [(0, 1), (2, 15), (18, 20)])
        expected = np.concatenate([audio[0:1], audio[2:15], audio[18:20]])[:, None]
        self.assertEqual(compacted.shape, (16, 1))
        np.testing.assert_array_equal(compacted, expected)

    def test_duplicate_intervals_do_not_duplicate_audio(self):
        audio = np.arange(10, dtype=np.float32)
        compacted, intervals = compact_audio(audio, 10, intervals=[(0, 5), (0, 5), (3, 8)])
        self.assertEqual(intervals, [(0, 8)])
        np.testing.assert_array_equal(compacted[:, 0], audio[:8])

    def test_invalid_sample_rate_is_rejected(self):
        with self.assertRaises(ValueError):
            compact_audio(np.zeros(10, dtype=np.float32), 0)

    def test_non_finite_samples_are_safely_zeroed(self):
        audio = np.array([0.1, np.nan, np.inf, -np.inf], dtype=np.float32)
        compacted, _ = compact_audio(audio, 10, intervals=[(0, 4)])
        self.assertTrue(np.isfinite(compacted).all())
        self.assertEqual(compacted[1, 0], 0.0)


class EstimateRestorationTests(unittest.TestCase):
    def test_restores_original_segment_gain(self):
        source = np.array([0.0, 0.5, -1.0, 0.25], dtype=np.float32)
        estimate = np.array([0.0, 0.8, -0.6, 0.2], dtype=np.float32)
        restored = restore_estimate_scale(estimate, source, 16000)
        np.testing.assert_allclose(restored, estimate, rtol=1e-6, atol=1e-7)
        # With a lower-gain original segment, output gain is reduced too.
        quiet_source = source * 0.1
        quiet = restore_estimate_scale(estimate, quiet_source, 16000)
        self.assertAlmostEqual(float(np.max(np.abs(quiet))), 0.08, places=6)

    def test_small_decoder_length_drift_is_corrected(self):
        source = np.ones(1000, dtype=np.float32) * 0.2
        estimate = np.ones(995, dtype=np.float32)
        restored = restore_estimate_scale(estimate, source, 16000)
        self.assertEqual(len(restored), len(source))
        np.testing.assert_allclose(restored[-5:], 0.0)

    def test_large_length_drift_is_rejected(self):
        source = np.ones(16000, dtype=np.float32)
        estimate = np.ones(15000, dtype=np.float32)
        with self.assertRaisesRegex(ValueError, "Refusing timeline misalignment"):
            restore_estimate_scale(estimate, source, 16000)

    def test_non_finite_estimate_is_rejected(self):
        source = np.ones(100, dtype=np.float32)
        estimate = source.copy()
        estimate[0] = np.nan
        with self.assertRaisesRegex(ValueError, "finite samples"):
            restore_estimate_scale(estimate, source, 16000)

    def test_silent_source_returns_silence(self):
        source = np.zeros(100, dtype=np.float32)
        restored = restore_estimate_scale(np.ones(100, dtype=np.float32), source, 16000)
        self.assertTrue(np.array_equal(restored, source))


class IntervalNormalizationTests(unittest.TestCase):
    def test_clamp_sort_and_merge(self):
        self.assertEqual(
            normalize_intervals([(8, 12), (2, 4), (3, 9), (-4, 1), (7, 7)], 10),
            [(0, 1), (2, 10)],
        )


if __name__ == "__main__":
    unittest.main()
