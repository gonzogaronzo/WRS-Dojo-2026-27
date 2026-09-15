# WRS Dojo Runtime → Current Consumer Crosswalk

Status: current implementation map for draft PR #41. This is app architecture documentation, not Wilson instructional authority.

## Why this exists

The app currently stores/renders a legacy `Lesson` envelope even when `runtimePlan` is authoritative. Canonicalization requires an explicit map from each runtime Part to every current screen field so content cannot silently disappear during projection.

The Step 2.5 specimens are behavioral/reference evidence for Parts 1 and 3–10. The Step 7.3 specimen is behavioral evidence for interactive Part 2. The 5A Step 7.4 regression fixture checks a different source-grounded lesson shape. None of the older exports is itself the canonical format.

## Current PR #41 projection and consumption

| Part | Runtime source | Legacy compatibility field | Runtime/screen consumer | Current status / remaining boundary |
|---|---|---|---|---|
| 1 | `data.quickDrill` plus retained runtime metadata | `quickDrill` | `QuickDrill` | core drill list projects; richer selection metadata remains runtime-owned |
| 2 | `data.part2Presentation` or legacy `data.slides` fallback | `slides` fallback + retained `runtimePlan` | `TeachConcepts` / interactive Part 2 runner | interactive source-owned action/display/object/staging structure is validated; legacy slides remain migration fallback |
| 3 | `data.wordCards` | `wordCards` | `WordCards` | flat rendered packet projects; richer current/review/fat-stack metadata remains runtime-owned |
| 3 | `data.hfwList` | `hfwList` | `WordCards` HFW packet | current lesson packet projects; cumulative mastery belongs to durable student/group state rather than canonical lesson duplication |
| 4 | `data.practiceWords`, `data.chartingWords`, `chartingPlanned` | `wordListPractice`, `wordListCharting`, `wordListReading`, `wordListReadingAuto` | `WordlistReading` | practice-only lessons now project the practice list instead of an empty charting deck; student-specific targets/lists remain runtime-owned where supplied |
| 5 | `data.sentences`, `data.weaveQuestions` | `sentences` plus retained `runtimePlan` | runtime-aware `SentenceReading` | sentences project; teacher weave questions are read from runtime and kept off the passive student display |
| 6 | `data.quickDrillReverse`, `data.wordElements` | `quickDrillReverse` plus generated `wrsPlan` summary | reverse `QuickDrill` | exact supplied notation remains runtime-owned and survives projection/export |
| 7 | review/current fields plus optional explicit `data.spellingItems` packet | `conceptNotes7` plus retained `runtimePlan` | runtime-aware `TeachConcepts` / `Part7SpellingRunner` | canonical dictate/reveal path uses explicit supplied representations and fails closed instead of reconstructing cards from spelling; lessons without `spellingItems` retain legacy fallback during migration |
| 8 | `data.dictation` plus category provenance/exception metadata | `dictation` plus retained `runtimePlan` | Written Work Dictation | rendered dictation projects; provenance/exception metadata remains runtime-owned and survives canonical export |
| 9 | `data.passage`, title/page/Reader/questions/history metadata | `passage` plus retained `runtimePlan` | runtime-aware `PassageReading` | passage projects; title/source label/questions/history note are read from runtime; teacher questions/history stay private from student display |
| 10 | `data.teacherPlanStatus`, optional `data.listeningComprehension` | `listeningComprehension` plus generated compatibility summary | Part 10 | runtime retains TBD/planned distinction; supported listening-comprehension payload projects |

## Deterministic `wrsPlan` compatibility view

A bare canonical import must not require a second independently authored `wrsPlan`. PR #41 now generates the old Official WRS Plan Details compatibility view from runtime data through `runtimeLessonToCompatibilityWrsPlan()`.

Current behavior:

1. Runtime plan is authored once.
2. Runtime is normalized and validated.
3. Runtime deterministically generates the legacy `Lesson` fields still consumed by older screens.
4. Runtime also deterministically generates the still-required `wrsPlan` compatibility view.
5. Neither generated compatibility view becomes canonical export input.
6. Source verification is conservative: an unmarked source-controlled reference becomes `needs-verification`, not `verified`.

## Source-verification projection

The canonical source manifest may explicitly mark a source `verified`, `needs-verification`, or `teacher-created`.

The compatibility projection does not invent verification:

- explicit `verified` remains verified;
- explicit `needs-verification` remains unresolved;
- teacher selections default to `teacher-created`;
- unmarked source-controlled references project as `needs-verification`;
- the overall compatibility status is `source-verified` only when all non-teacher sources are explicitly verified, `partially-verified` when some are, and otherwise `draft`.

## Runtime-owned fields that must not be flattened away

Several current lesson requirements intentionally remain in `runtimePlan` instead of being forced into old flat fields. Current examples include:

- source verification status
- explicit `chartingPlanned`
- student charting/practice targets when supplied
- charting/practice rationales
- Part 5 `weaveQuestions` and categories
- Part 7 `spellingItems` representation packet
- Part 8 category source IDs / exceptions
- Part 9 structured questions and history status/note
- Part 10 teacher-plan status

Keeping these runtime-owned prevents the compatibility envelope from becoming a second authored truth.

## Canonical export rule

Export serializes the validated runtime object only. It does not serialize the compatibility envelope and then expect a future importer to decide which duplicate value wins.

The deployed 3A 2.5 browser QA exercised the actual Export Canonical JSON path, then re-imported and ran the exported lesson again.

## Round-trip equality

The round-trip gate compares **instructional equivalence**, not byte identity. Allowed differences are noninstructional IDs/timestamps generated by persistence. Not allowed:

- missing Part content
- changed word/sound/item selections
- lost Part 2 representation/staging
- lost student-specific charting assignments when supplied
- lost weave questions
- lost Part 7 explicit representation packet when supplied
- lost Dictation categories/provenance
- lost Part 9 title/page/passage/questions/history status
- changed planned Parts or lesson focus
- lost or silently upgraded source-verification status

## Remaining migration boundary

The current app is not yet fully runtime-native. Legacy fields and legacy Part 7 fallback still exist for backward compatibility. Canonical v1 therefore defines one authoritative interchange truth while allowing deterministic compatibility projection during migration. Removing the compatibility envelope entirely is a later architectural step, not a requirement for the first canonical interchange contract.
