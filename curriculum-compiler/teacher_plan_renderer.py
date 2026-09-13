from __future__ import annotations

from typing import Any

from lesson_plan_contract import PART_NAMES, validate_teacher_plan_contract

PART_TIMES = {
    1: "2-3 min",
    2: "about 5 min",
    3: "5-10 min group / 3-5 min individual",
    4: "5-10 min",
    5: "about 5 min",
    6: "2-3 min",
    7: "5-10 min",
    8: "15-20 min",
    9: "10-15 min",
    10: "15-30 min",
}


def _part(runtime: dict[str, Any], number: int) -> dict[str, Any]:
    return next(part for part in runtime["parts"] if part["part"] == number)


def _list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _join(items: list[str]) -> str:
    return " • ".join(items) if items else "None"


def render_teacher_plan_markdown(runtime: dict[str, Any], request: dict[str, Any]) -> str:
    """Render only after the runtime has passed the canonical teacher-plan contract."""
    report = validate_teacher_plan_contract(runtime, request)
    focus_label = {
        "introduction": "Introduction",
        "accuracy": "Accuracy",
        "automaticity-fluency": "Automaticity/Fluency",
    }[runtime["focus"]]
    substep = f"{runtime.get('step', '')}.{runtime.get('substep', '')}".strip(".")
    group = str(request.get("groupName") or request.get("groupId") or "Group").strip()
    students = _list(request.get("studentNames"))
    concepts = _list(request.get("conceptsToWeave"))
    trouble = _list(request.get("troubleSpots"))

    lines: list[str] = [
        "Wilson Reading System",
        f"# Group {group} • Substep {substep} • Teacher Lesson",
        f"**Students:** {_join(students) if students else 'Current group roster'}  ",
        f"**Lesson focus:** {focus_label} • **School year:** 2026-27",
        "",
        f"**FOCUS:** {focus_label}  ",
        f"**CUMULATIVE:** {_join(concepts)}  ",
        f"**GROUP NEED:** {_join(trouble)}",
        "",
    ]

    for number in range(1, 11):
        part = _part(runtime, number)
        data = part.get("data") or {}
        lines.append(f"## PART {number} • {PART_NAMES[number]} • {PART_TIMES[number]}")

        if number == 1:
            lines.append(f"**Vowels:** {_join(_list(data.get('vowels')))}")
            lines.append(f"**Selected review:** {_join(_list(data.get('selectedReview')))}")
            new_after = _list(data.get("newAfterInstruction"))
            if new_after:
                lines.append(f"**New after instruction:** {_join(new_after)}")
        elif number == 2:
            lines.append(f"**Previous-Substep review:** {_join(_list(data.get('previousSubstepWords')))}")
            moves = data.get("teachingMoves") or []
            if moves:
                for index, move in enumerate(moves, start=1):
                    materials = _join(_list(move.get("materials")))
                    lines.append(f"{index}. {move.get('teacherAction')} **Material:** {materials} → {move.get('studentUnderstanding')}")
            if _list(data.get("currentExamples")):
                lines.append(f"**Current examples/contrasts:** {_join(_list(data.get('currentExamples')))}")
            if _list(data.get("rapidWholeWordSet")):
                lines.append(f"**Rapid whole-word set:** {_join(_list(data.get('rapidWholeWordSet')))}")
            if _list(data.get("troubleSpotTargets")):
                lines.append(f"**Trouble-spot work:** {_join(_list(data.get('troubleSpotTargets')))}")
        elif number == 3:
            lines.append(f"**Fat stack:** {data.get('fatStackReference')}")
            lines.append(f"**Current/trouble-spot cards:** {_join(_list(data.get('currentCards')))}")
            lines.append(f"**HFW packet:** {_join(_list(data.get('hfwList')))}")
            if _list(data.get("wordElements")):
                lines.append(f"**Word Elements:** {_join(_list(data.get('wordElements')))}")
        elif number == 4:
            lines.append(f"**Practice • {data.get('studentReader')} • p. {data.get('page')}:** {_join(_list(data.get('practiceWords')))}")
            if data.get("chartingPlanned") is True:
                for student, words in (data.get("chartingByStudent") or {}).items():
                    lines.append(f"**{student} charting, 15 words:** {_join(_list(words))}")
                    lines.append(f"**{student} score/trouble spots:** ______________________________")
        elif number == 5:
            lines.append(f"**{data.get('studentReader')} • p. {data.get('page')}**")
            for index, (sentence, question) in enumerate(zip(_list(data.get("sentences")), _list(data.get("weaveQuestions"))), start=1):
                lines.append(f"{index}. {sentence}  ")
                lines.append(f"   **Weave:** {question}")
        elif number == 6:
            lines.append("**Dictate → Expected response**")
            for prompt in _list(data.get("quickDrillReverse")):
                lines.append(f"- {prompt}")
            if _list(data.get("wordElements")):
                lines.append(f"**Word Elements:** {_join(_list(data.get('wordElements')))}")
        elif number == 7:
            lines.append(f"**Previous Substep:** {_join(_list(data.get('previousSubstepWords')))}")
            lines.append(f"**Current Substep:** {_join(_list(data.get('currentSubstepWords')))}")
            moves = data.get("teachingMoves") or []
            for index, move in enumerate(moves, start=1):
                materials = _join(_list(move.get("materials")))
                lines.append(f"{index}. {move.get('teacherAction')} **Material:** {materials} → {move.get('studentUnderstanding')}")
            if _list(data.get("troubleSpotTargets")):
                lines.append(f"**Trouble-spot work:** {_join(_list(data.get('troubleSpotTargets')))}")
        elif number == 8:
            dictation = data.get("dictation") or {}
            for label, key in [
                ("Sounds", "sounds"),
                ("Word Elements", "wordElements"),
                ("Real words", "realWords"),
                ("Nonsense words", "nonsenseWords"),
                ("HFW phrases", "phrases"),
            ]:
                lines.append(f"**{label}:** {_join(_list(dictation.get(key)))}")
            lines.append("**Sentences:**")
            for index, sentence in enumerate(_list(dictation.get("sentences")), start=1):
                lines.append(f"{index}. {sentence}")
            lines.append(f"**Mark/Reinforce:** {data.get('markReinforce')}")
        elif number == 9:
            lines.append(f"**{data.get('studentReader')} • {data.get('passageTitle')} • pp. {data.get('page')}**")
            if data.get("historyStatus") == "uncertain-flagged":
                lines.append(f"**Passage-history flag:** {data.get('historyNote')}")
            lines.extend(["", "---", str(data.get("passage") or ""), "---", "", "**Comprehension questions**"])
            for index, item in enumerate(data.get("questions") or [], start=1):
                lines.append(f"{index}. {item.get('question')}")
        elif number == 10:
            status = str(data.get("teacherPlanStatus") or "TBD").upper()
            lines.append("**TBD**" if status == "TBD" else str(data.get("teacherPlanContent") or "Planned Part 10"))

        lines.append("")

    warning_count = len(report.get("warnings") or [])
    lines.append(f"_Teacher-plan contract: PASS{f' with {warning_count} flagged uncertainty' if warning_count else ''}._")
    return "\n".join(lines).strip() + "\n"
