import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from compiler import CurriculumCompileError
from sound_inventory import apply_sound_inventory_fidelity


def _runtime(items, *, step="2", substep="5"):
    parts = [{"part": n, "data": {}} for n in range(1, 11)]
    parts[5]["data"] = {"quickDrillReverse": list(items)}
    return {"step": step, "substep": substep, "parts": parts}


class SoundInventoryTests(unittest.TestCase):
    def setUp(self):
        handle = tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False)
        handle.close()
        self.db = Path(handle.name)
        connection = sqlite3.connect(self.db)
        connection.execute(
            """
            CREATE TABLE inventory_records (
                inventory_id INTEGER PRIMARY KEY,
                lane TEXT,
                category TEXT,
                step TEXT,
                substep TEXT,
                fields_json TEXT
            )
            """
        )
        rows = [
            (1, "1", "1.1", "/ă/", "a", "Short Vowel", "Short Vowels"),
            (2, "1", "1.1", "/m/", "m", "Single Consonant", "Consonants"),
            (3, "2", "2.3", "/īnd/", "ind", "Other", "Syllable Exceptions"),
            (4, "5", "5.1", "/ā/", "a", "Long Vowel", "Vowel Sounds Chart"),
        ]
        for inventory_id, step, substep, phoneme, grapheme, kind, section in rows:
            fields = {
                "Phoneme": phoneme,
                "Grapheme": grapheme,
                "Correspondence Type": kind,
                "Student Notebook Entry": "Yes",
                "Student Notebook Page or Section": section,
            }
            connection.execute(
                "INSERT INTO inventory_records VALUES (?, 'clean', 'Phoneme Grapheme Correspondence', ?, ?, ?)",
                (inventory_id, step, substep, json.dumps(fields)),
            )
        connection.commit()
        connection.close()

    def tearDown(self):
        self.db.unlink(missing_ok=True)

    def test_step_cross_reference_resolves_short_vowel_before_long_vowel_is_taught(self):
        runtime = _runtime(["a", "ind"])
        apply_sound_inventory_fidelity(runtime, {"currentSubstep": "2.5"}, self.db)
        prompts = runtime["parts"][5]["data"]["quickDrillReverse"]
        self.assertEqual(prompts, ["/ă/ → a", "/īnd/ → ind"])

    def test_later_step_bare_grapheme_fails_when_multiple_pronunciations_are_taught(self):
        runtime = _runtime(["a"], step="5", substep="1")
        with self.assertRaises(CurriculumCompileError) as context:
            apply_sound_inventory_fidelity(runtime, {"currentSubstep": "5.1"}, self.db)
        self.assertEqual(context.exception.code, "sound_inventory_grapheme_ambiguous")

    def test_later_step_explicit_marked_phoneme_is_verified_and_preserved(self):
        runtime = _runtime(["/ā/ → a"], step="5", substep="1")
        apply_sound_inventory_fidelity(runtime, {"currentSubstep": "5.1"}, self.db)
        self.assertEqual(runtime["parts"][5]["data"]["quickDrillReverse"], ["/ā/ → a"])
        provenance = runtime["parts"][5]["data"]["soundInventoryProvenance"]
        self.assertEqual(provenance["throughSubstep"], "5.1")
        self.assertTrue(provenance["ambiguousGraphemesFailClosed"])


if __name__ == "__main__":
    unittest.main()
