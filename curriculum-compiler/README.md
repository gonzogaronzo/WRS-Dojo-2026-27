# WRS Curriculum Compiler API

Server-side bridge between WRS Dojo and **WRS Curriculum Release 1.0.1**.

## Safety boundary

- The curriculum SQLite database is read-only and is **not** committed to GitHub or shipped to the browser.
- Browser requests require a valid Firebase teacher ID token.
- Generation is fail-closed. The initial production pilot supports **Substep 8.2 only** because Release 1.0.1 contains a validated structural/provenance fixture for 8.2.
- Every returned lesson contains all ten canonical WRS Parts. `lessonPath` controls daily execution only.
- Part 10 remains teacher-selected by design.
- Student advancement is never performed by this service.

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

The POST body is planning context from one Dojo Group Instructional Profile. The response contains a source-provenanced `wrs-runtime-v1` `runtimePlan` suitable for Dojo's existing compatibility adapter.
