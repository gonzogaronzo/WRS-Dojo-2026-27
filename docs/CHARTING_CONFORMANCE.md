# Count-based charting conformance

The planning export reads `Data Log!A:L` in addition to Current Snapshot and the six Daily Notes tabs. `functions/chartingEvidence.js` normalizes actual Data Log records; the separate `scripts/wrs-charting-conformance.mjs` validator returns structured findings, record checks, and blockers. The compiler consumes those blockers in `planningReady`. `legacy/wrsLessonPlan.ts` is unchanged.

## Contract and classification

- A score `13/15` establishes **15 items scored**, 13 correct. There is no accuracy threshold. A known denominator below 15 (including zero) is `short`; the message gives the actual and required counts. Counts are never added across records or students.
- Either explicitly identified type (`real` or `nonsense`) is usable. There is no expected-type rule. `Wordlist Charting`, `Word-list reading`, a blank type, or an unrecognized type is `missing-type`, even with a complete count. Type is never inferred from the Substep, words, lesson title, or Current Snapshot summaries.
- `unparseable` means a record exists but its score or identifying data cannot be established. Numeric fractions, an optional numeric percentage, and an optional matching `; N.N complete` annotation are accepted. Arbitrary narrative containing a fraction, contradictory/pending score claims, impossible counts, and missing/ambiguous identity/date/Substep are rejected. A missing denominator is not reported as a known numerical shortage.
- `absent` means no scored charting record exists for an established completed Substep. `wrong-substep` means records exist, but only for other Substeps; they cannot substitute. Neither finding is emitted merely because no completed Substep is established.
- `evidence-unavailable` means the Data Log export/header/structured envelope is missing or invalid. A transport failure rejects the export. A header-only Data Log is available but empty, so required completed-Substep records are absent; current-target charting remains optional until recorded.
- `completion-conflict` means completion claims conflict, rather than completion simply not being established. A malformed/missing completion-state object is `invalid-context`.

Each finding includes a classification, student where known, and source reference where available. Evidence retains raw record values, row numbers and normalization issues for diagnosis. Score normalization never reads formatted Current Snapshot summary fields.

## Completion is not a prerequisite for continued instruction

Completion is represented per student as `resolved`, `none-established`, or `conflicted`. `none-established` says only that no completed Substep is established in the supplied history; it does not assert that the student has never completed one, and it does not block planning.

When a completed Substep is established, the validator requires conforming charting for that Substep. When none is established, that historical evidence requirement does not apply. Existing current-target charting is still checked. Missing current-target charting never blocks; unavailable exports, malformed records, short counts and unidentified types still fail closed exactly as before.

For each student, the latest dated records for the applicable completed Substep and current target are checked, retaining all same-day ties. Selection happens before validation: a newer ambiguous or short record cannot fall back to an older conforming record. Future records are excluded; an unusable date cannot be silently excluded as future. Prior-Substep charting supports a new Introduction target: 7.4 for a group beginning 7.5, and 5.4 for a group beginning 5.5.

## Accepted statements and safeguards

`scripts/wrs-completed-substep.mjs` uses all dated Daily Notes history through `asOf`, matched to group and student. Completion may be established by an explicit completed-Substep statement, or, without a request-time target override, an unconditional advancement from one identified Substep to the corroborated current target. A Source label such as Daily Debrief is accepted; the literal text “Teacher live note” is not required.

Accepted examples include:

- `We completed Substep 5.4.`
- `Student A completed Step 5.4 today.` (only for Student A)
- `Substep 5.4 is complete today.`
- `The group has finished Step 5.4 this morning.`
- `Today, we completed Substep 5.4.`
- `Step 5.4 was completed yesterday.`

The parser recognizes completed objects and subjects rather than merely searching for the word “completed.” Supported trailing time phrases are today, yesterday, this morning, this afternoon, this week, and `on YYYY-MM-DD`. Arbitrary prose is not presumed to establish completion.

| Rejected example | Why |
| --- | --- |
| `We almost completed Substep 5.4 today.` | Partial, not complete. |
| `We have not completed Step 5.4.` | Negated. |
| `We will have completed Step 5.4 tomorrow.` | Future prediction. |
| `Step 5.4 is complete if the final assessment passes.` | Conditional. |
| `Step 5.4 is complete?` | Question, not assertion. |
| `Teacher asked: “Substep 5.4 is complete.”` | Quoted rather than a direct assertion. |
| `Student B completed Substep 5.4 today.` when checking Student A | Different student. |
| `We completed Step 5.4 dictation today.` | Dictation, not the Substep, is the completed object. |
| `We completed the lesson for Step 5.4.` | Lesson-session completion is not Substep completion. |
| `We completed Substep 5.4 but still need final instruction.` | Qualified completion is not accepted. |

Same-date conflicting completed Substeps, or a same-date/newer explicit statement that the identified Substep is incomplete, produce `conflicted`. This remains a blocker. Dojo mission rows never establish Substep completion: their “Completed Step” text describes a session, and cannot overrule contradictory teacher notes. Human Dojo group/daily notes are not excluded merely for being entered through Dojo.

An explicit teacher completion statement establishes the **completion claim** independently of scores; charting conformance remains a separate result. A recognized completed-Substep claim without its required scored evidence still yields `absent`/`wrong-substep` and blocks. This separation was retained, not changed to settle the teacher's open policy question about evidence-backed completion.

## Request-time target

An explicitly requested target takes precedence over snapshot and inferred daily targets. It is a planning instruction, not a placement/completion claim. It does not change official placement, invent advancement, or select an inferred next target for the queue. The target's source is recorded as `teacher-request:...`, and differing placement is labeled `teacher-directed`.

Supported entry points:

- Authenticated planning export request: `targetOverrides: { "3A": "2.5" }`.
- Sheet-values group metadata/live-feed group: `teacherTargetOverride: "2.5"`.
- Direct compiler input: `teacherTargetOverride: "2.5"`.
- Compiler CLI: `--target 2.5`.

The override is carried through the export, adapter, refresh, snapshot and queue. It is validated and scoped to the request; it is not persisted as placement. It disables advancement-based completion inference. Existing explicit completed-Substep claims remain visible and their charting is validated, so a target request cannot bypass known count/type defects or absent required evidence. Focus overrides remain separate.

The sheet-values adapter supports raw connector `dataLogValues` and the production reader's normalized `chartingEvidence`. Older exports without either fail closed. Direct compiler callers can pass `chartingEvidence`; CLI callers use `--charting-evidence evidence.json`. The additive snapshot `chartingConformance` property and request authority participate in the full-snapshot build fingerprint.

## Revised live September 18 comparison

Read-only Google Sheets retrieval: **2026-09-23 01:52:15 UTC** (September 22 in Chicago), evaluated with `asOf=2026-09-18`, no teacher target or focus overrides. This is the live log filtered to September 18, not an immutable historical revision.

Sources: Student Data Log spreadsheet `1RcYj87UyBYWTRvOjmfpyJjvYVb5AWIV5aY6t6Ss9G7o` (Current Snapshot and Data Log), Daily Notes spreadsheet `19zP4P2D7ndw7MjF1ujDDc4gDpR3Pbbe-Xy0TP-n8jeo` (2nd, 3A, 3B, 4A, 5A, 5B). Full populated ranges were read within the metadata-confirmed grids: 398 Data Log rows including the header and 19 Current Snapshot students.

Freshly retrieved real values were replayed through `readPlanningSheetValues` (eight reads), the adapter, and refresh/compiler. Only the Google transport was substituted with the retrieved values. The same new capture was also run through merged PR #51 head `f6d7c345c8f2e3a13d19b13c7f90e10126300690` and original PR #52 head `1066a8ac6caf8723ecea32f20f75edf3af91806a`. Raw student data is outside the repository; nothing was deployed.

| Group | PR #51 baseline | Original PR #52 | Revised PR #52 | Reason |
| --- | --- | --- | --- | --- |
| 2nd | ready | blocked | ready | Row 256 has 15 scored, 13 correct, real type. No completed Substep is established, so ongoing 1.6 instruction is permitted. Partial post-test/unfinished dictation is not falsely promoted to completion. |
| 3A | ready | blocked | ready | Rows 262–265 establish 15 scored for all four students in 2.5. Completion is `none-established`, nonblocking. Teacher reports of lesson/dictation completion do not become Substep completion, and contradicted Dojo mission claims are not used. |
| 3B | ready | blocked | blocked | Row 353 identifies nonsense reading and 15 scored: conforming. Rows 354–356 each have 15 scored but lack real/nonsense type: three `missing-type` blockers remain. Completion uncertainty no longer blocks. |
| 4A | blocked | blocked | blocked | Only the existing explicit-instruction-versus-Accuracy conflict remains. Completion is `none-established`, nonblocking; absent current-target 5.2 charting is not a blocker. |
| 5A | ready | ready | ready | Teacher-confirmed advancement establishes completed 7.4. Rows 343–345 each identify real-word charting and 15 scored. No 7.5 charting is required. |
| 5B | ready | blocked | blocked | Explicit completion establishes 5.4. Row 346 conforms. Row 347 is narrative reporting 15/15 while saying final charting is outstanding: `unparseable`, not `short` or `absent`. No 5.5 charting is required. |

No selected live denominator is below 15. Short-count behavior is tested synthetically, not attributed to 13/15 real scores. Relative to the previous draft, two groups regain readiness; relative to PR #51, only 3B and 5B change readiness.

Private capture SHA-256: `6271260b22686ca093387840fff694e4b9d271888644582f526b2f6a0bcc82ab`.

Private session artifacts in `/private/tmp/wrs-charting-sep18/`: `live-sheet-values-revision.json`, `revision-normalized-export.json`, `revision-report.json`, `revision-snapshots.json`, and `verify-revision.mjs`. Run `node /private/tmp/wrs-charting-sep18/verify-revision.mjs` to repeat all three compiler comparisons against this capture. The earlier captures and reports remain separate. Raw student exports must remain outside repository fixtures.
