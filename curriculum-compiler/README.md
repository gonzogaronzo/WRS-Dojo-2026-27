# WRS Curriculum Compiler API

Server-side bridge between WRS Dojo and **WRS Curriculum Release 1.0.1**.

## Safety boundary

- The curriculum SQLite database is read-only and is **not** committed to GitHub or shipped to the browser.
- Browser requests require a valid Firebase teacher ID token.
- Generation is fail-closed. The initial production pilot supports **Substep 8.2 only** because Release 1.0.1 contains a validated structural/provenance fixture for 8.2.
- Every returned lesson contains all ten canonical WRS Parts. `lessonPath` controls daily execution only.
- Part 10 remains teacher-selected by design.
- Student advancement is never performed by this service.

## Wilson lesson-selection fidelity gate

Source provenance alone is not enough for a faithful lesson. Generated item sets must also satisfy the Wilson cumulative-selection principles used in lesson planning.

The compiler therefore fails closed unless it can verify all of the following:

- **Part 6, Quick Drill in Reverse:** a selective mixture of vowel sounds and other taught sounds; cumulative review is represented; current/new sounds are represented when the Substep actually introduces them; documented trouble spots are deliberately targeted when present.
- **Part 8, Written Work Dictation:** exactly **5 sounds, 5 word elements, 5 real words, 3 nonsense words, 3 phrases, and 3 sentences**.
- Part 8 sounds, word elements, real words, nonsense words, and phrases must deliberately combine **current-substep material with previously taught material**, rather than becoming a single-concept specimen list.
- Part 8 sentences come from the **current Substep**.
- Documented trouble spots must inform item selection when present.

The verified Instructor Manual wording for Part 6 says to use **some vowel sounds and several other sounds**. No exact vowel/consonant ratio has yet been verified from the supplied Wilson sources, so the software must **not invent one**. Instead, generated records must carry machine-checkable `selectionComposition` metadata proving that the required mixture was intentionally constructed.

This gate is intentionally stricter than the original Release 1.0.1 structural/provenance fixture. If a fixture has correct sources but does not contain the required Wilson item counts or composition metadata, automatic generation is blocked until the curriculum release/fixture is repaired and revalidated.

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

The POST body is planning context from one Dojo Group Instructional Profile. The response contains a source-provenanced `wrs-runtime-v1` `runtimePlan` suitable for Dojo's existing compatibility adapter, but only after the selection-fidelity gate passes.
