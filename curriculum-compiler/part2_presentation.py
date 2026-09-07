from __future__ import annotations

import re
from typing import Any

from compiler import CurriculumCompileError

_R_CONTROLLED_PAIR = re.compile(r"\b([a-z]+)\s*/\s*([a-z]+)\s+r-controlled\b", re.IGNORECASE)
_BASE_ELEMENT = re.compile(r"(?<!\w)-([A-Za-z]+)-(?!\w)")
_SOURCE_DEMONSTRATIONS = re.compile(
    r"^(?:Teach with|Use) the source (?:word-element )?demonstrations\s+(.+?)\.?$",
    re.IGNORECASE,
)


def _part(runtime: dict[str, Any], number: int) -> dict[str, Any]:
    for candidate in runtime.get("parts", []):
        if candidate.get("part") == number:
            return candidate
    raise CurriculumCompileError(
        f"Generated runtime is missing Part {number}.",
        code="part2_presentation_part_missing",
    )


def _source_ids(part: dict[str, Any]) -> list[str]:
    return [
        str(source_id).strip()
        for source_id in part.get("sourceIds", [])
        if str(source_id).strip()
    ]


def _frame_base(frame_id: str, source_ids: list[str]) -> dict[str, Any]:
    return {
        "id": frame_id,
        "provenance": "source-verbatim",
        "sourceIds": source_ids,
    }


def apply_part2_semantic_presentation(runtime: dict[str, Any]) -> dict[str, Any]:
    """Attach semantic Part 2 v1 frames using only explicit source-controlled text.

    Release 1.0.1 currently supplies one validated introductory 8.2 fixture. This
    adapter therefore emits semantic Part 2 only for that Introduction path unless
    the runtime already contains an explicit semantic presentation. It never
    syllabifies, marks, or assigns a linguistic role that is not stated in the
    source text.
    """

    part2 = _part(runtime, 2)
    data = part2.setdefault("data", {})
    if not isinstance(data, dict):
        raise CurriculumCompileError(
            "Generated Part 2 data is not an object.",
            code="part2_presentation_data_invalid",
        )

    # Explicit structured source data always wins. Do not reinterpret it.
    if "part2Presentation" in data:
        return runtime

    focus = str(runtime.get("focus") or "").strip()
    if focus != "introduction":
        raise CurriculumCompileError(
            "Release 1.0.1 does not provide a validated focus-specific semantic Part 2 presentation for this lesson focus.",
            code="part2_presentation_focus_not_supported",
        )

    concept_notes = str(data.get("conceptNotes") or "").strip()
    lines = [line.strip() for line in concept_notes.splitlines() if line.strip()]
    if not lines:
        raise CurriculumCompileError(
            "Validated Part 2 source text is missing, so a semantic presentation cannot be emitted safely.",
            code="part2_presentation_source_missing",
        )

    objective = lines[0]
    directions = lines[1:]
    source_ids = _source_ids(part2)

    objective_frame = {
        **_frame_base("part2-objective", source_ids),
        "kind": "explanation",
        "text": objective,
    }
    if directions:
        objective_frame["teacherCue"] = "\n".join(directions)

    frames: list[dict[str, Any]] = [objective_frame]

    # Only emit r-controlled tiles when the source itself explicitly labels the
    # graphemes as r-controlled. No browser/compiler inference is involved.
    r_controlled_match = _R_CONTROLLED_PAIR.search(objective)
    if r_controlled_match:
        frames.append({
            **_frame_base("part2-r-controlled", source_ids),
            "kind": "tile-row",
            "tiles": [
                {"text": r_controlled_match.group(1), "role": "r-controlled"},
                {"text": r_controlled_match.group(2), "role": "r-controlled"},
            ],
        })

    # Hyphen-bounded elements are already explicitly marked in the verified
    # source text. Preserve the printed element exactly and do not decompose words.
    seen_elements: set[str] = set()
    elements: list[dict[str, str]] = []
    for match in _BASE_ELEMENT.finditer(objective):
        element = f"-{match.group(1)}-"
        if element in seen_elements:
            continue
        seen_elements.add(element)
        elements.append({"text": element, "role": "base-element"})
    if elements:
        frames.append({
            **_frame_base("part2-base-elements", source_ids),
            "kind": "word-elements",
            "elements": elements,
        })

    # Demonstration lists are displayed as exact source substrings. The complete
    # source direction remains private in teacherCue.
    for index, direction in enumerate(directions, start=1):
        match = _SOURCE_DEMONSTRATIONS.match(direction)
        if not match:
            continue
        demonstration_text = match.group(1).strip()
        if not demonstration_text:
            continue
        frames.append({
            **_frame_base(f"part2-demonstrations-{index}", source_ids),
            "kind": "explanation",
            "text": demonstration_text,
            "teacherCue": direction,
        })

    data["part2Presentation"] = {
        "version": 1,
        "focus": focus,
        "frames": frames,
    }
    return runtime
