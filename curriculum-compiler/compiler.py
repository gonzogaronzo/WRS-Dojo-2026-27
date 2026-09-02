from __future__ import annotations

import json
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EXPECTED_RELEASE_ID = "WRS-CURRICULUM-1.0.1-2026-09-02"
SUPPORTED_SUBSTEPS = {"8.2"}
CANONICAL_FOCI = {"introduction", "accuracy", "automaticity-fluency"}


class CurriculumCompileError(RuntimeError):
    def __init__(self, message: str, *, status_code: int = 422, code: str = "compile_failed"):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


class CurriculumCompiler:
    def __init__(self, database_path: str | Path, expected_release_id: str = EXPECTED_RELEASE_ID):
        self.database_path = Path(database_path)
        if not self.database_path.exists():
            raise CurriculumCompileError(
                f"Curriculum database was not found at {self.database_path}.",
                status_code=503,
                code="database_missing",
            )
        self.expected_release_id = expected_release_id

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(f"file:{self.database_path}?mode=ro", uri=True)
        connection.row_factory = sqlite3.Row
        return connection

    def _release_metadata(self, connection: sqlite3.Connection) -> dict[str, str]:
        return {row["key"]: row["value"] for row in connection.execute("SELECT key, value FROM release_metadata")}

    def _assert_release(self, connection: sqlite3.Connection) -> dict[str, str]:
        metadata = self._release_metadata(connection)
        release_id = metadata.get("release_id")
        if release_id != self.expected_release_id:
            raise CurriculumCompileError(
                f"Expected curriculum release {self.expected_release_id}, but database reports {release_id or 'no release id'}.",
                status_code=503,
                code="release_mismatch",
            )
        if metadata.get("student_data_included") != "false":
            raise CurriculumCompileError(
                "Curriculum database reports student data. Refusing to use it as the read-only curriculum service.",
                status_code=503,
                code="student_data_boundary_failed",
            )
        if metadata.get("automatic_fidelity_policy") != "fail_closed":
            raise CurriculumCompileError(
                "Curriculum release is not configured for fail-closed automatic fidelity.",
                status_code=503,
                code="fidelity_policy_failed",
            )
        if metadata.get("canonical_record_parts") != "10":
            raise CurriculumCompileError(
                "Curriculum release does not declare the canonical ten-part lesson record.",
                status_code=503,
                code="canonical_parts_failed",
            )
        return metadata

    def _assert_coverage(self, connection: sqlite3.Connection, substep: str) -> None:
        rows = connection.execute(
            "SELECT part_number, query_status, automatic_fidelity_status FROM coverage WHERE substep = ? ORDER BY part_number",
            (substep,),
        ).fetchall()
        if len(rows) != 10 or [row["part_number"] for row in rows] != list(range(1, 11)):
            raise CurriculumCompileError(
                f"Substep {substep} does not have a complete ten-part coverage record.",
                code="coverage_incomplete",
            )
        for row in rows:
            part = row["part_number"]
            query_status = row["query_status"]
            fidelity = row["automatic_fidelity_status"]
            if part <= 9 and not (query_status == "validated_golden_fixture" and fidelity == "eligible_for_fixture"):
                raise CurriculumCompileError(
                    f"Part {part} of Substep {substep} is not eligible for source-faithful automatic generation.",
                    code="coverage_not_eligible",
                )
            if part == 10 and fidelity != "not_applicable_teacher_controls":
                raise CurriculumCompileError(
                    "Part 10 is not marked as teacher-controlled in this release.",
                    code="part10_gate_failed",
                )

    def _load_fixture(self, connection: sqlite3.Connection, substep: str) -> dict[str, Any]:
        row = connection.execute(
            """
            SELECT fixture_json, validation_status
            FROM lesson_fixtures
            WHERE substep = ?
            ORDER BY fixture_id
            LIMIT 1
            """,
            (substep,),
        ).fetchone()
        if not row or row["validation_status"] != "validated_structural_and_provenance":
            raise CurriculumCompileError(
                f"Substep {substep} does not have a validated structural-and-provenance fixture.",
                code="fixture_not_validated",
            )
        fixture = json.loads(row["fixture_json"])
        if fixture.get("curriculumReleaseId") != self.expected_release_id:
            raise CurriculumCompileError(
                "Fixture release provenance does not match the requested curriculum release.",
                code="fixture_release_mismatch",
            )
        return fixture

    @staticmethod
    def _part(fixture: dict[str, Any], part_number: int) -> dict[str, Any]:
        for part in fixture.get("parts", []):
            if part.get("partNumber") == part_number:
                return part
        raise CurriculumCompileError(f"Validated fixture is missing Part {part_number}.", code="fixture_part_missing")

    @staticmethod
    def _teacher_directions(part: dict[str, Any]) -> list[str]:
        directions = [str(item).strip() for item in part.get("directions", []) if str(item).strip()]
        objective = str(part.get("objective", "")).strip()
        return ([objective] if objective else []) + directions

    @staticmethod
    def _planned_parts(lesson_path: str) -> list[int]:
        if lesson_path == "block1+3":
            return [1, 2, 3, 4, 5, 9, 10]
        if lesson_path == "block2+3":
            return [6, 7, 8, 9, 10]
        return list(range(1, 11))

    def _source_rows(self, connection: sqlite3.Connection, fixture: dict[str, Any]) -> list[dict[str, Any]]:
        refs: dict[str, dict[str, Any]] = {}
        for part in fixture.get("parts", []):
            for ref in part.get("sourceRefs", []):
                source_id = ref.get("sourceId")
                if source_id and source_id not in refs:
                    refs[source_id] = ref
            for item in part.get("dictationItems", []):
                ref = item.get("sourceRef") or {}
                source_id = ref.get("sourceId")
                if source_id and source_id not in refs:
                    refs[source_id] = ref

        labels = {
            "SI-08": "WRS Step 8 Step Instruction",
            "READERS-07-12": "WRS Student Reader 8",
            "DICT-07-12-4E": "WRS Dictation Book Steps 7-12",
            "TEACHER-SELECTION": "Teacher-selected Part 10 text",
        }
        kinds = {
            "SI-08": "step-instruction",
            "READERS-07-12": "student-reader",
            "DICT-07-12-4E": "dictation-book",
            "TEACHER-SELECTION": "teacher-selection",
        }
        result: list[dict[str, Any]] = []
        for source_id, ref in refs.items():
            registry = connection.execute(
                "SELECT authority_lane, edition, coverage, completeness_status FROM source_registry WHERE source_id = ?",
                (source_id,),
            ).fetchone()
            if not registry:
                raise CurriculumCompileError(
                    f"Fixture source {source_id} is not registered in the release.",
                    code="source_registry_missing",
                )
            result.append(
                {
                    "id": source_id,
                    "label": labels.get(source_id, source_id),
                    "kind": kinds.get(source_id, "teacher-selection"),
                    "edition": ref.get("edition") or registry["edition"] or None,
                    "locator": ref.get("locator") or registry["coverage"] or None,
                    "notes": f"Release {self.expected_release_id}; authority lane {registry['authority_lane']}; status {registry['completeness_status']}.",
                }
            )
        return result

    def _source_chunk(self, connection: sqlite3.Connection, *, source_id: str, file_name: str, locator: str) -> str:
        row = connection.execute(
            """
            SELECT c.content
            FROM source_chunks c
            JOIN source_documents d ON d.document_id = c.document_id
            WHERE d.source_id = ? AND d.file_name = ? AND c.locator = ?
            LIMIT 1
            """,
            (source_id, file_name, locator),
        ).fetchone()
        if not row:
            raise CurriculumCompileError(
                f"Required source chunk {source_id} {file_name} {locator} was not found.",
                code="source_chunk_missing",
            )
        return row["content"]

    def _sentences(self, connection: sqlite3.Connection) -> list[str]:
        content = self._source_chunk(
            connection,
            source_id="READERS-07-12",
            file_name="student-reader-08.md",
            locator="50 / 48",
        )
        sentences = []
        for line in content.splitlines():
            match = re.match(r"^\s*\d+\.\s+(.*\S)\s*$", line)
            if match:
                sentences.append(match.group(1))
        if len(sentences) != 10:
            raise CurriculumCompileError(
                "Reader 8 printed p. 48 did not resolve to the expected ten controlled sentences.",
                code="sentence_page_parse_failed",
            )
        return sentences

    @staticmethod
    def _clean_passage_chunk(content: str, *, title: str | None = None) -> str:
        lines = content.splitlines()
        body: list[str] = []
        skipping_header = True
        for line in lines:
            stripped = line.strip()
            if skipping_header:
                if title and stripped == f"#### {title}":
                    skipping_header = False
                    continue
                if not title and stripped and not stripped.startswith("##") and not stripped.startswith("**"):
                    skipping_header = False
                else:
                    continue
            if stripped.startswith("## PDF Page") or stripped.startswith("**Substep:") or stripped.startswith("**Page header"):
                continue
            body.append(line.rstrip())
        return "\n".join(body).strip()

    def _passage(self, connection: sqlite3.Connection) -> str:
        page_58 = self._source_chunk(
            connection,
            source_id="READERS-07-12",
            file_name="student-reader-08.md",
            locator="60 / 58",
        )
        page_59 = self._source_chunk(
            connection,
            source_id="READERS-07-12",
            file_name="student-reader-08.md",
            locator="61 / 59",
        )
        first = self._clean_passage_chunk(page_58, title="Backyard Visitor")
        second = self._clean_passage_chunk(page_59)
        passage = f"Backyard Visitor\n\n{first}\n\n{second}".strip()
        if "porcupine" not in passage.lower() or len(passage) < 600:
            raise CurriculumCompileError(
                "Reader 8 Backyard Visitor passage could not be reconstructed from the registered source chunks.",
                code="passage_parse_failed",
            )
        return passage

    def _r_controlled_graphemes(self, connection: sqlite3.Connection) -> list[str]:
        rows = connection.execute(
            """
            SELECT fields_json
            FROM inventory_records
            WHERE lane = 'clean'
              AND category = 'Phoneme Grapheme Correspondence'
              AND substep = '8.1'
            ORDER BY inventory_id
            """
        ).fetchall()
        graphemes: list[str] = []
        for row in rows:
            fields = json.loads(row["fields_json"])
            if fields.get("Correspondence Type") == "R-Controlled Vowel":
                grapheme = str(fields.get("Grapheme", "")).strip()
                if grapheme and grapheme not in graphemes:
                    graphemes.append(grapheme)
        if graphemes != ["ar", "er", "ir", "ur", "or"]:
            raise CurriculumCompileError(
                "Clean inventory did not resolve the expected five previously taught r-controlled vowel graphemes.",
                code="quick_drill_inventory_failed",
            )
        return graphemes

    def compile(self, request: dict[str, Any]) -> dict[str, Any]:
        substep = str(request.get("currentSubstep") or "").strip()
        if substep not in SUPPORTED_SUBSTEPS:
            raise CurriculumCompileError(
                f"Automatic source-faithful generation is not enabled for Substep {substep or '(not set)'}. The pilot currently supports only Substep 8.2.",
                status_code=409,
                code="substep_not_enabled",
            )

        focus = str(request.get("lessonFocus") or "").strip() or "introduction"
        if focus not in CANONICAL_FOCI:
            raise CurriculumCompileError(
                "Choose Introduction, Accuracy, or Automaticity / Fluency before generating a lesson.",
                code="lesson_focus_required",
            )
        lesson_path = str(request.get("lessonPath") or "full").strip()
        if lesson_path not in {"block1+3", "block2+3", "full"}:
            raise CurriculumCompileError("Lesson path must be block1+3, block2+3, or full.", code="lesson_path_invalid")

        concepts = request.get("conceptsToWeave") or []
        trouble = request.get("troubleSpots") or []
        if not isinstance(concepts, list) or not isinstance(trouble, list):
            raise CurriculumCompileError("Planning context must use arrays for conceptsToWeave and troubleSpots.", code="planning_context_invalid")

        with self._connect() as connection:
            self._assert_release(connection)
            self._assert_coverage(connection, substep)
            fixture = self._load_fixture(connection, substep)
            sources = self._source_rows(connection, fixture)
            sentences = self._sentences(connection)
            passage = self._passage(connection)
            r_controlled = self._r_controlled_graphemes(connection)

            p1 = self._part(fixture, 1)
            p2 = self._part(fixture, 2)
            p3 = self._part(fixture, 3)
            p4 = self._part(fixture, 4)
            p5 = self._part(fixture, 5)
            p6 = self._part(fixture, 6)
            p7 = self._part(fixture, 7)
            p8 = self._part(fixture, 8)
            p9 = self._part(fixture, 9)
            p10 = self._part(fixture, 10)

            hfw = list(p3.get("currentHighFrequencyWords", []))
            prior_hfw = [str(word).strip() for word in request.get("unmasteredPriorHighFrequencyWords", []) if str(word).strip()]
            hfw_packet = list(dict.fromkeys(prior_hfw + hfw))

            dictation = {
                "sounds": [],
                "realWords": [],
                "wordElements": [],
                "nonsenseWords": [],
                "phrases": [],
                "sentences": [],
            }
            category_map = {
                "sound": "sounds",
                "word": "realWords",
                "word_element": "wordElements",
                "phrase": "phrases",
                "sentence": "sentences",
            }
            for item in p8.get("dictationItems", []):
                item_type = item.get("itemType")
                text = str(item.get("text") or "").strip()
                target = category_map.get(item_type)
                if target and text:
                    dictation[target].append(text)
            for required in ("sounds", "realWords", "wordElements", "phrases", "sentences"):
                if not dictation[required]:
                    raise CurriculumCompileError(
                        f"Validated Part 8 fixture lacks required category {required}.",
                        code="part8_category_missing",
                    )

            part3_regular = [
                {"id": "82-word-northwest", "text": "northwest", "type": "regular"},
                {"id": "82-word-reform", "text": "reform", "type": "regular"},
                {"id": "82-word-transform", "text": "transform", "type": "regular"},
                {"id": "82-word-apart", "text": "apart", "type": "regular"},
                {"id": "82-word-import", "text": "import", "type": "regular"},
            ]
            part3_hfw = [
                {"id": f"82-hfw-{index+1}", "text": word, "type": "hfw"}
                for index, word in enumerate(hfw_packet)
            ]

            now = datetime.now(timezone.utc)
            lesson_id = f"generated-8-2-{now.strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8]}"
            title_focus = {
                "introduction": "Introduction",
                "accuracy": "Accuracy",
                "automaticity-fluency": "Automaticity / Fluency",
            }[focus]

            runtime = {
                "schemaVersion": "wrs-runtime-v1",
                "curriculumReleaseId": self.expected_release_id,
                "id": lesson_id,
                "title": f"Step 8.2 · {title_focus}",
                "step": "8",
                "substep": "2",
                "focus": focus,
                "lessonPath": lesson_path,
                "plannedParts": self._planned_parts(lesson_path),
                "planningContext": {
                    "conceptsToWeave": "\n".join(str(item).strip() for item in concepts if str(item).strip()),
                    "troubleSpots": "\n".join(str(item).strip() for item in trouble if str(item).strip()),
                },
                "sources": sources,
                "parts": [
                    {
                        "part": 1,
                        "title": p1["name"],
                        "teacherDirections": self._teacher_directions(p1),
                        "sourceIds": [ref["sourceId"] for ref in p1.get("sourceRefs", [])],
                        "data": {"quickDrill": r_controlled},
                    },
                    {
                        "part": 2,
                        "title": p2["name"],
                        "teacherDirections": self._teacher_directions(p2),
                        "sourceIds": [ref["sourceId"] for ref in p2.get("sourceRefs", [])],
                        "data": {"conceptNotes": p2.get("objective", "") + "\n" + "\n".join(p2.get("directions", []))},
                    },
                    {
                        "part": 3,
                        "title": p3["name"],
                        "teacherDirections": self._teacher_directions(p3),
                        "sourceIds": [ref["sourceId"] for ref in p3.get("sourceRefs", [])],
                        "data": {"wordCards": part3_regular + part3_hfw, "hfwList": hfw_packet},
                    },
                    {
                        "part": 4,
                        "title": p4["name"],
                        "teacherDirections": self._teacher_directions(p4),
                        "sourceIds": [ref["sourceId"] for ref in p4.get("sourceRefs", [])],
                        "data": {
                            "practiceWords": list(p4.get("practiceSelection", [])),
                            "chartingWords": list(p4.get("chartingSelection", [])),
                            "chartingType": "real",
                        },
                    },
                    {
                        "part": 5,
                        "title": p5["name"],
                        "teacherDirections": self._teacher_directions(p5),
                        "sourceIds": [ref["sourceId"] for ref in p5.get("sourceRefs", [])],
                        "data": {"sentences": sentences, "studentReader": "Student Reader 8", "page": "48"},
                    },
                    {
                        "part": 6,
                        "title": p6["name"],
                        "teacherDirections": self._teacher_directions(p6),
                        "sourceIds": [ref["sourceId"] for ref in p6.get("sourceRefs", [])],
                        "data": {"quickDrillReverse": r_controlled, "wordElements": ["-form-", "-part-", "-port-"]},
                    },
                    {
                        "part": 7,
                        "title": p7["name"],
                        "teacherDirections": self._teacher_directions(p7),
                        "sourceIds": [ref["sourceId"] for ref in p7.get("sourceRefs", [])],
                        "data": {"conceptNotes": p7.get("objective", "") + "\n" + "\n".join(p7.get("directions", []))},
                    },
                    {
                        "part": 8,
                        "title": p8["name"],
                        "teacherDirections": self._teacher_directions(p8),
                        "sourceIds": [ref["sourceId"] for ref in p8.get("sourceRefs", [])],
                        "data": {"dictation": dictation},
                    },
                    {
                        "part": 9,
                        "title": p9["name"],
                        "teacherDirections": self._teacher_directions(p9),
                        "sourceIds": [ref["sourceId"] for ref in p9.get("sourceRefs", [])],
                        "data": {
                            "passageTitle": p9.get("passageTitle", "Backyard Visitor"),
                            "studentReader": "Student Reader 8",
                            "page": "58-59",
                            "passage": passage,
                        },
                    },
                    {
                        "part": 10,
                        "title": p10["name"],
                        "teacherDirections": self._teacher_directions(p10),
                        "sourceIds": [ref["sourceId"] for ref in p10.get("sourceRefs", [])],
                        "data": {
                            "listeningComprehension": {
                                "mode": "teacher-selected",
                                "title": "Teacher-selected text",
                                "teacherDirections": self._teacher_directions(p10),
                                "studentPrompt": "Listen/read for meaning and be ready to discuss or retell.",
                                "sourceIds": ["TEACHER-SELECTION"],
                                "workspace": {"mode": "whiteboard", "tools": ["draw", "sticky-notes"]},
                            }
                        },
                    },
                ],
            }

            if [part["part"] for part in runtime["parts"]] != list(range(1, 11)):
                raise CurriculumCompileError("Compiler failed to emit exactly Parts 1–10.", code="runtime_parts_failed")
            if len(runtime["parts"][3]["data"]["practiceWords"]) not in {5, 6}:
                raise CurriculumCompileError("Part 4 practice selection is not 5–6 words.", code="part4_practice_failed")
            if len(runtime["parts"][3]["data"]["chartingWords"]) != 15:
                raise CurriculumCompileError("Part 4 charting selection is not 15 words.", code="part4_charting_failed")
            if set(runtime["parts"][3]["data"]["practiceWords"]) == set(runtime["parts"][3]["data"]["chartingWords"]):
                raise CurriculumCompileError("Part 4 practice and charting selections are not distinct.", code="part4_distinct_failed")
            return runtime
