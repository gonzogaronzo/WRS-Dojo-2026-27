import unittest

from lesson_plan_contract import audit_teacher_plan_contract, validate_teacher_plan_contract
from test_lesson_plan_contract import complete_runtime, request


class LessonPlanFocusContractTests(unittest.TestCase):
    def test_introduction_contract_passes_when_teaching_moves_and_source_sequence_are_complete(self):
        runtime = complete_runtime("introduction")
        req = request()
        req["lessonFocus"] = "introduction"
        report = validate_teacher_plan_contract(runtime, req)
        self.assertEqual(report["status"], "PASS")

    def test_introduction_part2_cannot_collapse_to_a_summary(self):
        runtime = complete_runtime("introduction")
        runtime["parts"][1]["data"]["teachingMoves"] = []
        req = request()
        req["lessonFocus"] = "introduction"
        codes = {issue["code"] for issue in audit_teacher_plan_contract(runtime, req)["errors"]}
        self.assertIn("part2_intro_teaching_moves_missing", codes)

    def test_introduction_requires_complete_source_ordered_part2_sequence(self):
        runtime = complete_runtime("introduction")
        runtime["parts"][1]["data"]["sourceSequenceComplete"] = False
        req = request()
        req["lessonFocus"] = "introduction"
        codes = {issue["code"] for issue in audit_teacher_plan_contract(runtime, req)["errors"]}
        self.assertIn("part2_intro_source_sequence_incomplete", codes)

    def test_automaticity_fluency_contract_passes_without_new_concept(self):
        runtime = complete_runtime("automaticity-fluency")
        req = request()
        req["lessonFocus"] = "automaticity-fluency"
        report = validate_teacher_plan_contract(runtime, req)
        self.assertEqual(report["status"], "PASS")

    def test_automaticity_fluency_rejects_new_reading_concept(self):
        runtime = complete_runtime("automaticity-fluency")
        runtime["parts"][1]["data"]["introducesNewConcept"] = True
        req = request()
        req["lessonFocus"] = "automaticity-fluency"
        codes = {issue["code"] for issue in audit_teacher_plan_contract(runtime, req)["errors"]}
        self.assertIn("part2_fluency_new_concept_failed", codes)

    def test_automaticity_fluency_rejects_new_spelling_concept(self):
        runtime = complete_runtime("automaticity-fluency")
        runtime["parts"][6]["data"]["introducesNewConcept"] = True
        req = request()
        req["lessonFocus"] = "automaticity-fluency"
        codes = {issue["code"] for issue in audit_teacher_plan_contract(runtime, req)["errors"]}
        self.assertIn("part7_fluency_new_concept_failed", codes)


if __name__ == "__main__":
    unittest.main()
