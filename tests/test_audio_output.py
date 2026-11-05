import unittest
import numpy as np
from audio_output import compact_audio, detect_speech_intervals


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


if __name__ == "__main__":
    unittest.main()
