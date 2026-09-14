# WRS Dojo Canonical Lesson JSON v1

Status: working contract for canonicalization. Not production-canonical until the round-trip and browser gates below pass.

## Architecture decision

The canonical interchange format is a **bare `wrs-runtime-v1` lesson object** (`WRSRuntimeLessonPlan`). It is the single authored instructional truth.

The legacy `Lesson` / `schemaVersion: 2` object remains an **internal compatibility/persistence envelope only** while existing screens still consume legacy fields. Those fields must be deterministically projected from the runtime lesson. They are not independently authored in canonical JSON.

Therefore:

- Canonical import input: top-level `schemaVersion: "wrs-runtime-v1"`.
- Canonical export target: the validated `runtimePlan`, not a dump of editor `formData`.
- Legacy JSON remains importable for backward compatibility but is not a generation target.
- A canonical lesson contains Parts 1–10 exactly once. `plannedParts` controls the run route.
- Source/provenance and teacher/student privacy boundaries are part of the contract, not optional metadata.

## Evidence used to establish this contract

1. Current production importer/runtime adapter on `independent-hosting`.
2. Exported Step 2.5 lesson that is close to correct for Parts 1 and 3–10.
3. Exported Step 7.3 lesson that is known-good for interactive Part 2.
4. Draft PR #40 runtime/instructional-contract work, used as design evidence only. PR #40 remains separate, draft, and unmerged.

## Canonical top-level fields

Required:

- `schemaVersion`: exactly `wrs-runtime-v1`
- `id`
- `title`
- `step`
- `substep`
- `focus`: `introduction | accuracy | automaticity-fluency`
- `sources`
- `parts`: exactly Parts 1–10 once each

Supported planning fields:

- `lessonPath`
- `plannedParts`
- `planningContext.conceptsToWeave`
- `planningContext.troubleSpots`

## Part ownership

The runtime Part is authoritative for the content below. Legacy screen fields are derived from it.

| Part | Canonical runtime ownership | Current legacy projection / consumer |
|---|---|---|
| 1 | `data.quickDrill` plus verified selection metadata | `quickDrill` |
| 2 | `data.part2Presentation`, focus-specific review/current data, source refs | `slides` fallback plus interactive Part 2 runner |
| 3 | `data.wordCards`, `data.hfwList`, current/review packet metadata | `wordCards`, `hfwList` |
| 4 | Student Reader/page, `practiceWords`, charting plan/lists/targets | word-list practice/charting fields |
| 5 | Student Reader/page, `sentences`, `weaveQuestions` | `sentences` plus runtime weave questions |
| 6 | `quickDrillReverse`, `wordElements` | `quickDrillReverse` |
| 7 | review/current spelling words, Word Elements, focus-specific teaching/repair metadata | spelling runner/runtime fields plus compatibility summary |
| 8 | complete `dictation` payload plus category provenance and Mark/Reinforce target | `dictation` |
| 9 | Reader/page/title/full passage/questions/history status | passage fields and passage runner |
| 10 | `teacherPlanStatus` and optional supported listening-comprehension payload | Part 10 runner / TBD state |

## Part 2 contract

Part 2 uses `data.part2Presentation` with validated `interactiveSteps` when an interactive presentation is required. Each instructional move must explicitly carry the representation needed by the runner rather than asking the UI to infer it from spelling.

At minimum, interactive moves need the current validated fields appropriate to the move, including:

- `id`
- `actionType`
- `displayType`
- `layout`
- explicit source-owned `objects`
- `provenance`
- `sourceRef`
- `cardRepresentation` when the move is a build/read/manipulation requiring a physical-card representation

Known-good 7.3 is the representation/chassis reference. Its instructional content must never be copied into another Substep merely because the structure works.

## Canonicalization invariant

There must be only one instructional truth. If a runtime field and a legacy field disagree, the runtime value wins and the legacy value is regenerated.

A canonical exporter must never serialize both independently editable versions as coequal lesson content.

## Legacy compatibility boundary

Until all screens are runtime-native, import may project the runtime into a legacy `Lesson` envelope. That projection must be deterministic and covered by tests.

The following are compatibility output, not canonical input truth:

- top-level `quickDrill`
- top-level `slides`
- top-level `wordCards`
- top-level `hfwList`
- top-level `wordListReading` / practice / charting fields
- top-level `sentences`
- top-level `dictation`
- top-level `passage`
- `wrsPlan`

`wrsPlan` may continue to be populated while current UI still reads it, but it must be generated from the runtime lesson.

## Gates before this becomes production-canonical

A lesson format is not canonized merely because it parses. The following must all pass:

1. **Schema gate**: valid `wrs-runtime-v1`, Parts 1–10 exactly once, valid focus and source references.
2. **Instructional contract gate**: required Part-specific content is complete and source-grounded; no teacher-selection placeholders.
3. **Projection gate**: runtime → legacy compatibility projection preserves every field consumed by the current screens.
4. **Runner gate**: Parts 1–10 visibly render the intended content; interactive Part 2 works without fallback failure or hidden answer leakage.
5. **Persistence gate**: save → full reload → reopen/run preserves instructional content and intended runtime state.
6. **Export gate**: export emits canonical runtime JSON, not mutable legacy/editor state.
7. **Round-trip gate**: canonical import → save → export → re-import is instructionally equivalent. IDs/timestamps may differ; instructional content may not disappear or change.
8. **Regression gate**: representative lessons cover at least 2.5, 7.3, 7.4, an affix-heavy lesson, and a Greek/Latin-heavy lesson.

## First reference-build sequence

1. Use the exported 2.5 lesson as behavioral evidence for Parts 1 and 3–10.
2. Use the exported 7.3 lesson as behavioral evidence for interactive Part 2.
3. Build one fresh complete 2.5 runtime lesson from current source-grounded 3A content. Do not patch the old hybrid file.
4. Run every gate above against that 2.5 lesson.
5. Only after the 2.5 round trip passes, promote the structure from working contract to canonical v1 and make generator/exporter code depend on it.

## Separate known bug

Lesson-stage vertical overflow/scrolling is an app layout defect, not a JSON-schema defect. Track and repair it independently so schema work does not hide or absorb a viewport bug.
