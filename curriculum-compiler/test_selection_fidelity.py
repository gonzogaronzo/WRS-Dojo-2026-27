import unittest

from compiler import CurriculumCompileError
from selection_fidelity import validate_selection_fidelity


def base_runtime():
    parts = [{"part": n, "data": {}} for n in range(1, 11)]
    parts[5]["data"] = {
        "quickDrillReverse": ["/ă/ → a", "/m/ → m", "/sh/ → sh"],
        "selectionComposition": {
            "vowelCount": 1,
            "otherSoundCount": 2,
            "includesPreviouslyTaught": True,
            "newSoundsExist": False,
            "includesCurrentOrNew": False,
            "targetsDocumentedTroubleSpots": True,
        },
    }
    parts[7]["data"] = {
        "dictation": {
            "sounds": ["s1", "s2", "s3", "s4", "s5"],
            "wordElements": ["e1", "e2", "e3", "e4", "e5"],
            "realWords": ["r1", "r2", "r3", "r4", "r5"],
            "nonsenseWords": ["n1", "n2", "n3"],
            "phrases": ["p1", "p2", "p3"],
            "sentences": ["x1", "x2", "x3"],
        },
        "selectionComposition": {
            "currentAndPreviousMixedCategories": [
                "sounds", "wordElements", "realWords", "nonsenseWords", "phrases"
            ],
            "sentencesAreCurrentSubstep": True,
            "targetsDocumentedTroubleSpots": True,
        },
    }
    return {"parts": parts}


class SelectionFidelityTests(unittest.TestCase):
    def test_valid_mixed_composition_passes(self):
        validate_selection_fidelity(base_runtime(), {"troubleSpots": ["vowel confusion"]})

    def test_part6_bare_vowel_fails_closed(self):
        runtime = base_runtime()
        runtime["parts"][5]["data"]["quickDrillReverse"][0] = "/a/ → a"
        with self.assertRaises(CurriculumCompileError) as context:
            validate_selection_fidelity(runtime, {"troubleSpots": []})
        self.assertEqual(context.exception.code, "part6_vowel_diacritic_required")

    def test_part8_wrong_count_fails_closed(self):
        runtime = base_runtime()
        runtime["parts"][7]["data"]["dictation"]["realWords"].pop()
        with self.assertRaises(CurriculumCompileError) as context:
            validate_selection_fidelity(runtime, {"troubleSpots": []})
        self.assertEqual(context.exception.code, "part8_realWords_count_failed")

    def test_part6_missing_composition_metadata_fails_closed(self):
        runtime = base_runtime()
        del runtime["parts"][5]["data"]["selectionComposition"]
        with self.assertRaises(CurriculumCompileError) as context:
            validate_selection_fidelity(runtime, {"troubleSpots": []})
        self.assertEqual(context.exception.code, "part6_selection_composition_unverified")

    def test_part8_current_review_mix_is_required(self):
        runtime = base_runtime()
        runtime["parts"][7]["data"]["selectionComposition"]["currentAndPreviousMixedCategories"] = ["sounds"]
        with self.assertRaises(CurriculumCompileError) as context:
            validate_selection_fidelity(runtime, {"troubleSpots": []})
        self.assertEqual(context.exception.code, "part8_current_review_mix_failed")


if __name__ == "__main__":
    unittest.main()
