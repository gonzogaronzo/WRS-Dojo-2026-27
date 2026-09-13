from __future__ import annotations

from typing import Any

from compiler import CurriculumCompileError

CONTRACT_VERSION = "wrs-teacher-plan-contract-v1"
CANONICAL_FOCI = {"introduction", "accuracy", "automaticity-fluency"}
PART_NAMES = {
    1: "Sounds Quick Drill",
    2: "Teach & Review Concepts for Reading",
    3: "Word Cards",
    4: "Wordlist Reading / Charting",
    5: "Sentence Reading",
    6: "Quick Drill in Reverse",
    7: "Teach & Review Concepts for Spelling",
    8: "Written Work Dictation",
    9: "Controlled Text Passage Reading",
    10: "Listening/Reading Fluency & Comprehension",
}

QUESTION_LEVELS = [
    {"direct-recall"},
    {"direct-recall"},
    {"direct-recall"},
    {"sequence", "cause-effect", "important-detail", "vocabulary-in-context"},
    {"sequence", "cause-effect", "important-detail", "vocabulary-in-context"},
    {"relationship", "reasoning", "explanation"},
    {"relationship", "reasoning", "explanation"},
    {"inference"},
    {"evidence-based-interpretation"},
    {"synthesis"},
]


def _issue(code: str, message: str, *, part: int | None = None, severity: str = "error") -> dict[str, Any]:
    item: dict[str, Any] = {"code": code, "message": message, "severity": severity}
    if part is not None:
        item["part"] = part
    return item


def _parts_by_number(runtime: dict[str, Any], issues: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    raw_parts = runtime.get("parts")
    if not isinstance(raw_parts, list):
        issues.append(_issue("parts_missing", "Runtime must contain a Parts 1-10 array."))
        return {}
    parts: dict[int, dict[str, Any]] = {}
    for raw in raw_parts:
        if not isinstance(raw, dict):
            issues.append(_issue("part_shape_invalid", "Every lesson part must be an object."))
            continue
        number = raw.get("part")
        if not isinstance(number, int) or number not in range(1, 11):
            issues.append(_issue("part_number_invalid", f"Invalid Part number: {number!r}."))
            continue
        if number in parts:
            issues.append(_issue("part_duplicate", f"Part {number} appears more than once.", part=number))
            continue
        parts[number] = raw
    missing = [number for number in range(1, 11) if number not in parts]
    if missing:
        issues.append(_issue("parts_incomplete", f"Missing canonical Parts: {', '.join(map(str, missing))}."))
    if len(raw_parts) != 10:
        issues.append(_issue("parts_count_failed", f"Expected exactly 10 Parts; found {len(raw_parts)}."))
    return parts


def _data(part: dict[str, Any]) -> dict[str, Any]:
    value = part.get("data")
    return value if isinstance(value, dict) else {}


def _strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _require_text(data: dict[str, Any], key: str, issues: list[dict[str, Any]], code: str, message: str, *, part: int) -> str:
    value = str(data.get(key) or "").strip()
    if not value:
        issues.append(_issue(code, message, part=part))
    return value


def _validate_sources(runtime: dict[str, Any], parts: dict[int, dict[str, Any]], issues: list[dict[str, Any]]) -> None:
    sources = runtime.get("sources")
    if not isinstance(sources, list) or not sources:
        issues.append(_issue("source_manifest_missing", "Lesson must carry a non-empty source manifest."))
        return
    source_ids: set[str] = set()
    for source in sources:
        if not isinstance(source, dict):
            continue
        source_id = str(source.get("id") or "").strip()
        if source_id:
            source_ids.add(source_id)
            if source_id != "TEACHER-SELECTION" and not str(source.get("locator") or "").strip():
                issues.append(_issue("source_locator_missing", f"Source {source_id} has no locator."))
    for number in range(1, 10):
        part = parts.get(number)
        if not part:
            continue
        refs = _strings(part.get("sourceIds"))
        if not refs:
            issues.append(_issue("part_source_missing", f"Part {number} has no source reference.", part=number))
            continue
        unknown = [source_id for source_id in refs if source_id not in source_ids]
        if unknown:
            issues.append(_issue(
                "part_source_unregistered",
                f"Part {number} cites source IDs absent from the lesson source manifest: {', '.join(unknown)}.",
                part=number,
            ))


def _validate_part1(part: dict[str, Any], issues: list[dict[str, Any]]) -> None:
    data = _data(part)
    eligible = _strings(data.get("eligibleVowels"))
    selected = _strings(data.get("vowels"))
    review = _strings(data.get("selectedReview"))
    new_after = _strings(data.get("newAfterInstruction"))
    if not eligible:
        issues.append(_issue(
            "part1_eligible_vowels_missing",
            "Part 1 must carry the verified cumulative eligible-vowel set so full coverage can be checked.",
            part=1,
        ))
    missing = [item for item in eligible if item not in selected]
    if missing:
        issues.append(_issue(
            "part1_vowel_coverage_failed",
            f"Part 1 omits eligible vowel Letter-Sound Cards/responses: {', '.join(missing)}.",
            part=1,
        ))
    if not selected:
        issues.append(_issue("part1_vowels_empty", "Part 1 contains no selected vowel cards/responses.", part=1))
    if not review:
        issues.append(_issue("part1_review_empty", "Part 1 must preselect purposeful cumulative review cards.", part=1))
    if data.get("newCardsRequiredAfterPart2") is True and not new_after:
        issues.append(_issue(
            "part1_new_after_instruction_missing",
            "Step Instruction requires new cards after Part 2, but Part 1 does not name them.",
            part=1,
        ))


def _validate_teaching_moves(moves: Any, issues: list[dict[str, Any]], *, part: int, prefix: str) -> None:
    if not isinstance(moves, list) or not moves:
        issues.append(_issue(f"{prefix}_teaching_moves_missing", f"Part {part} requires numbered teach-from moves.", part=part))
        return
    for index, move in enumerate(moves, start=1):
        if not isinstance(move, dict):
            issues.append(_issue(f"{prefix}_teaching_move_invalid", f"Part {part} teaching move {index} is not structured.", part=part))
            continue
        teacher_action = str(move.get("teacherAction") or "").strip()
        materials = _strings(move.get("materials"))
        understanding = str(move.get("studentUnderstanding") or "").strip()
        if not teacher_action or not materials or not understanding:
            issues.append(_issue(
                f"{prefix}_teaching_move_incomplete",
                f"Part {part} teaching move {index} must include teacherAction, exact materials, and studentUnderstanding.",
                part=part,
            ))


def _validate_part2(part: dict[str, Any], focus: str, trouble_spots: list[str], issues: list[dict[str, Any]]) -> None:
    data = _data(part)
    prior = _strings(data.get("previousSubstepWords"))
    if not 3 <= len(prior) <= 4:
        issues.append(_issue(
            "part2_prior_words_failed",
            f"Part 2 requires 3-4 actual previous-Substep review words; found {len(prior)}.",
            part=2,
        ))
    if focus == "introduction":
        _validate_teaching_moves(data.get("teachingMoves"), issues, part=2, prefix="part2_intro")
        if data.get("sourceSequenceComplete") is not True:
            issues.append(_issue(
                "part2_intro_source_sequence_incomplete",
                "Introduction Part 2 must verify the complete source-ordered current-Substep instructional sequence.",
                part=2,
            ))
        for flag, detail_key, code, label in [
            ("notebookWorkRequired", "notebookWork", "part2_notebook_work_missing", "notebook work"),
            ("markingRequired", "marking", "part2_marking_missing", "marking"),
            ("manipulationRequired", "manipulation", "part2_manipulation_missing", "manipulation"),
        ]:
            if data.get(flag) is True and not str(data.get(detail_key) or "").strip():
                issues.append(_issue(code, f"Part 2 marks {label} as required but does not specify it.", part=2))
    elif focus == "accuracy":
        current = _strings(data.get("currentExamples"))
        if not current:
            issues.append(_issue("part2_accuracy_current_examples_missing", "Accuracy Part 2 needs preselected current examples/contrasts.", part=2))
        if trouble_spots and not _strings(data.get("troubleSpotTargets")):
            issues.append(_issue(
                "part2_accuracy_trouble_spots_missing",
                "Accuracy Part 2 has documented trouble spots but no explicit targeted work.",
                part=2,
            ))
    elif focus == "automaticity-fluency":
        if not _strings(data.get("rapidWholeWordSet")):
            issues.append(_issue(
                "part2_fluency_word_set_missing",
                "Automaticity/Fluency Part 2 requires a preselected rapid whole-word set.",
                part=2,
            ))
        if data.get("introducesNewConcept") is not False:
            issues.append(_issue(
                "part2_fluency_new_concept_failed",
                "Automaticity/Fluency Part 2 must explicitly verify that no new concept is introduced.",
                part=2,
            ))


def _validate_part3(part: dict[str, Any], issues: list[dict[str, Any]]) -> None:
    data = _data(part)
    if not str(data.get("fatStackReference") or "").strip():
        issues.append(_issue("part3_fat_stack_reference_missing", "Part 3 must reference the existing previous-Substep fat stack.", part=3))
    expected_hfw = _strings(data.get("expectedCurrentHfw"))
    actual_hfw = _strings(data.get("hfwList"))
    missing_hfw = [word for word in expected_hfw if word not in actual_hfw]
    if missing_hfw:
        issues.append(_issue(
            "part3_current_hfw_incomplete",
            f"Part 3 HFW packet omits current-Substep HFWs: {', '.join(missing_hfw)}.",
            part=3,
        ))
    for key in ("currentCards", "hfwList", "wordElements"):
        if not isinstance(data.get(key), list):
            issues.append(_issue("part3_packet_shape_failed", f"Part 3 field {key} must be an explicit list.", part=3))


def _validate_part4(part: dict[str, Any], issues: list[dict[str, Any]]) -> None:
    data = _data(part)
    _require_text(data, "studentReader", issues, "part4_reader_missing", "Part 4 must name the exact Student Reader.", part=4)
    _require_text(data, "page", issues, "part4_page_missing", "Part 4 must name exact Student Reader page(s).", part=4)
    practice = _strings(data.get("practiceWords"))
    if not 5 <= len(practice) <= 6:
        issues.append(_issue("part4_practice_count_failed", f"Part 4 practice must contain 5-6 exact words; found {len(practice)}.", part=4))
    charting_planned = data.get("chartingPlanned") is True
    if charting_planned:
        charting = data.get("chartingByStudent")
        if not isinstance(charting, dict) or not charting:
            issues.append(_issue(
                "part4_individual_charting_required",
                "Part 4 charting is planned, but there is no separately named 15-word list for each student.",
                part=4,
            ))
        else:
            for student, words in charting.items():
                count = len(_strings(words))
                if count != 15:
                    issues.append(_issue(
                        "part4_student_charting_count_failed",
                        f"Part 4 charting list for {student} must contain exactly 15 words; found {count}.",
                        part=4,
                    ))
        if _strings(data.get("chartingWords")):
            issues.append(_issue(
                "part4_shared_charting_list_prohibited",
                "A shared chartingWords list cannot substitute for separate student charting lists.",
                part=4,
            ))


def _validate_part5(part: dict[str, Any], issues: list[dict[str, Any]]) -> None:
    data = _data(part)
    _require_text(data, "studentReader", issues, "part5_reader_missing", "Part 5 must name the exact Student Reader.", part=5)
    _require_text(data, "page", issues, "part5_page_missing", "Part 5 must name the exact sentence page.", part=5)
    sentences = _strings(data.get("sentences"))
    questions = _strings(data.get("weaveQuestions"))
    if len(sentences) != 10:
        issues.append(_issue("part5_sentence_count_failed", f"Part 5 requires exactly 10 embedded sentences; found {len(sentences)}.", part=5))
    if len(questions) != 10:
        issues.append(_issue("part5_weave_count_failed", f"Part 5 requires exactly 10 weave-in questions; found {len(questions)}.", part=5))


def _validate_part6(part: dict[str, Any], issues: list[dict[str, Any]]) -> None:
    data = _data(part)
    prompts = _strings(data.get("quickDrillReverse"))
    if len(prompts) < 20:
        issues.append(_issue(
            "part6_prompt_count_failed",
            f"Part 6 project standard requires at least 20 fully selected sound prompts; found {len(prompts)}.",
            part=6,
        ))
    if not isinstance(data.get("wordElements"), list):
        issues.append(_issue("part6_word_elements_shape_failed", "Part 6 Word Elements must be an explicit list, even when empty.", part=6))


def _validate_part7(part: dict[str, Any], focus: str, trouble_spots: list[str], issues: list[dict[str, Any]]) -> None:
    data = _data(part)
    prior = _strings(data.get("previousSubstepWords"))
    current = _strings(data.get("currentSubstepWords"))
    if not 3 <= len(prior) <= 4:
        issues.append(_issue("part7_prior_words_failed", f"Part 7 requires 3-4 previous-Substep words; found {len(prior)}.", part=7))
    if not 5 <= len(current) <= 8:
        issues.append(_issue("part7_current_words_failed", f"Part 7 requires 5-8 current-Substep words; found {len(current)}.", part=7))
    if focus == "introduction":
        _validate_teaching_moves(data.get("teachingMoves"), issues, part=7, prefix="part7_intro")
    elif focus == "accuracy" and trouble_spots and not _strings(data.get("troubleSpotTargets")):
        issues.append(_issue(
            "part7_accuracy_trouble_spots_missing",
            "Accuracy Part 7 has documented trouble spots but no explicit spelling targets.",
            part=7,
        ))
    elif focus == "automaticity-fluency" and data.get("introducesNewConcept") is not False:
        issues.append(_issue(
            "part7_fluency_new_concept_failed",
            "Automaticity/Fluency Part 7 must explicitly verify that no new concept is introduced.",
            part=7,
        ))


def _validate_part8(part: dict[str, Any], issues: list[dict[str, Any]]) -> None:
    data = _data(part)
    dictation = data.get("dictation")
    if not isinstance(dictation, dict):
        issues.append(_issue("part8_dictation_missing", "Part 8 must contain structured dictation categories.", part=8))
        return
    expected = {"sounds": 5, "realWords": 5, "nonsenseWords": 3, "phrases": 3}
    for key, count in expected.items():
        actual = len(_strings(dictation.get(key)))
        if actual != count:
            issues.append(_issue(f"part8_{key}_count_failed", f"Part 8 requires exactly {count} {key}; found {actual}.", part=8))
    elements_applicable = data.get("wordElementsApplicable")
    if not isinstance(elements_applicable, bool):
        issues.append(_issue(
            "part8_word_elements_applicability_missing",
            "Part 8 must explicitly state whether 5 Word Elements are applicable at this instructional point.",
            part=8,
        ))
    else:
        expected_elements = 5 if elements_applicable else 0
        actual_elements = len(_strings(dictation.get("wordElements")))
        if actual_elements != expected_elements:
            issues.append(_issue(
                "part8_wordElements_count_failed",
                f"Part 8 expects {expected_elements} Word Elements for this lesson; found {actual_elements}.",
                part=8,
            ))
    expected_sentences = data.get("expectedSentenceCount")
    if expected_sentences not in {2, 3}:
        issues.append(_issue(
            "part8_sentence_expectation_missing",
            "Part 8 must explicitly verify whether the source/instructional point supports 2 or 3 sentences.",
            part=8,
        ))
    else:
        actual_sentences = len(_strings(dictation.get("sentences")))
        if actual_sentences != expected_sentences:
            issues.append(_issue(
                "part8_sentences_count_failed",
                f"Part 8 expects exactly {expected_sentences} sentences; found {actual_sentences}.",
                part=8,
            ))
    if not str(data.get("markReinforce") or "").strip():
        issues.append(_issue("part8_mark_reinforce_missing", "Part 8 must preselect a concise Mark/Reinforce target.", part=8))


def _validate_part9(part: dict[str, Any], issues: list[dict[str, Any]], warnings: list[dict[str, Any]]) -> None:
    data = _data(part)
    _require_text(data, "studentReader", issues, "part9_reader_missing", "Part 9 must name the exact Student Reader.", part=9)
    _require_text(data, "passageTitle", issues, "part9_title_missing", "Part 9 must name the selected controlled passage.", part=9)
    _require_text(data, "page", issues, "part9_page_missing", "Part 9 must name the printed passage page(s).", part=9)
    _require_text(data, "passage", issues, "part9_passage_missing", "Part 9 must embed the complete controlled passage text.", part=9)
    history = str(data.get("historyStatus") or "").strip()
    if history == "uncertain-flagged":
        if not str(data.get("historyNote") or "").strip():
            issues.append(_issue("part9_history_note_missing", "Uncertain passage history must be explicitly described.", part=9))
        else:
            warnings.append(_issue(
                "part9_history_uncertain",
                "Current records do not prove passage history; lesson explicitly flags the uncertainty.",
                part=9,
                severity="warning",
            ))
    elif history != "verified-next-unread":
        issues.append(_issue(
            "part9_history_status_failed",
            "Part 9 must verify the next unread passage or explicitly flag uncertain history.",
            part=9,
        ))

    questions = data.get("questions")
    if not isinstance(questions, list):
        questions = []
    if len(questions) != 10:
        issues.append(_issue("part9_question_count_failed", f"Part 9 requires exactly 10 comprehension questions; found {len(questions)}.", part=9))
        return
    for index, question in enumerate(questions):
        if not isinstance(question, dict):
            issues.append(_issue("part9_question_shape_failed", f"Part 9 question {index + 1} must include question text and a difficulty level.", part=9))
            continue
        text = str(question.get("question") or "").strip()
        level = str(question.get("level") or "").strip()
        if not text:
            issues.append(_issue("part9_question_text_missing", f"Part 9 question {index + 1} is blank.", part=9))
        if level not in QUESTION_LEVELS[index]:
            expected = ", ".join(sorted(QUESTION_LEVELS[index]))
            issues.append(_issue(
                "part9_question_level_failed",
                f"Part 9 question {index + 1} level must be one of [{expected}]; found {level or '(blank)' }.",
                part=9,
            ))


def _validate_part10(part: dict[str, Any], request: dict[str, Any], issues: list[dict[str, Any]]) -> None:
    data = _data(part)
    status = str(data.get("teacherPlanStatus") or "").strip().upper()
    requested = request.get("part10Requested") is True
    if requested:
        if status != "PLANNED":
            issues.append(_issue("part10_requested_not_planned", "Part 10 was explicitly requested but is not marked PLANNED.", part=10))
    elif status != "TBD":
        issues.append(_issue(
            "part10_default_tbd_failed",
            "Part 10 teacher-plan output must remain TBD unless explicitly requested.",
            part=10,
        ))


def audit_teacher_plan_contract(runtime: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    """Return every contract violation instead of allowing a partially compliant lesson to render."""
    issues: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    if runtime.get("schemaVersion") != "wrs-runtime-v1":
        issues.append(_issue("runtime_schema_failed", "Teacher-plan contract requires schemaVersion wrs-runtime-v1."))

    focus = str(runtime.get("focus") or request.get("lessonFocus") or "").strip().lower()
    if focus not in CANONICAL_FOCI:
        issues.append(_issue("focus_invalid", f"Invalid lesson focus {focus or '(blank)'}."))

    parts = _parts_by_number(runtime, issues)
    _validate_sources(runtime, parts, issues)
    trouble_spots = [str(item).strip() for item in request.get("troubleSpots", []) if str(item).strip()]

    if 1 in parts:
        _validate_part1(parts[1], issues)
    if 2 in parts:
        _validate_part2(parts[2], focus, trouble_spots, issues)
    if 3 in parts:
        _validate_part3(parts[3], issues)
    if 4 in parts:
        _validate_part4(parts[4], issues)
    if 5 in parts:
        _validate_part5(parts[5], issues)
    if 6 in parts:
        _validate_part6(parts[6], issues)
    if 7 in parts:
        _validate_part7(parts[7], focus, trouble_spots, issues)
    if 8 in parts:
        _validate_part8(parts[8], issues)
    if 9 in parts:
        _validate_part9(parts[9], issues, warnings)
    if 10 in parts:
        _validate_part10(parts[10], request, issues)

    return {
        "contractVersion": CONTRACT_VERSION,
        "status": "PASS" if not issues else "FAIL",
        "ok": not issues,
        "errors": issues,
        "warnings": warnings,
    }


def validate_teacher_plan_contract(runtime: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    report = audit_teacher_plan_contract(runtime, request)
    if not report["ok"]:
        codes = ", ".join(issue["code"] for issue in report["errors"])
        raise CurriculumCompileError(
            f"Teacher-plan contract failed. Rendering is blocked. Violations: {codes}.",
            status_code=409,
            code="teacher_plan_contract_failed",
        )
    runtime.setdefault("validation", {})["teacherPlanContract"] = report
    return report
