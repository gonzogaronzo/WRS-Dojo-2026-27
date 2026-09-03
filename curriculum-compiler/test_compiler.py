import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from compiler import CurriculumCompileError, CurriculumCompiler, EXPECTED_RELEASE_ID


class CurriculumCompilerTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tempdir.name) / 'test.sqlite'
        self._build_database()
        self.compiler = CurriculumCompiler(self.db_path)

    def tearDown(self):
        self.tempdir.cleanup()

    def _build_database(self):
        connection = sqlite3.connect(self.db_path)
        connection.executescript(
            '''
            CREATE TABLE release_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE coverage (substep TEXT NOT NULL, part_number INTEGER NOT NULL, query_status TEXT NOT NULL, automatic_fidelity_status TEXT NOT NULL, governing_locator TEXT NOT NULL, PRIMARY KEY (substep, part_number));
            CREATE TABLE lesson_fixtures (fixture_id TEXT PRIMARY KEY, substep TEXT NOT NULL, schema_version TEXT NOT NULL, fixture_json TEXT NOT NULL, validation_status TEXT NOT NULL);
            CREATE TABLE source_registry (source_id TEXT PRIMARY KEY, authority_lane TEXT NOT NULL, edition TEXT, coverage TEXT, completeness_status TEXT, metadata_json TEXT NOT NULL);
            CREATE TABLE source_documents (document_id INTEGER PRIMARY KEY, source_id TEXT NOT NULL, file_name TEXT NOT NULL, relative_path TEXT NOT NULL, sha256 TEXT NOT NULL, document_type TEXT NOT NULL, fidelity_status TEXT NOT NULL);
            CREATE TABLE source_chunks (chunk_id INTEGER PRIMARY KEY, document_id INTEGER NOT NULL, substep TEXT, locator TEXT NOT NULL, heading TEXT, content TEXT NOT NULL);
            CREATE TABLE inventory_records (inventory_id INTEGER PRIMARY KEY, category TEXT NOT NULL, lane TEXT NOT NULL, step TEXT, substep TEXT, label TEXT, source_file TEXT NOT NULL, fields_json TEXT NOT NULL);
            '''
        )
        metadata = {
            'release_id': EXPECTED_RELEASE_ID,
            'student_data_included': 'false',
            'automatic_fidelity_policy': 'fail_closed',
            'canonical_record_parts': '10',
        }
        connection.executemany('INSERT INTO release_metadata(key, value) VALUES (?, ?)', metadata.items())
        for part in range(1, 10):
            connection.execute(
                'INSERT INTO coverage VALUES (?, ?, ?, ?, ?)',
                ('8.2', part, 'validated_golden_fixture', 'eligible_for_fixture', f'fixture part {part}')
            )
        connection.execute(
            'INSERT INTO coverage VALUES (?, ?, ?, ?, ?)',
            ('8.2', 10, 'teacher_selection_required_by_design', 'not_applicable_teacher_controls', 'teacher selection')
        )

        source_rows = [
            ('SI-08', 'canonical_visual', 'Fourth Edition', 'Step 8', 'complete', '{}'),
            ('READERS-07-12', 'canonical_visual', 'Fourth Edition', 'Reader 8', 'complete', '{}'),
            ('DICT-07-12-4E', 'canonical_visual', 'Fourth Edition', 'Dictation', 'complete', '{}'),
            ('TEACHER-SELECTION', 'teacher_selected', 'Not applicable', 'Runtime teacher choice', 'runtime_placeholder', '{}'),
        ]
        connection.executemany('INSERT INTO source_registry VALUES (?, ?, ?, ?, ?, ?)', source_rows)
        connection.execute(
            'INSERT INTO source_documents VALUES (?, ?, ?, ?, ?, ?, ?)',
            (1, 'READERS-07-12', 'student-reader-08.md', 'student-reader-08.md', 'mock', 'student_reader', 'accepted_searchable')
        )
        sentence_lines = '\n'.join(f'{index}. Mock controlled sentence {index}.' for index in range(1, 11))
        connection.execute(
            'INSERT INTO source_chunks VALUES (?, ?, ?, ?, ?, ?)',
            (1, 1, '8.2', '50 / 48', 'sentences', f'## PDF Page 50\n**Substep:** 8.2 AB\n{sentence_lines}')
        )
        connection.execute(
            'INSERT INTO source_chunks VALUES (?, ?, ?, ?, ?, ?)',
            (2, 1, '8.2', '60 / 58', 'passage 1', '## PDF Page 60\n**Substep:** 8.2 AB\n#### Backyard Visitor\n' + ('A porcupine visited the backyard. ' * 15))
        )
        connection.execute(
            'INSERT INTO source_chunks VALUES (?, ?, ?, ?, ?, ?)',
            (3, 1, '8.2', '61 / 59', 'passage 2', '## PDF Page 61\n**Substep:** 8.2 AB\n' + ('The porcupine left the garden safely. ' * 15))
        )

        for index, (phoneme, grapheme) in enumerate([
            ('/ar/', 'ar'), ('/er/', 'er'), ('/ir/', 'ir'), ('/ur/', 'ur'), ('/or/', 'or')
        ], start=1):
            connection.execute(
                'INSERT INTO inventory_records VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                (index, 'Phoneme Grapheme Correspondence', 'clean', '8', '8.1', phoneme, 'mock.xlsx', json.dumps({
                    'Correspondence Type': 'R-Controlled Vowel', 'Grapheme': grapheme
                }))
            )

        default_ref = {'sourceId': 'SI-08', 'edition': 'Fourth Edition', 'locator': 'mock'}
        parts = []
        for number, name in enumerate([
            'Sounds Quick Drill', 'Teach and Review Concepts for Reading', 'Word Cards', 'Wordlist Reading',
            'Sentence Reading', 'Quick Drill in Reverse', 'Teach and Review Concepts for Spelling',
            'Written Work Dictation', 'Controlled Passage Reading', 'Listening/Reading Fluency and Comprehension'
        ], start=1):
            parts.append({
                'partNumber': number,
                'name': name,
                'objective': f'Mock objective {number}',
                'directions': [f'Mock direction {number}'],
                'sourceRefs': [dict(default_ref)],
            })
        parts[2]['currentHighFrequencyWords'] = ['superior', 'vary', 'varies', 'variety', 'vocabulary', 'area', 'garage']
        parts[3]['practiceSelection'] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
        parts[3]['chartingSelection'] = [f'c{i}' for i in range(1, 16)]
        parts[4]['sourceRefs'].append({'sourceId': 'READERS-07-12', 'edition': 'Fourth Edition', 'locator': 'Reader p.48'})
        parts[7]['sourceRefs'].append({'sourceId': 'DICT-07-12-4E', 'edition': 'Fourth Edition', 'locator': 'Dictation'})
        parts[7]['dictationItems'] = [
            {'itemType': 'sound', 'text': '/ar/'},
            {'itemType': 'word_element', 'text': '-form-'},
            {'itemType': 'word', 'text': 'market'},
            {'itemType': 'phrase', 'text': 'mock phrase'},
            {'itemType': 'sentence', 'text': 'Mock dictation sentence.'},
        ]
        parts[8]['sourceRefs'] = [{'sourceId': 'READERS-07-12', 'edition': 'Fourth Edition', 'locator': 'Reader pp.58-59'}]
        parts[8]['passageTitle'] = 'Backyard Visitor'
        parts[9]['sourceRefs'] = [{'sourceId': 'TEACHER-SELECTION', 'edition': 'Not applicable', 'locator': 'Runtime teacher choice'}]

        fixture = {
            'schemaVersion': '1.0.1',
            'curriculumReleaseId': EXPECTED_RELEASE_ID,
            'lessonId': 'golden-8.2-introductory',
            'substep': '8.2',
            'parts': parts,
        }
        connection.execute(
            'INSERT INTO lesson_fixtures VALUES (?, ?, ?, ?, ?)',
            ('golden-8.2-introductory', '8.2', '1.0.1', json.dumps(fixture), 'validated_structural_and_provenance')
        )
        connection.commit()
        connection.close()

    def test_compile_returns_ten_part_dojo_runtime(self):
        runtime = self.compiler.compile({
            'groupId': 'test-group',
            'currentSubstep': '8.2',
            'lessonFocus': 'introduction',
            'lessonPath': 'block1+3',
            'conceptsToWeave': ['review'],
            'troubleSpots': ['target'],
        })
        self.assertEqual(runtime['curriculumReleaseId'], EXPECTED_RELEASE_ID)
        self.assertEqual([part['part'] for part in runtime['parts']], list(range(1, 11)))
        self.assertEqual(runtime['plannedParts'], [1, 2, 3, 4, 5, 9, 10])
        self.assertEqual(len(runtime['parts'][3]['data']['practiceWords']), 6)
        self.assertEqual(len(runtime['parts'][3]['data']['chartingWords']), 15)
        self.assertEqual(runtime['parts'][9]['data']['listeningComprehension']['mode'], 'teacher-selected')

    def test_unsupported_substep_fails_closed(self):
        with self.assertRaises(CurriculumCompileError) as context:
            self.compiler.compile({'groupId': 'g', 'currentSubstep': '3.1', 'lessonFocus': 'introduction'})
        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.code, 'substep_not_enabled')


if __name__ == '__main__':
    unittest.main()
