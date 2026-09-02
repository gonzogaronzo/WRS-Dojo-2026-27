#!/usr/bin/env python3
"""Compile a fail-closed WRS Dojo lesson from a validated curriculum release fixture.

Release 1.0.1 intentionally exposes only Substep 8.2 as the validated golden
automatic-generation fixture. Other Substeps stop rather than synthesize
missing curriculum content. This script is an admin/compiler bridge; it is not
intended to ship the SQLite curriculum database to the browser.
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path
from typing import Any

RELEASE_ID = "WRS-CURRICULUM-1.0.1-2026-09-02"
SCHEMA_VERSION = "1.0.1"
GOLDEN_SUBSTEP = "8.2"


class CompileError(RuntimeError):
    pass


def load_metadata(conn: sqlite3.Connection) -> dict[str, str]:
    rows = conn.execute("SELECT key, value FROM release_metadata").fetchall()
    return {str(key): str(value) for key, value in rows}


def require_release(conn: sqlite3.Connection) -> None:
    metadata = load_metadata(conn)
    if metadata.get("release_id") != RELEASE_ID:
        raise CompileError(
            f"Expected curriculum release {RELEASE_ID}; got {metadata.get('release_id')!r}."
        )
    if metadata.get("automatic_fidelity_policy") != "fail_closed":
        raise CompileError("Curriculum release is not marked fail_closed.")
    if metadata.get("student_data_included") != "false":
        raise CompileError("Curriculum database unexpectedly reports student data.")


def get_fixture(conn: sqlite3.Connection, substep: str) -> dict[str, Any]:
    row = conn.execute(
        """
        SELECT fixture_json, validation_status
        FROM lesson_fixtures
        WHERE substep = ?
        ORDER BY fixture_id
        LIMIT 1
        """,
        (substep,),
    ).fetchone()
    if not row:
        raise CompileError(
            f"Automatic generation blocked for {substep}: "
            "no validated lesson fixture is registered in this release."
        )
    fixture_json, status = row
    if status != "validated_structural_and_provenance":
        raise CompileError(
            f"Automatic generation blocked for {substep}: fixture status is {status!r}."
        )
    fixture = json.loads(fixture_json)
    if fixture.get("schemaVersion") != SCHEMA_VERSION:
        raise CompileError("Fixture schema version does not match Release 1.0.1.")
    if fixture.get("curriculumReleaseId") != RELEASE_ID:
        raise CompileError("Fixture curriculumReleaseId does not match Release 1.0.1.")
    return fixture


def require_coverage(conn: sqlite3.Connection, substep: str) -> None:
    rows = conn.execute(
        """
        SELECT part_number, automatic_fidelity_status
        FROM coverage
        WHERE substep = ?
        ORDER BY part_number
        """,
        (substep,),
    ).fetchall()
    if [row[0] for row in rows] != list(range(1, 11)):
        raise CompileError(f"Coverage table for {substep} does not contain Parts 1-10 exactly once.")
    blocked = [
        (part, status)
        for part, status in rows
        if str(status).startswith("blocked")
    ]
    if blocked:
        summary = ", ".join(f"Part {part}: {status}" for part, status in blocked)
        raise CompileError(f"Automatic generation blocked for {substep}: {summary}")


def source_chunk(
    conn: sqlite3.Connection,
    *,
    file_name: str,
    printed_page: int,
) -> str:
    row = conn.execute(
        """
        SELECT sc.content
        FROM source_chunks sc
        JOIN source_documents sd ON sd.document_id = sc.document_id
        WHERE sd.file_name = ?
          AND sc.locator LIKE ?
        LIMIT 1
        """,
        (file_name, f"% / {printed_page}"),
    ).fetchone()
    if not row:
        raise CompileError(
            f"Required source chunk not found: {file_name}, printed page {printed_page}."
        )
    return str(row[0])


def parse_numbered_sentences(content: str) -> list[str]:
    sentences = []
    for line in content.splitlines():
        match = re.match(r"^\s*\d+\.\s+(.+?)\s*$", line)
        if match:
            sentences.append(match.group(1))
    return sentences


def strip_reader_frontmatter(content: str, heading: str | None = None) -> str:
    text = content
    if heading:
        marker = f"#### {heading}"
        if marker not in text:
            raise CompileError(f"Reader heading not found: {heading}.")
        text = text.split(marker, 1)[1]
    lines = []
    for line in text.splitlines():
        if line.startswith("## PDF Page"):
            continue
        if line.startswith("**Substep:**"):
            continue
        if line.startswith("**Page header"):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def part_by_number(fixture: dict[str, Any], number: int) -> dict[str, Any]:
    matches = [part for part in fixture.get("parts", []) if part.get("partNumber") == number]
    if len(matches) != 1:
        raise CompileError(f"Fixture does not contain Part {number} exactly once.")
    return matches[0]


def compile_82(conn: sqlite3.Connection, fixture: dict[str, Any]) -> dict[str, Any]:
    if fixture.get("substep") != GOLDEN_SUBSTEP:
        raise CompileError("Release 1.0.1 compiler currently supports only the 8.2 golden fixture.")

    p3 = part_by_number(fixture, 3)
    p4 = part_by_number(fixture, 4)
    p8 = part_by_number(fixture, 8)

    reader40 = source_chunk(conn, file_name="student-reader-08.md", printed_page=40)
    reader41 = source_chunk(conn, file_name="student-reader-08.md", printed_page=41)
    practice = list(p4["practiceSelection"])
    charting = list(p4["chartingSelection"])
    for word in practice:
        if not re.search(rf"\b{re.escape(word)}\b", reader40, flags=re.IGNORECASE):
            raise CompileError(f"Part 4 practice word {word!r} is not present on Reader 8 p. 40.")
    for word in charting:
        if not re.search(rf"\b{re.escape(word)}\b", reader41, flags=re.IGNORECASE):
            raise CompileError(f"Part 4 charting word {word!r} is not present on Reader 8 p. 41.")

    sentence_page = source_chunk(conn, file_name="student-reader-08.md", printed_page=48)
    sentences = parse_numbered_sentences(sentence_page)
    if len(sentences) != 10:
        raise CompileError(f"Expected 10 Reader 8 p. 48 sentences; found {len(sentences)}.")

    passage_58 = strip_reader_frontmatter(
        source_chunk(conn, file_name="student-reader-08.md", printed_page=58),
        "Backyard Visitor",
    )
    passage_59 = strip_reader_frontmatter(
        source_chunk(conn, file_name="student-reader-08.md", printed_page=59)
    )
    passage = "Backyard Visitor\n\n" + passage_58 + "\n\n" + passage_59

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
        if item_type not in category_map:
            raise CompileError(f"Unsupported Part 8 item type: {item_type!r}.")
        dictation[category_map[item_type]].append(item["text"])

    required_categories = ("sounds", "realWords", "wordElements", "phrases", "sentences")
    if any(not dictation[key] for key in required_categories):
        raise CompileError("Part 8 is missing one or more required source-controlled categories.")

    hfws = list(p3.get("currentHighFrequencyWords", []))
    expected_hfws = ["superior", "vary", "varies", "variety", "vocabulary", "area", "garage"]
    if hfws != expected_hfws:
        raise CompileError("The repaired Release 1.0.1 current-HFW fixture no longer matches expectations.")

    regular_cards = [
        "market", "carpet", "backyard", "report",
        "transport", "depart", "gardener", "marketable",
    ]
    word_cards = [
        {"id": f"82-release101-r{index}", "text": word, "type": "regular"}
        for index, word in enumerate(regular_cards, 1)
    ] + [
        {"id": f"82-release101-h{index}", "text": word, "type": "hfw"}
        for index, word in enumerate(hfws, 1)
    ]

    sources = [
        {
            "id": "SI-08",
            "label": "WRS Step 8 Step Instruction",
            "kind": "step-instruction",
            "edition": "Fourth Edition",
            "locator": "Substep 8.2, Instructor Manual printed pp. 186-195",
            "notes": f"Compiled from {RELEASE_ID}. Governing source for Parts 1-8.",
        },
        {
            "id": "READERS-07-12",
            "label": "WRS Student Reader 8",
            "kind": "student-reader",
            "edition": "Fourth Edition",
            "locator": "Substep 8.2: printed pp. 40-41, 48, 58-59",
            "notes": f"Compiled from {RELEASE_ID}. Controlled Part 4, Part 5, and Part 9 material.",
        },
        {
            "id": "DICT-07-12-4E",
            "label": "WRS Dictation Book Steps 7-12",
            "kind": "dictation-book",
            "edition": "Fourth Edition",
            "locator": "Substep 8.2, printed pp. 33-54",
            "notes": f"Compiled from {RELEASE_ID}. Canonical visual authority for Part 8 selections.",
        },
        {
            "id": "TEACHER-SELECTION",
            "label": "Teacher-selected Part 10 text",
            "kind": "teacher-selection",
            "edition": "Not applicable",
            "locator": "Runtime teacher choice",
            "notes": "Part 10 remains teacher-selected; never fabricate or silently preselect text.",
        },
    ]

    runtime = {
        "schemaVersion": "wrs-runtime-v1",
        "id": "lesson-8-2-release-1-0-1",
        "title": "Step 8.2: ar, or in Multisyllabic Words",
        "step": "8",
        "substep": "2",
        "focus": "introduction",
        "lessonPath": "full",
        "plannedParts": list(range(1, 11)),
        "planningContext": {
            "conceptsToWeave": (
                "Current 8.2 concepts: multisyllabic words containing ar/or r-controlled syllables; "
                "complex words with -form-, -part-, and -port-; taught affixes."
            ),
            "troubleSpots": "",
        },
        "sources": sources,
        "parts": [
            {
                "part": 1,
                "title": "Sounds Quick Drill",
                "sourceIds": ["SI-08"],
                "teacherDirections": part_by_number(fixture, 1)["directions"],
                "data": {
                    "quickDrill": [
                        "a", "e", "i", "o", "u",
                        "ar", "er", "ir", "or", "ur",
                        "m", "r", "t", "sh", "ang",
                    ]
                },
            },
            {
                "part": 2,
                "title": "Teach & Review Concepts for Reading",
                "sourceIds": ["SI-08"],
                "teacherDirections": part_by_number(fixture, 2)["directions"],
                "data": {
                    "conceptNotes": (
                        "8.2 Reading: combine ar/or r-controlled syllables with other syllable types. "
                        "Source demonstrations include market, hardware, acorn, portion, shortcut, party, "
                        "restart, inform, depart, export, conform, impart, transport, report, gardener, "
                        "marketable, portions, disorganize, and misinformed."
                    )
                },
            },
            {
                "part": 3,
                "title": "Word Cards",
                "sourceIds": ["SI-08", "READERS-07-12"],
                "teacherDirections": part_by_number(fixture, 3)["directions"],
                "data": {"wordCards": word_cards, "hfwList": hfws},
            },
            {
                "part": 4,
                "title": "Wordlist Reading",
                "sourceIds": ["SI-08", "READERS-07-12"],
                "teacherDirections": part_by_number(fixture, 4)["directions"],
                "data": {
                    "practiceWords": practice,
                    "chartingWords": charting,
                    "chartingType": "real",
                },
            },
            {
                "part": 5,
                "title": "Sentence Reading",
                "sourceIds": ["SI-08", "READERS-07-12"],
                "teacherDirections": part_by_number(fixture, 5)["directions"],
                "data": {
                    "studentReader": "Student Reader 8",
                    "page": "48",
                    "sentences": sentences,
                },
            },
            {
                "part": 6,
                "title": "Quick Drill in Reverse",
                "sourceIds": ["SI-08"],
                "teacherDirections": part_by_number(fixture, 6)["directions"],
                "data": {
                    "quickDrillReverse": ["a", "e", "i", "o", "u", "ar", "er", "ir", "or", "ur"],
                    "wordElements": ["-form-", "-part-", "-port-"],
                },
            },
            {
                "part": 7,
                "title": "Teach & Review Concepts for Spelling",
                "sourceIds": ["SI-08"],
                "teacherDirections": part_by_number(fixture, 7)["directions"],
                "data": {
                    "conceptNotes": (
                        "8.2 Spelling source demonstrations: market; garden, particle, glory; repark; "
                        "import; reform, apart, export; tornadoes, gardener, reporter."
                    )
                },
            },
            {
                "part": 8,
                "title": "Written Work Dictation",
                "sourceIds": ["SI-08", "DICT-07-12-4E"],
                "teacherDirections": part_by_number(fixture, 8)["directions"],
                "data": {"dictation": dictation},
            },
            {
                "part": 9,
                "title": "Controlled Text Passage Reading",
                "sourceIds": ["READERS-07-12"],
                "teacherDirections": part_by_number(fixture, 9)["directions"],
                "data": {
                    "passageTitle": "Backyard Visitor",
                    "studentReader": "Student Reader 8",
                    "page": "58-59",
                    "passage": passage,
                },
            },
            {
                "part": 10,
                "title": "Listening/Reading Fluency and Comprehension",
                "sourceIds": ["TEACHER-SELECTION"],
                "teacherDirections": part_by_number(fixture, 10)["directions"],
                "data": {
                    "listeningComprehension": {
                        "mode": "teacher-selected",
                        "title": "Teacher-selected text",
                        "teacherDirections": [
                            "Select the Part 10 text at delivery time.",
                            "Record the selection title before use.",
                            "Follow the appropriate WRS Part 10 fluency/comprehension procedure for the student and lesson.",
                        ],
                        "studentPrompt": "Listen/read for meaning and be ready to discuss or retell.",
                        "sourceIds": ["TEACHER-SELECTION"],
                        "workspace": {"mode": "whiteboard", "tools": ["draw", "sticky-notes"]},
                    }
                },
            },
        ],
    }
    if [part["part"] for part in runtime["parts"]] != list(range(1, 11)):
        raise CompileError("Compiler did not emit Parts 1-10 exactly once.")
    return runtime


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--substep", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    conn = sqlite3.connect(args.database)
    try:
        require_release(conn)
        require_coverage(conn, args.substep)
        fixture = get_fixture(conn, args.substep)
        runtime = compile_82(conn, fixture)
    except CompileError as exc:
        raise SystemExit(str(exc))
    finally:
        conn.close()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(runtime, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {args.output} from {RELEASE_ID}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
