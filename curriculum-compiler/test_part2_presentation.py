import copy
import unittest

from compiler import CurriculumCompileError
from part2_presentation import apply_part2_semantic_presentation


class Part2SemanticPresentationTests(unittest.TestCase):
    def _runtime(self, focus='introduction'):
        return {
            'schemaVersion': 'wrs-runtime-v1',
            'focus': focus,
            'parts': [
                {'part': 1, 'data': {}},
                {
                    'part': 2,
                    'sourceIds': ['SI-08'],
                    'data': {
                        'conceptNotes': (
                            'Read words containing ar/or r-controlled syllables and complex words with -form-, -part-, and -port-.\n'
                            'Teach with the source demonstrations market, hardware, acorn, portion, shortcut, party, and restart.\n'
                            'Use the source word-element demonstrations inform, depart, export, conform, impart, transport, and report.'
                        )
                    },
                },
            ],
        }

    def test_emits_source_controlled_semantic_frames(self):
        runtime = self._runtime()
        apply_part2_semantic_presentation(runtime)
        presentation = runtime['parts'][1]['data']['part2Presentation']

        self.assertEqual(presentation['version'], 1)
        self.assertEqual(presentation['focus'], 'introduction')
        self.assertEqual(
            [frame['kind'] for frame in presentation['frames']],
            ['explanation', 'tile-row', 'word-elements', 'explanation', 'explanation'],
        )

        r_tiles = presentation['frames'][1]['tiles']
        self.assertEqual(r_tiles, [
            {'text': 'ar', 'role': 'r-controlled'},
            {'text': 'or', 'role': 'r-controlled'},
        ])

        elements = presentation['frames'][2]['elements']
        self.assertEqual(elements, [
            {'text': '-form-', 'role': 'base-element'},
            {'text': '-part-', 'role': 'base-element'},
            {'text': '-port-', 'role': 'base-element'},
        ])

        self.assertEqual(
            presentation['frames'][3]['text'],
            'market, hardware, acorn, portion, shortcut, party, and restart',
        )
        self.assertNotIn('Teach with', presentation['frames'][3]['text'])
        self.assertIn('Teach with', presentation['frames'][3]['teacherCue'])
        self.assertTrue(all(frame.get('provenance') == 'source-verbatim' for frame in presentation['frames']))
        self.assertTrue(all(frame.get('sourceIds') == ['SI-08'] for frame in presentation['frames']))
        self.assertNotIn('syllable-row', [frame['kind'] for frame in presentation['frames']])

    def test_existing_semantic_presentation_is_never_reinterpreted(self):
        runtime = self._runtime(focus='accuracy')
        existing = {
            'version': 1,
            'focus': 'accuracy',
            'frames': [{'id': 'source-frame', 'kind': 'explanation', 'text': 'Source supplied.'}],
        }
        runtime['parts'][1]['data']['part2Presentation'] = copy.deepcopy(existing)
        apply_part2_semantic_presentation(runtime)
        self.assertEqual(runtime['parts'][1]['data']['part2Presentation'], existing)

    def test_non_introductory_generation_fails_closed_without_focus_specific_source_frames(self):
        runtime = self._runtime(focus='accuracy')
        with self.assertRaises(CurriculumCompileError) as context:
            apply_part2_semantic_presentation(runtime)
        self.assertEqual(context.exception.code, 'part2_presentation_focus_not_supported')

    def test_missing_source_text_fails_closed(self):
        runtime = self._runtime()
        runtime['parts'][1]['data']['conceptNotes'] = ''
        with self.assertRaises(CurriculumCompileError) as context:
            apply_part2_semantic_presentation(runtime)
        self.assertEqual(context.exception.code, 'part2_presentation_source_missing')


if __name__ == '__main__':
    unittest.main()
