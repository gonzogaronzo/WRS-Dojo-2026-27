# WRS Curriculum Compiler API

Server-side bridge between WRS Dojo and **WRS Curriculum Release 1.0.1**.

## Safety boundary

- The curriculum SQLite database is read-only and is **not** committed to GitHub or shipped to the browser.
- Browser requests require a valid Firebase teacher ID token.
- Generation is fail-closed. The initial production pilot supports **Substep 8.2 only** because Release 1.0.1 contains a validated structural/provenance fixture for 8.2.
- Every returned lesson contains all ten canonical WRS Parts. `lessonPath` controls daily execution only.
- Part 10 remains teacher-selected by runtime design; teacher-facing lesson-plan output defaults Part 10 to TBD unless it was explicitly requested.
- Student advancement is never performed by this service.

## Wilson lesson-selection fidelity gate

Source provenance alone is not enough for a faithful lesson. Generated item sets must also satisfy the Wilson cumulative-selection principles used in lesson planning.

The compiler therefore fails closed unless it can verify all of the following:

- **Part 6, Quick Drill in Reverse:** a selective mixture of vowel sounds and other taught sounds; cumulative review is represented; current/new sounds are represented when the Substep actually introduces them; documented trouble spots are deliberately targeted when present.
- **Part 8, Written Work Dictation:** exactly **5 sounds, 5 word elements, 5 real words, 3 nonsense words, 3 phrases, and 3 sentences** for the current validated fixture.
- Part 8 sounds, word elements, real words, nonsense words, and phrases must deliberately combine **current-substep material with previously taught material**, rather than becoming a single-concept specimen list.
- Part 8 sentences come from the **current Substep**.
- Documented trouble spots must inform item selection when present.

The verified Instructor Manual wording for Part 6 says to use **some vowel sounds and several other sounds**. No exact vowel/consonant ratio has yet been verified from the supplied Wilson sources, so the software must **not invent one**. Instead, generated records must carry machine-checkable `selectionComposition` metadata proving that the required mixture was intentionally constructed.

This gate is intentionally stricter than the original Release 1.0.1 structural/provenance fixture. If a fixture has correct sources but does not contain the required Wilson item counts or composition metadata, automatic generation is blocked until the curriculum release/fixture is repaired and revalidated.

## Canonical teacher-plan contract

The teacher-facing lesson plan is no longer authored as free-form prose. The compiler now treats the existing `wrs-runtime-v1` lesson object as the single lesson record and applies a second fail-closed contract before any teacher plan can render.

`lesson_plan_contract.py` audits the complete lesson and rejects incomplete output. Among other rules, it verifies:

- all 10 Parts are present exactly once and Parts 1-9 carry registered source provenance;
- **Part 1** carries a verified eligible-vowel inventory and actually includes every eligible vowel, plus fully selected cumulative review;
- **Part 2** has 3-4 previous-Substep words and focus-specific requirements for Introduction, Accuracy, or Automaticity/Fluency;
- **Part 3** identifies the existing fat stack and carries explicit current-card, HFW, and Word Element packets;
- **Part 4** names Reader/pages, contains 5-6 exact practice words, and when charting is planned provides a separate named 15-word list for each student rather than one shared group list;
- **Part 5** embeds exactly 10 sentences and exactly 10 weave-in questions;
- **Part 6** contains at least 20 fully selected sound prompts for the project-standard working set;
- **Part 7** contains 3-4 previous-Substep words plus 5-8 current-Substep words and obeys focus-specific scaffolding rules;
- **Part 8** verifies all dictation category counts, Word Element applicability, sentence count, and a Mark/Reinforce target;
- **Part 9** embeds Reader/title/pages, the complete passage, passage-history status, and exactly 10 questions in the required difficulty ladder;
- **Part 10** stays teacher-plan `TBD` unless explicitly requested.

`teacher_plan_renderer.py` has no authority to repair, summarize, or invent missing lesson content. It first calls the contract validator and renders only after a PASS. A failed contract returns HTTP 409 and no teacher-facing plan.

The regression suite includes a deliberately shortchanged 7.4-style lesson that omits one required Part 1 vowel, supplies only two Part 2 review words, and leaves Part 9 without its passage/questions. The audit must report all of those failures, preventing the earlier failure mode where a superficially plausible lesson was presented and repaired only after teacher review.

This new contract is deliberately stricter than the current 8.2 pilot runtime. Automatic generation therefore remains fail-closed until the curriculum fixture/compiler supplies every required teacher-plan field. That is intentional: incomplete lessons do not render.

## Configuration

The service accepts either:

- `WRS_DATABASE_PATH=/path/to/WRS_Curriculum_Release_1.0.1.sqlite` for local development, or
- `WRS_DATABASE_GCS_URI=gs://PRIVATE_BUCKET/path/WRS_Curriculum_Release_1.0.1.sqlite` for Cloud Run.

Other variables:

- `EXPECTED_RELEASE_ID=WRS-CURRICULUM-1.0.1-2026-09-02`
- `ALLOWED_ORIGINS=https://wrs-firebase.web.app`

Cloud Run should allow unauthenticated network invocation so browser CORS/preflight can reach the service. **Application access is still authenticated** because `/v1/lessons/compile` verifies the Firebase ID token itself.

## Endpoints

- `GET /healthz`
- `POST /v1/lessons/compile`

The POST body is planning context from one Dojo Group Instructional Profile. A successful response contains the source-provenanced `wrs-runtime-v1` `runtimePlan`, the teacher-plan validation report, and deterministic `teacherPlanMarkdown`. Those teacher-plan fields are returned only after the selection-fidelity gate and canonical teacher-plan contract both pass.
