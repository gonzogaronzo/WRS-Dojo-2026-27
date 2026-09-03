from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path
from typing import Any

from compiler import CurriculumCompileError


VOWEL_GRAPHEMES = {"a", "e", "i", "o", "u", "y"}
SHORT_LONG_TYPES = {"Short Vowel", "Long Vowel"}
MARKED_VOWEL_CHARS = set("ăĕĭŏŭāēīōūüȯ")


def _substep_key(value: str) -> tuple[int, int]:
    match = re.fullmatch(r"\s*(\d+)\.(\d+)\s*", value or "")
    if not match:
        raise CurriculumCompileError(
            f"Cannot resolve cumulative sound inventory for Substep {value or '(not set)' }.",
            status_code=409,
            code="sound_inventory_substep_invalid",
        )
    return int(match.group(1)), int(match.group(2))


def _part(runtime: dict[str, Any], number: int) -> dict[str, Any]:
    for part in runtime.get("parts", []):
        if part.get("part") == number:
            return part
    raise CurriculumCompileError(
        f"Sound-inventory gate could not find Part {number}.",
        code="sound_inventory_part_missing",
    )


def _clean_phoneme(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    return text if text.startswith("/") and text.endswith("/") else f"/{text.strip('/')}/"


def _load_cumulative_correspondences(database_path: str | Path, substep: str) -> list[dict[str, str]]:
    target = _substep_key(substep)
    connection = sqlite3.connect(f"file:{Path(database_path)}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            """
            SELECT inventory_id, substep, fields_json
            FROM inventory_records
            WHERE lane = 'clean'
              AND category = 'Phoneme Grapheme Correspondence'
            ORDER BY inventory_id
            """
        ).fetchall()
    finally:
        connection.close()

    correspondences: list[dict[str, str]] = []
    for row in rows:
        introduced = str(row["substep"] or "").strip()
        try:
            if _substep_key(introduced) > target:
                continue
        except CurriculumCompileError:
            continue
        fields = json.loads(row["fields_json"])
        if str(fields.get("Student Notebook Entry") or "").strip().lower() != "yes":
            continue
        phoneme = _clean_phoneme(str(fields.get("Phoneme") or ""))
        grapheme = str(fields.get("Grapheme") or "").strip()
        if not phoneme or not grapheme:
            continue
        correspondences.append(
            {
                "phoneme": phoneme,
                "grapheme": grapheme,
                "type": str(fields.get("Correspondence Type") or "").strip(),
                "introduced": introduced,
                "notebookSection": str(fields.get("Student Notebook Page or Section") or "").strip(),
            }
        )
    if not correspondences:
        raise CurriculumCompileError(
            f"No cumulative Student Notebook sound-spelling correspondences resolved through Substep {substep}.",
            status_code=409,
            code="sound_inventory_empty",
        )
    return correspondences


def _assert_marked_vowel(correspondence: dict[str, str]) -> None:
    if correspondence["type"] not in SHORT_LONG_TYPES:
        return
    body = correspondence["phoneme"].strip("/")
    if not any(char in MARKED_VOWEL_CHARS for char in body):
        raise CurriculumCompileError(
            f"Student Notebook inventory resolved an ambiguous {correspondence['type'].lower()} phoneme "
            f"{correspondence['phoneme']} for grapheme {correspondence['grapheme']}. Refusing to guess vowel length.",
            status_code=409,
            code="sound_inventory_vowel_diacritic_missing",
        )


def _resolve_existing_item(item: str, pool: list[dict[str, str]]) -> list[dict[str, str]]:
    text = str(item or "").strip()
    explicit = re.fullmatch(r"(/[^/]+/)\s*(?:→|->|=)\s*(.+)", text)
    if explicit:
        phoneme = _clean_phoneme(explicit.group(1))
        requested = [part.strip() for part in explicit.group(2).split(",") if part.strip()]
        matches = [row for row in pool if row["phoneme"] == phoneme and row["grapheme"] in requested]
        if not matches or {row["grapheme"] for row in matches} != set(requested):
            raise CurriculumCompileError(
                f"Part 6 prompt {text!r} is not verified by the cumulative Student Notebook inventory.",
                status_code=409,
                code="sound_inventory_prompt_unverified",
            )
        return matches

    phoneme_text = _clean_phoneme(text) if text.startswith("/") and text.endswith("/") else ""
    if phoneme_text:
        matches = [row for row in pool if row["phoneme"] == phoneme_text]
        if not matches:
            raise CurriculumCompileError(
                f"Part 6 phoneme {phoneme_text} is not in the cumulative Student Notebook inventory.",
                status_code=409,
                code="sound_inventory_phoneme_unverified",
            )
        return matches

    grapheme = text.strip("[]")
    matches = [row for row in pool if row["grapheme"] == grapheme]
    if not matches:
        raise CurriculumCompileError(
            f"Part 6 grapheme {grapheme!r} is not in the cumulative Student Notebook inventory.",
            status_code=409,
            code="sound_inventory_grapheme_unverified",
        )
    phonemes = {row["phoneme"] for row in matches}
    if len(phonemes) != 1:
        raise CurriculumCompileError(
            f"Part 6 grapheme {grapheme!r} has multiple taught pronunciations ({', '.join(sorted(phonemes))}). "
            "Generation must choose the intended marked phoneme explicitly rather than guess.",
            status_code=409,
            code="sound_inventory_grapheme_ambiguous",
        )
    return matches


def _prompt_from_matches(matches: list[dict[str, str]]) -> str:
    for row in matches:
        _assert_marked_vowel(row)
    phonemes = {row["phoneme"] for row in matches}
    if len(phonemes) != 1:
        raise CurriculumCompileError(
            "One Part 6 prompt resolved to multiple phonemes.",
            status_code=409,
            code="sound_inventory_prompt_ambiguous",
        )
    phoneme = next(iter(phonemes))
    graphemes: list[str] = []
    for row in matches:
        if row["grapheme"] not in graphemes:
            graphemes.append(row["grapheme"])
    return f"{phoneme} → {', '.join(graphemes)}"


def apply_sound_inventory_fidelity(
    runtime: dict[str, Any],
    request: dict[str, Any],
    database_path: str | Path,
) -> None:
    """Rewrite/verify Part 6 prompts against the cumulative Student Notebook-indexed inventory.

    The release stores this inventory as cleaned structured records with Student Notebook references.
    It is a machine-readable cross-reference, not a replacement for the canonical notebook visuals.
    Ambiguous graphemes and missing vowel diacritics fail closed.
    """
    substep = str(request.get("currentSubstep") or runtime.get("substep") or "").strip()
    if "." not in substep:
        step = str(runtime.get("step") or "").strip()
        if step and substep:
            substep = f"{step}.{substep}"
    pool = _load_cumulative_correspondences(database_path, substep)
    part6 = _part(runtime, 6)
    data = part6.setdefault("data", {})
    existing = list(data.get("quickDrillReverse") or [])
    if not existing:
        raise CurriculumCompileError(
            "Part 6 has no selected sounds to cross-reference against the cumulative Student Notebook inventory.",
            status_code=409,
            code="sound_inventory_part6_empty",
        )

    prompts: list[str] = []
    for item in existing:
        prompt = _prompt_from_matches(_resolve_existing_item(str(item), pool))
        if prompt not in prompts:
            prompts.append(prompt)

    data["quickDrillReverse"] = prompts
    data["soundInventoryProvenance"] = {
        "authority": "Student Notebook / Student Notebook Answer Key",
        "machineReadableCrossReference": "Release 1.0.1 CLEAN-INVENTORIES · Phoneme Grapheme Correspondence",
        "throughSubstep": substep,
        "preservesSourcePhonemeNotation": True,
        "ambiguousGraphemesFailClosed": True,
    }
