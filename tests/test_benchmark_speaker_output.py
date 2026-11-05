import unittest

import numpy as np

from tools.benchmark_speaker_output import benchmark, si_sdr


class SeparationBenchmarkTests(unittest.TestCase):
    def setUp(self):
        self.rate = 16000
        t = np.arange(self.rate, dtype=np.float64) / self.rate
        self.target = 0.3 * np.sin(2 * np.pi * 220 * t)
        self.other = 0.2 * np.sin(2 * np.pi * 440 * t)
        self.mixture = self.target + self.other

    def test_clean_target_scores_better_than_mixture(self):
        score_mix = si_sdr(self.target, self.mixture)
        score_clean = si_sdr(self.target, self.target)
        self.assertGreater(score_clean, score_mix + 20)

    def test_benchmark_reports_si_sdri_and_interference_proxy(self):
        import tempfile
        from pathlib import Path
        import soundfile as sf

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            paths = {
                "mix": root / "mix.wav",
                "target": root / "target.wav",
                "other": root / "other.wav",
                "estimate": root / "estimate.wav",
            }
            for key, data in (
                ("mix", self.mixture),
                ("target", self.target),
                ("other", self.other),
                ("estimate", self.target + 0.05 * self.other),
            ):
                sf.write(paths[key], data, self.rate)
            report = benchmark(paths["mix"], paths["target"], paths["estimate"], paths["other"])
            self.assertGreater(report["si_sdri_db"], 0)
            self.assertIn("interferer_to_target_projection_db", report)
            self.assertEqual(report["alignment"], "same-rate, same-length, source-timeline")

    def test_rejects_misaligned_compacted_audio(self):
        with self.assertRaises(ValueError):
            from tools.benchmark_speaker_output import benchmark as run_benchmark
            import tempfile
            from pathlib import Path
            import soundfile as sf
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                mix, target, estimate = root / "mix.wav", root / "target.wav", root / "estimate.wav"
                sf.write(mix, self.mixture, self.rate)
                sf.write(target, self.target, self.rate)
                sf.write(estimate, self.target[:-100], self.rate)
                run_benchmark(mix, target, estimate)


if __name__ == "__main__":
    unittest.main()
