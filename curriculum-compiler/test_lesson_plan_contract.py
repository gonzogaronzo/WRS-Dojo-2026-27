import unittest

from lesson_plan_contract import audit_teacher_plan_contract, validate_teacher_plan_contract
from teacher_plan_renderer import render_teacher_plan_markdown


def complete_runtime(focus="accuracy"):
    sources = [
        {"id": "SI", "locator": "Step Instruction"},
        {"id": "READER", "locator": "Student Reader"},
        {"id": "DICT", "locator": "Dictation Book"},
        {"id": "NOTEBOOK", "locator": "Student Notebook"},
    ]
    parts = [{"part": n, "title": f"Part {n}", "sourceIds": ["SI"], "data": {}} for n in range(1, 11)]
    parts[0]["data"] = {
        "eligibleVowels": ["ă", "ĕ", "ĭ", "ŏ", "ŭ", "ā", "ē", "ī", "ō", "ū"],
        "vowels": ["ă", "ĕ", "ĭ", "ŏ", "ŭ", "ā", "ē", "ī", "ō", "ū"],
        "selectedReview": ["ch", "tch", "dge"],
        "newAfterInstruction": [],
    }
    parts[1]["data"] = {
        "previousSubstepWords": ["prior1", "prior2", "prior3", "prior4"],
        "currentExamples": ["current1", "current2"],
        "troubleSpotTargets": ["guessing"],
        "rapidWholeWordSet": ["current1", "current2"],
        "introducesNewConcept": False,
        "sourceSequenceComplete": True,
        "teachingMoves": [
            {"teacherAction": "Build/read the verified example.", "materials": ["current1"], "studentUnderstanding": "Apply the current pattern."}
        ],
    }
    parts[2]["data"] = {
        "fatStackReference": "existing 7.3 fat stack",
        "currentCards": ["card1", "card2"],
        "expectedCurrentHfw": ["whole", "half"],
        "hfwList": ["whole", "half"],
        "wordElements": [],
    }
    parts[3]["sourceIds"] = ["READER"]
    parts[3]["data"] = {
        "studentReader": "Student Reader 7",
        "page": "104",
        "practiceWords": ["p1", "p2", "p3", "p4", "p5", "p6"],
        "chartingPlanned": True,
        "chartingByStudent": {
            "Alex": [f"a{i}" for i in range(1, 16)],
            "Finn": [f"f{i}" for i in range(1, 16)],
            "Maya": [f"m{i}" for i in range(1, 16)],
        },
    }
    parts[4]["sourceIds"] = ["READER"]
    parts[4]["data"] = {
        "studentReader": "Student Reader 7",
        "page": "112",
        "sentences": [f"Sentence {i}." for i in range(1, 11)],
        "weaveQuestions": [f"Question {i}?" for i in range(1, 11)],
    }
    parts[5]["sourceIds"] = ["NOTEBOOK"]
    parts[5]["data"] = {
        "quickDrillReverse": [f"/s{i}/ → g{i}" for i in range(1, 21)],
        "wordElements": ["-form-"],
    }
    parts[6]["sourceIds"] = ["DICT"]
    parts[6]["data"] = {
        "previousSubstepWords": ["old1", "old2", "old3", "old4"],
        "currentSubstepWords": ["new1", "new2", "new3", "new4", "new5", "new6"],
        "troubleSpotTargets": ["guessing"],
        "introducesNewConcept": False,
        "teachingMoves": [
            {"teacherAction": "Spell the verified example.", "materials": ["new1"], "studentUnderstanding": "Apply the current spelling pattern."}
        ],
    }
    parts[7]["sourceIds"] = ["DICT"]
    parts[7]["data"] = {
        "dictation": {
            "sounds": ["s1", "s2", "s3", "s4", "s5"],
            "wordElements": ["e1", "e2", "e3", "e4", "e5"],
            "realWords": ["r1", "r2", "r3", "r4", "r5"],
            "nonsenseWords": ["n1", "n2", "n3"],
            "phrases": ["p1", "p2", "p3"],
            "sentences": ["x1", "x2", "x3"],
        },
        "wordElementsApplicable": True,
        "expectedSentenceCount": 3,
        "markReinforce": "current final stable syllable",
    }
    parts[8]["sourceIds"] = ["READER"]
    levels = [
        "direct-recall", "direct-recall", "direct-recall",
        "sequence", "vocabulary-in-context", "reasoning", "explanation",
        "inference", "evidence-based-interpretation", "synthesis",
    ]
    parts[8]["data"] = {
        "studentReader": "Student Reader 7",
        "passageTitle": "The New Kitten",
        "page": "122-123",
        "passage": "Complete controlled passage text lives here.",
        "historyStatus": "verified-next-unread",
        "questions": [
            {"question": f"Passage question {i}?", "level": level}
            for i, level in enumerate(levels, start=1)
        ],
    }
    parts[9]["sourceIds"] = ["SI"]
    parts[9]["data"] = {"teacherPlanStatus": "TBD"}
    return {
        "schemaVersion": "wrs-runtime-v1",
        "step": "7",
        "substep": "4",
        "focus": focus,
        "sources": sources,
        "parts": parts,
    }


def request():
    return {
        "groupId": "5A",
        "groupName": "5A",
        "studentNames": ["Alex", "Finn", "Maya"],
        "lessonFocus": "accuracy",
        "troubleSpots": ["guessing"],
        "conceptsToWeave": ["long vs short vowels"],
    }


class LessonPlanContractTests(unittest.TestCase):
    def test_complete_accuracy_lesson_passes(self):
        report = validate_teacher_plan_contract(complete_runtime(), request())
        self.assertEqual(report["status"], "PASS")

    def test_renderer_requires_contract_pass(self):
        rendered = render_teacher_plan_markdown(complete_runtime(), request())
        self.assertIn("Teacher-plan contract: PASS", rendered)
        self.assertIn("PART 9", rendered)
        self.assertIn("Complete controlled passage text lives here.", rendered)

    def test_shortchanged_7_4_regression_reports_all_three_failures(self):
        runtime = complete_runtime()
        runtime["parts"][0]["data"]["vowels"].pop()
        runtime["parts"][1]["data"]["previousSubstepWords"] = ["prior1", "prior2"]
        runtime["parts"][8]["data"]["passage"] = ""
        runtime["parts"][8]["data"]["questions"] = []
        report = audit_teacher_plan_contract(runtime, request())
        codes = {issue["code"] for issue in report["errors"]}
        self.assertIn("part1_vowel_coverage_failed", codes)
        self.assertIn("part2_prior_words_failed", codes)
        self.assertIn("part9_passage_missing", codes)
        self.assertIn("part9_question_count_failed", codes)
        self.assertEqual(report["status"], "FAIL")

    def test_part4_rejects_shared_charting_list(self):
        runtime = complete_runtime()
        runtime["parts"][3]["data"]["chartingWords"] = [f"x{i}" for i in range(15)]
        report = audit_teacher_plan_contract(runtime, request())
        self.assertIn("part4_shared_charting_list_prohibited", {issue["code"] for issue in report["errors"]})

    def test_part5_requires_ten_sentences_and_questions(self):
        runtime = complete_runtime()
        runtime["parts"][4]["data"]["sentences"].pop()
        runtime["parts"][4]["data"]["weaveQuestions"].pop()
        codes = {issue["code"] for issue in audit_teacher_plan_contract(runtime, request())["errors"]}
        self.assertIn("part5_sentence_count_failed", codes)
        self.assertIn("part5_weave_count_failed", codes)

    def test_part6_requires_twenty_prompts(self):
        runtime = complete_runtime()
        runtime["parts"][5]["data"]["quickDrillReverse"].pop()
        codes = {issue["code"] for issue in audit_teacher_plan_contract(runtime, request())["errors"]}
        self.assertIn("part6_prompt_count_failed", codes)

    def test_part9_requires_difficulty_ladder(self):
        runtime = complete_runtime()
        runtime["parts"][8]["data"]["questions"][7]["level"] = "direct-recall"
        codes = {issue["code"] for issue in audit_teacher_plan_contract(runtime, request())["errors"]}
        self.assertIn("part9_question_level_failed", codes)

    def test_part9_uncertain_history_is_warning_when_flagged(self):
        runtime = complete_runtime()
        runtime["parts"][8]["data"]["historyStatus"] = "uncertain-flagged"
        runtime["parts"][8]["data"]["historyNote"] = "Current 2026-27 records do not establish prior passage use."
        report = audit_teacher_plan_contract(runtime, request())
        self.assertTrue(report["ok"])
        self.assertEqual(report["warnings"][0]["code"], "part9_history_uncertain")


if __name__ == "__main__":
    unittest.main()
