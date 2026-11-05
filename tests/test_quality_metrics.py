import unittest
import numpy as np

from quality_metrics import evaluate_separation, si_sdr


class QualityMetricTests(unittest.TestCase):
    def setUp(self):
        self.sr = 16000
        t = np.arange(self.sr, dtype=np.float64) / self.sr
        self.target = np.sin(2 * np.pi * 220 * t)
        self.interference = np.sin(2 * np.pi * 440 * t)

    def test_si_sdr_rewards_clean_target(self):
        noisy = self.target + 0.25 * self.interference
        self.assertGreater(si_sdr(self.target, self.target), 100.0)
        self.assertGreater(si_sdr(self.target, self.target), si_sdr(self.target, noisy))

    def test_improvement_is_measured_against_mixture(self):
        mixture = self.target + self.interference
        estimate = self.target + 0.1 * self.interference
        report = evaluate_separation(
            self.target, estimate, mixture,
            interference_reference=self.interference,
            sample_rate=self.sr,
        )
        self.assertGreater(report["si_sdri_db"], 0)
        self.assertIn("interference_si_sdr_db", report)
        self.assertFalse(report["compaction_applied"])
        self.assertEqual(report["samples_scored"], self.sr)

    def test_misaligned_inputs_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "equal-length"):
            evaluate_separation(self.target, self.target[:-1], self.target, sample_rate=self.sr)

    def test_zero_energy_reference_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "zero energy"):
            si_sdr(np.zeros(100), np.ones(100))

    def test_non_finite_samples_are_rejected(self):
        bad = self.target.copy()
        bad[0] = np.nan
        with self.assertRaisesRegex(ValueError, "NaN or infinite"):
            si_sdr(self.target, bad)

    def test_invalid_sample_rate_is_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_separation(self.target, self.target, self.target, sample_rate=0)


if __name__ == "__main__":
    unittest.main()
