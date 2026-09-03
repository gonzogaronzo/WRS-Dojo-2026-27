from __future__ import annotations

from typing import Any

from compiler import CurriculumCompileError


# Wilson-source rule encoded here:
# - Part 6 is selective, not exhaustive. It must deliberately mix vowel sounds with
#   other taught sounds and must distinguish current/new material, cumulative review,
#   and documented trouble spots when applicable.
# - Part 8 uses the standard written-work composition: 5 sounds, 5 word elements,
#   5 real words, 3 nonsense words, 3 phrases, and 3 current-substep sentences.
#   Sounds, word elements, real/nonsense words, and phrases must be selected across
#   current and previously taught material rather than being a one-concept specimen list.
#
# We intentionally DO NOT invent a numeric vowel/consonant ratio. The Instructor Manual
# language verified for this project says "some vowel sounds and several other sounds."
# Until a more exact Wilson source is verified, this gate requires explicit composition
# metadata instead of guessing a ratio.

PART8_REQUIRED_COUNTS = {
    "sounds": 5,
    "wordElements": 5,
    "realWords": 5,
    "nonsenseWords": 3,
    "phrases": 3,
    "sentences": 3,
}


def _part(runtime: dict[str, Any], number: int) -> dict[str, Any]:
    for part in runtime.get("parts", []):
        if part.get("part") == number:
            return part
    raise CurriculumCompileError(
        f"Selection-fidelity gate could not find Part {number}.",
        code="selection_fidelity_part_missing",
    )


def _require_composition_metadata(part: dict[str, Any], *, part_number: int) -> dict[str, Any]:
    data = part.get("data") or {}
    metadata = data.get("selectionComposition")
    if not isinstance(metadata, dict):
        raise CurriculumCompileError(
            f"Part {part_number} lacks machine-checkable selectionComposition metadata. "
            "Automatic lesson generation is blocked rather than guessing Wilson selection balance.",
            status_code=409,
            code=f"part{part_number}_selection_composition_unverified",
        )
    return metadata


def _validate_part6(runtime: dict[str, Any], request: dict[str, Any]) -> None:
    part = _part(runtime, 6)
    metadata = _require_composition_metadata(part, part_number=6)

    vowel_count = int(metadata.get("vowelCount") or 0)
    other_sound_count = int(metadata.get("otherSoundCount") or 0)
    includes_review = metadata.get("includesPreviouslyTaught") is True
    new_sounds_exist = metadata.get("newSoundsExist") is True
    includes_current = metadata.get("includesCurrentOrNew") is True
    trouble_spots = [str(x).strip() for x in request.get("troubleSpots", []) if str(x).strip()]
    trouble_targeted = metadata.get("targetsDocumentedTroubleSpots") is True

    if vowel_count < 1 or other_sound_count < 1:
        raise CurriculumCompileError(
            "Part 6 must include a deliberate mixture of vowel sounds and other taught sounds; "
            "the current selection does not verify that mixture.",
            status_code=409,
            code="part6_sound_mix_failed",
        )
    if not includes_review:
        raise CurriculumCompileError(
            "Part 6 must include cumulative review of previously taught sounds.",
            status_code=409,
            code="part6_review_mix_failed",
        )
    if new_sounds_exist and not includes_current:
        raise CurriculumCompileError(
            "Part 6 has new/current sounds available but the selection does not include them.",
            status_code=409,
            code="part6_current_sound_mix_failed",
        )
    if trouble_spots and not trouble_targeted:
        raise CurriculumCompileError(
            "Part 6 has documented trouble spots but the selection does not verify that they were targeted.",
            status_code=409,
            code="part6_trouble_spot_mix_failed",
        )


def _validate_part8(runtime: dict[str, Any], request: dict[str, Any]) -> None:
    part = _part(runtime, 8)
    data = part.get("data") or {}
    dictation = data.get("dictation") or {}

    for key, expected in PART8_REQUIRED_COUNTS.items():
        actual = len(dictation.get(key) or [])
        if actual != expected:
            raise CurriculumCompileError(
                f"Part 8 requires exactly {expected} {key}; generated lesson has {actual}.",
                status_code=409,
                code=f"part8_{key}_count_failed",
            )

    metadata = _require_composition_metadata(part, part_number=8)
    mixed_categories = metadata.get("currentAndPreviousMixedCategories") or []
    mixed_categories = {str(x) for x in mixed_categories}
    required_mixed = {"sounds", "wordElements", "realWords", "nonsenseWords", "phrases"}
    missing = sorted(required_mixed - mixed_categories)
    if missing:
        raise CurriculumCompileError(
            "Part 8 must deliberately mix current- and previously taught material in sounds, word elements, "
            f"words, nonsense words, and phrases. Unverified categories: {', '.join(missing)}.",
            status_code=409,
            code="part8_current_review_mix_failed",
        )

    if metadata.get("sentencesAreCurrentSubstep") is not True:
        raise CurriculumCompileError(
            "Part 8 sentences must be selected from the current substep.",
            status_code=409,
            code="part8_current_sentences_failed",
        )

    trouble_spots = [str(x).strip() for x in request.get("troubleSpots", []) if str(x).strip()]
    if trouble_spots and metadata.get("targetsDocumentedTroubleSpots") is not True:
        raise CurriculumCompileError(
            "Part 8 has documented trouble spots but the selection does not verify that they informed item choice.",
            status_code=409,
            code="part8_trouble_spot_mix_failed",
        )


def validate_selection_fidelity(runtime: dict[str, Any], request: dict[str, Any]) -> None:
    """Fail closed unless generated lesson selections verify Wilson cumulative composition rules."""
    _validate_part6(runtime, request)
    _validate_part8(runtime, request)
