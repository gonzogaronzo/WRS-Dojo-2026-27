# Count-based charting conformance

The planning export reads `Data Log!A:L` in addition to Current Snapshot and the six Daily Notes tabs. `functions/chartingEvidence.js` normalizes actual Data Log records; the separate `scripts/wrs-charting-conformance.mjs` validator returns structured findings, record checks, and blockers. The compiler consumes those blockers in `planningReady`. `legacy/wrsLessonPlan.ts` is unchanged.

## Contract and classification

- A score `13/15` establishes **15 items scored**, 13 correct. There is no accuracy threshold. A known denominator below 15 (including zero) is `short`; the message gives the actual and required counts. Counts are never added across records or students.
- Either explicitly identified type (`real` or `nonsense`) is usable. There is no expected-type rule. `Wordlist Charting`, `Word-list reading`, a blank type, or an unrecognized type is `missing-type`, even with a complete count. Type is never inferred from the Substep, words, lesson title, or Current Snapshot summaries.
- `unparseable` means a record exists but its score or identifying data cannot be established. Numeric fractions, an optional numeric percentage, and an optional matching `; N.N complete` annotation are accepted. Arbitrary narrative containing a fraction, contradictory/pending claims, impossible counts, and missing/ambiguous identity/date/Substep are rejected. A missing denominator is not reported as a known numerical shortage.
- `absent` means no scored charting record exists for the required completed Substep. `wrong-substep` means records exist, but only for other Substeps; they cannot substitute.
- `evidence-unavailable` means the Data Log export/header/structured envelope is missing or invalid. A transport failure rejects the export. A header-only Data Log is available but empty, so required records are absent.
- `completed-substep-unresolved` means the required historical Substep cannot be established. Fail closed rather than infer a numeric predecessor, promote lesson/Part completion to Substep completion, or require charting of the current target.

Each finding includes a classification, student where known, and source reference where available. Evidence retains raw record values, row numbers and normalization issues for diagnosis. Score normalization never reads formatted Current Snapshot summary fields.

## Completion and record selection

`scripts/wrs-completed-substep.mjs` resolves completion per student from dated explicit teacher history through `asOf`: an explicit completed-Substep statement, or an unconditional teacher advancement from an identified prior Substep to the corroborated current target. It uses all available Daily Notes history, not just the newest day. Same-day conflicting completed Substeps remain unresolved. Only supported, unqualified teacher statements establish completion; generic Dojo mission completion does not. This deliberately does not claim to understand arbitrary teacher prose.

For each student, the latest dated records for the completed Substep are checked, retaining all same-day ties. Selection happens before validation: a newer ambiguous or short record cannot fall back to an older conforming record. Existing current-target records are checked too, but **absence of current-target charting is never a blocker**. Prior-Substep charting supports a new Introduction target: 7.4 for a group beginning 7.5, and 5.4 for a group beginning 5.5. Other historical Substeps do not substitute for the completed one. Future records are excluded. A record with an unusable date cannot be silently excluded as future.

Missing completion history is reported separately from missing charting. Ongoing instruction, a partial post-test, completed dictation, completed lesson parts, and current placement alone do not establish the most recently completed Substep. To resolve this blocker the teacher history needs an explicit dated completion statement for the applicable students; the software does not invent one.

The sheet-values adapter supports raw connector `dataLogValues` and the production reader's normalized `chartingEvidence`. Older exports without either fail closed. Direct compiler callers can pass `chartingEvidence`; CLI callers use `--charting-evidence evidence.json`. The additive snapshot `chartingConformance` property participates in the existing full-snapshot build fingerprint. Old stored snapshots remain schema-readable, but a new compilation always produces a conformance result.

## Live September 18 comparison

Read-only Google Sheets retrieval: **2026-09-23 00:25:49 UTC** (September 22 in Chicago), evaluated with `asOf=2026-09-18`, no teacher overrides. This is today's live log filtered to September 18, not a claim to reconstruct an immutable historical revision.

Sources: Student Data Log spreadsheet `1RcYj87UyBYWTRvOjmfpyJjvYVb5AWIV5aY6t6Ss9G7o` (Current Snapshot and Data Log), Daily Notes spreadsheet `19zP4P2D7ndw7MjF1ujDDc4gDpR3Pbbe-Xy0TP-n8jeo` (2nd, 3A, 3B, 4A, 5A, 5B). Full populated ranges were read within the metadata-confirmed grids: 398 Data Log rows including the header and 19 Current Snapshot students.

The freshly retrieved real values were replayed through the actual `readPlanningSheetValues` reader (eight reads), the sheet-values adapter, and the refresh/compiler. Only the Google transport was replaced by the retrieved values. The baseline compiler came from merged head `f6d7c345c8f2e3a13d19b13c7f90e10126300690`. No student values were manufactured or committed, and no Functions deployment was performed.

| Group | Before → after `planningReady` | Evidence and reason |
| --- | --- | --- |
| 2nd | true → false | Current 1.6 real-word record at Data Log row 256 establishes 15 scored, 13 correct. It conforms, but no explicit most-recently-completed Substep is established; the post-test is still in progress. |
| 3A | true → false | Rows 262–265 establish 15 scored for all four students in 2.5. All conform. Teacher records describe lesson/dictation completion and ongoing review/backfill, not an established completed Substep for each student. Generic Dojo completion cannot fill this gap. |
| 3B | true → false | Row 353 explicitly identifies nonsense reading, 12 correct of 15 scored, and conforms. Rows 354–356 each establish 15 scored but do not identify real/nonsense: three `missing-type` blockers. Completed Substep is also unresolved; the teacher history describes ongoing 2.5 and conditional advancement. |
| 4A | false → false | Existing explicit-instruction-versus-Accuracy conflict remains. Completed Substep is also unresolved: finished Part 8 and a move into 5.2 do not supply an explicit Substep-completion statement. Missing current-target 5.2 charting is **not** the blocker. |
| 5A | true → true | Teacher-confirmed advancement establishes completed 7.4. Rows 343–345 each identify real-word charting and 15 scored. No 7.5 charting is required. |
| 5B | true → false | Explicit completion establishes 5.4. Row 346 (`15/15; 5.4 complete`) conforms. Row 347 is narrative reporting 15/15 while saying final charting is outstanding: `unparseable`, not `short` or `absent`. The earlier 13/15 record is not a shortage and cannot replace the newer ambiguous record. No 5.5 charting is required. |

No selected live record demonstrates a denominator below 15. Short-count behavior is covered by synthetic tests, not falsely attributed to these real scores. Four groups change readiness; one stays ready and one remains blocked.

Private capture SHA-256: `56ddc211da32df4bb4e4523b1487e9554680b89433ac15f7b60773a99de0621e`.

Session artifacts, intentionally outside the repository, are in `/private/tmp/wrs-charting-sep18/`: `live-sheet-values-conformance.json`, `normalized-export.json`, `conformance-report.json`, `conformance-snapshots.json`, and `verify-live.mjs`. The original `live-sheet-values.json` is the earlier local baseline capture, not an edit to Google Sheets. Run `node /private/tmp/wrs-charting-sep18/verify-live.mjs` in this session to repeat the comparison against the captured source. To verify another live state, retrieve the same native ranges into a private capture and repeat the pipeline with the requested cutoff. Raw student exports must remain outside repository fixtures.
