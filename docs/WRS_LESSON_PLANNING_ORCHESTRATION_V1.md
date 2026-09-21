# WRS Lesson Planning Orchestration v1

## Purpose

This layer turns the existing WRS instructional protocol into a repeatable build pipeline. It does not replace the protocol and it does not create a new curriculum authority.

The lesson generator must never reconstruct group state by searching months of notes, and it must never use an old lesson plan as curriculum authority.

## Canonical inputs

Every build uses exactly four planning inputs:

1. A dated `wrs-group-planning-snapshot-v1` object.
2. One matching `wrs-substep-source-packet-v1` object.
3. Selection / passage history.
4. The active WRS lesson-generation protocol and active teacher-plan contract version.

The output is one `wrs-runtime-v1` lesson. The compact teacher plan and Dojo import are rendered from that same validated runtime object.

## Current-state authority

When compiling the Group Planning Snapshot, use this precedence:

1. Newest explicit teacher report.
2. Current Snapshot record.
3. Detailed dated lesson / student-data record.
4. Generic Dojo completion event.
5. Previous lesson plan.

A lower-authority record must never silently overwrite a higher-authority record. Conflicts remain visible until resolved.

The snapshot is a derived build artifact. It is generated from the live records and should not become another manually maintained student-data store. Real student snapshots are not committed as repository fixtures.

### Live-record snapshot compiler

`scripts/wrs-compile-planning-snapshot.mjs` now compiles a group snapshot from current row exports of `WRS 2026–27 Student Data Log` → `Current Snapshot` plus the matching group tab from `WRS 2026–27 Daily Notes Log`.

The compiler applies the project authority order conservatively: a newer explicit teacher report can supersede an older Current Snapshot value, while review/backfill remains separate from official placement. A future advancement condition such as “finish sentence dictation, then advance to 5.5” becomes `ready-pending-completion`; it is not recorded as completed advancement.

The repository script intentionally does **not** pretend to have Google Drive credentials. A live connector/exporter must supply the two row sets at build time. This keeps Google authentication outside the lesson-planning contracts and prevents a second manually maintained student-data store.


A second adapter, `scripts/wrs-refresh-from-sheet-values.mjs`, accepts the raw two-dimensional `values` matrices returned by the Google Sheets API / Drive connector. It maps header rows to named records, validates duplicate/missing headers and tabs, builds the canonical live feed, compiles all group snapshots, and builds the queue in one command. This removes the old manual row-normalization step while still keeping authentication in the connector layer.

## Curriculum authority

For source-packet construction, use this precedence:

1. Exact Substep Step Instruction.
2. WRS Instructor Manual.
3. Dictation Book.
4. Student Reader.
5. Student Notebook / Answer Key.
6. Scope-and-sequence or alignment resources.
7. Assessment materials.
8. District-created materials.
9. Teacher-created resources / previous plans.

Previous lesson plans may establish what was already used. They never establish what Wilson requires.

## Substep Source Packets

A packet is versioned against a curriculum release. It contains source IDs, locators, verification status, current-concept references, cumulative eligibility, and Part 1-10 input references.

Persistent packets should reference stable source identifiers and exact source locators instead of copying long Wilson passages, scripts, or source pages into the application repository. Ephemeral conversation/file IDs are not durable source identifiers and must not be stored as canonical locators.

If a source is searchable but lacks the visual/verbatim authority required by the release safety policy, the affected packet fields remain `partial` or `blocked`. The packet does not upgrade its own evidence.

### Verified reusable packets

`curriculum/source-packets/5.5.v1.json` is the first reusable verified packet. Packet v1.0.4 resolves against the original Fourth Edition Steps 1-6 Instructor Manual/Step Instruction, Dictation Book, Student Reader Five, and Student Notebook 1-6 Answer Key. It stores stable source IDs and exact page/range locators rather than duplicating long source text.

For Substep 5.5, the verified source locations include:

- Step Instruction: Instructor Manual PDF pp. 338-348 / printed pp. 346-356.
- Dictation Book: 5.5 words on PDF pp. 123-126, phrases on PDF p. 128, and sentences on PDF pp. 137-138.
- Student Reader Five: printed pp. 108-117 word lists, 118-127 sentences, and 128-141 controlled passages.
- Student Reader Five Substep 5.2N, printed p. 31 / PDF p. 33: verified prior-Substep Wilson nonsense-word pool, eligible only as cumulative review when Part 8 requires nonsense words. It must never be labeled as current 5.5 nonsense material.
- Student Notebook 1-6 Answer Key: relevant sound, syllable-exception, prefix, spelling-option, and HFW entries are registered by PDF page in the packet.

The packet was manually reconciled against the original PDFs before being marked `verified`. Searchable companions remain retrieval aids only.


`curriculum/source-packets/7.5.v1.json` is the second reusable verified packet. Packet v1.0.0 resolves against the Fourth Edition Step 7 Instruction, Dictation Book 7–12, Student Reader 7, and Student Notebook 7–12 Answer Key.

For Substep 7.5, the verified source locations include:

- Step Instruction: printed pp. 152–168.
- Dictation Book 7–12: HFWs on PDF p. 11 / printed p. 5; words on PDF pp. 24–25 / printed pp. 18–19; phrases on PDF p. 28 / printed p. 22; sentences on PDF pp. 37–38 / printed pp. 31–32.
- Student Reader 7: 7.5 wordlists on PDF pp. 136–141 / printed pp. 134–139; sentence pages on PDF pp. 142–147 / printed pp. 140–145; controlled passages on PDF pp. 148–159 / printed pp. 146–157.
- Student Reader 7 Substep 7.1N, PDF p. 15 / printed p. 13: verified prior-Substep Wilson nonsense-word pool, eligible only as cumulative review when Part 8 requires nonsense words. It must never be labeled as current 7.5 nonsense material.
- Student Notebook 7–12 Answer Key: possessive reference on PDF p. 62 / printed p. 58 and contractions reference on PDF p. 65 / printed p. 61.

The packet preserves the Step Instruction sequence: contractions are taught first; singular possessives are subsequent instruction; plural possessives follow after singular possessives are mastered. Substep 7.5 introduces no new sounds and provides no nonsense-word charting.

Source-library note: the older `WRS_Step_Instruction_Canonical_Set_2026-08-30` Step 7 Markdown stops after printed p. 130. The complete Step 7 searchable companion from `WRS_Curriculum_Release_1.0.1_2026-09-02` was used for retrieval and reconciled against the supplied visual/PDF authority for printed pp. 152–168. The truncated older Markdown must not be treated as complete 7.5 authority.


Four additional current-path packets are now verified and reusable:

- `curriculum/source-packets/1.6.v1.json` v1.0.0: base word + suffix `-s/-es`, suffix pronunciations, later plural-noun/action-verb distinction, current HFWs, Reader One controlled material, Dictation Book material, and Notebook references. The packet preserves the Wilson boundary that real-word accuracy/automaticity precedes 1.6 nonsense-word work.
- `curriculum/source-packets/2.5.v1.json` v1.0.0: three-letter blends/up to six sounds, `-s/-es`, later closed-syllable Latin bases ending in `ct`, current HFWs, Student Reader Two material, dictation material, and notebook references. The corrected-order Dictation Book scan establishes the packet's 2.5 page locators and supersedes older inconsistent derived offsets.
- `curriculum/source-packets/3.1.v1.json` v1.0.0: initial two-closed-syllable/multisyllabic work, four syllable-division rules, `s` saying /z/ between vowels, and the multisyllabic spelling procedure; schwa and the five closed-syllable prefixes remain Subsequent Lessons. The packet also registers Student Reader Two as the prior-Substep 2.5 review authority.
- `curriculum/source-packets/5.2.v1.json` v1.0.0: open-syllable prefixes with stand-alone base words and one-consonant open-syllable division first; multiple-consonant division, schwa, and complex-base analysis remain Subsequent Lessons. Reader Five, Dictation Book, and Notebook locators are visually reconciled.

These six packets cover the currently recorded instructional targets for 2nd, 3A/3B, 4A, 5A, and 5B without requiring a fresh whole-library source search for each lesson.

## Build flow

1. **Compile state** from Current Snapshot plus newer Daily Notes / teacher reports.
2. **Reject stale state** if a newer teacher report exists than the snapshot `asOf` state used by the build.
3. **Resolve conflicts**. A conflict affecting roster, placement, current target, focus, unfinished work, or advancement blocks the build until resolved.
4. **Resolve the target Substep**. Official placement and review/backfill remain separate fields. Advancement occurs only from explicit teacher authority / recorded completion conditions.
5. **Load the packet** for that exact target Substep and active curriculum release.
6. **Apply selection history** so passage and controlled-item reuse is deliberate rather than accidental.
7. **Compute the input fingerprint** from substantive snapshot state, packet contents/version, build request, and selection history. Volatile generation timestamps/IDs do not change the fingerprint.
8. **Generate one complete runtime object** in `wrs-runtime-v1` format.
9. **Run mechanical gates** in this order:
   - runtime structural schema;
   - current-state / packet compatibility gate;
   - active teacher-plan instructional contract;
   - live-runtime compatibility gate.
10. **Fail closed** on any error. Do not render a teacher plan or import JSON from a failed runtime.
11. **Render both outputs from the same runtime object** after all gates pass.
12. **Record results** after instruction so the next snapshot reflects actual Parts completed, unfinished work, student data, passage history, and teacher advancement decisions.

The executable orchestration gate is `scripts/wrs-lesson-orchestrator.mjs`. It provides `preflight` and final `gate` modes. The deterministic fingerprint utility is `scripts/wrs-lesson-build-fingerprint.mjs`.

## Required planning checks

The orchestration gate must verify at minimum:

- current roster and dated state provenance;
- official placement separate from review/backfill target;
- current focus;
- actual last Parts completed and unfinished work;
- latest charting / spelling / dictation data;
- HFW and notebook status when known;
- individual and group trouble spots;
- passage and selection history;
- explicit advancement status;
- no silently ignored blocking conflict;
- source packet Substep matches the resolved instructional target;
- source packet is current for the requested curriculum release;
- required Part inputs are source-verified for the requested lesson route;
- the generated runtime contains Parts 1-10 exactly once;
- no teacher-selection placeholders where the sources permit a decision;
- source provenance is carried into the runtime.

## Advancement states

Only these states are allowed:

- `continue`
- `ready-pending-completion`
- `teacher-confirmed-advance`
- `unresolved`

A weekly plan may contain a continuation path and an advancement path, but the next Substep is selected only when its entry condition is actually met.

`ready-pending-completion` can support a conditional next-Substep build when there is explicit teacher authority to advance after a named completion condition. Preparing that next runtime is not the same thing as recording that advancement has already occurred.

## First real-group pilot

`curriculum/pilots/5b-5.5-introduction-conditional.json` is the first real-group runtime pilot.

The live 5B state used to authorize the conditional build is:

- current Substep 5.4 Accuracy;
- Part 8 complete except remaining sentence dictation;
- teacher direction dated Sep. 17, 2026: finish those sentences, then advance to 5.5;
- residual accented-syllable identification difficulty should continue to receive support but does not by itself hold the group at 5.4.

The runtime is therefore a prepared 5.5 Introduction path, not a claim that 5B has already completed the 5.4 exit condition. A real student Planning Snapshot is deliberately not committed with the pilot.

The PR48 CI checks the pilot against the PR48 orchestration contracts and against a pinned exact PR40 canonical-gate commit. This keeps the pilot reproducible while the two draft workstreams remain separate and unmerged.

The real pilot now passes that pinned canonical gate. The first failing runs correctly stopped on placeholder-like teacher-selection language; after those strings were replaced with the already selected lesson content, the canonical gate and repository verification both passed without changing the instructional selections.


`curriculum/pilots/5a-7.5-introduction.json` is the second real-group pilot. It uses the verified 7.5 packet and the Sep. 18 teacher-confirmed 5A advancement after Alex, Finn, and Maya each charted 15/15 on 7.4. The lesson begins the source-ordered 7.5 contraction sequence and does not pull singular/plural possessives forward from subsequent lessons. After one placeholder-like Part 8 wording issue was removed, both real pilots pass the same pinned PR40 instructional/runtime gate.

## Selection and passage history

The continuity contract is `wrs-group-selection-history-v1`. It records only group-level lesson-use history needed for future planning: the dated lesson ID, Substep/focus, explicit completion evidence, previously used Part 3/4/5/8 selections, and Part 9 passage identity/status. It is not curriculum authority and it is not a duplicate student-assessment store.

`scripts/wrs-record-lesson-history.mjs` updates the ledger only from explicit completion evidence. A partial lesson records only Parts actually completed; Part 9 may be recorded as `started` when the passage was begun but not finished. Re-recording the same group/date/lesson replaces the event instead of creating a duplicate.

The Planning Snapshot compiler and one-command refresh now accept an optional persisted group history ledger. When present, they derive `lessonContinuity.passageHistory` and `selectionHistoryRef` from it. The remaining operational task is to choose/wire the durable store used by the live system; repository fixtures must not become the live history database.

## Build fingerprints and targeted regeneration

`lesson:fingerprint` computes a SHA-256 fingerprint from substantive build inputs. It deliberately ignores volatile snapshot/request generation IDs and timestamps while retaining state, packet version/content, planned date, teacher decisions, and selection history.

Use it to decide whether a previously validated lesson may be reused:

- same substantive fingerprint + validated artifact: reuse;
- different fingerprint: regenerate only that group/date;
- changed selection/passage history: regenerate;
- changed packet version/content: regenerate;
- changed current state, unfinished work, focus, trouble spots, or advancement: regenerate;
- merely regenerated snapshot/request IDs with identical substantive content: do not regenerate.

## Planning bundle handoff

The refresh layer now emits one ephemeral `wrs-planning-bundle-v1` object per group. This is the direct handoff to lesson generation. It joins:

- the exact current Planning Snapshot;
- the full verified Substep Source Packet;
- the durable group Selection/Passage History, when present;
- the deterministic Lesson Build Request;
- the current Weekly Queue decision;
- the fresh input fingerprint.

The bundle exists to eliminate source/state reconstruction during lesson generation. A generator should consume the bundle it is given rather than searching old lesson plans or rebuilding current state from memory. Real student bundles are operational output and must not be committed as repository fixtures.

A blocked queue entry produces a blocked bundle with explicit blockers instead of a partial lesson-generation input.

## Weekly queue

The rolling queue contract is `wrs-weekly-build-queue-v1`.

Each queued lesson stores:

- group/date and state `asOf`;
- snapshot, packet, and build-request references;
- entry condition and whether it is met/pending/blocked;
- planned Parts / route;
- exit evidence;
- continue / repeat / advance rule;
- next-lesson dependency;
- current input fingerprint and validated fingerprint;
- runtime/teacher-plan references after successful validation;
- blockers and status.

If reality differs from the queue, regenerate only the affected group. Do not shift the entire week forward automatically. A queue is orchestration state, not student-data authority and not curriculum authority.


The executable queue builder is `scripts/wrs-build-weekly-queue.mjs`. The one-command refresh wrapper is `scripts/wrs-refresh-planning-state.mjs`; it accepts the live/exported Current Snapshot and Daily Notes rows, compiles each group snapshot, and then builds the rolling queue. Missing or unverified source packets block only the affected group entry. The repository code does not pretend to hold Google Drive credentials; the live connector/export step supplies the rows at execution time.

### Validated artifact recording

After a runtime has passed the **final** orchestration gate, `scripts/wrs-record-validated-artifact.mjs` creates the persistence-ready validation record. It refuses to record validation when:

- the planning bundle is blocked;
- the orchestration report is only a preflight rather than a final gate;
- snapshot, packet, request, or contract identity differs between the bundle and final report;
- the bundle fingerprint no longer matches its substantive inputs;
- runtime or teacher-plan artifact references are missing.

A successful record stores the exact fresh fingerprint as both current and validated fingerprint together with runtime/teacher-plan references and the validation timestamp. The resulting object is shaped for the existing callable-only operational-state persistence path.

## Routine weekly execution

The intended normal weekly path is now explicit:

1. Read the live 2026–27 Student Data `Current Snapshot` and the six allowed Daily Notes tabs through the authenticated fixed-scope planning export.
2. Join the durable per-group Selection/Passage History and validated-artifact metadata from operational state.
3. Run `lesson:refresh-sheet-values` against that ephemeral export.
4. The refresh compiles current group snapshots, evaluates the rolling queue, recomputes fresh fingerprints, and writes one `<group>.planning-bundle.json` handoff per group.
5. For queue entries marked `validated`, reuse the referenced validated artifacts.
6. For `needs-build` or `needs-regeneration`, give only that group's planning bundle to lesson generation. Do not re-search old lesson files to reconstruct state or source authority.
7. Run orchestration preflight, the active teacher-plan instructional contract, and runtime compatibility gates before rendering/exporting the lesson.
8. After a generated lesson passes the final orchestration gate, run `lesson:record-validation` and persist its validated-artifact metadata through operational state.
9. After instruction, record explicit completed/started Parts and selection/passage evidence, then persist the updated history for the next refresh.

`awaiting-condition` remains a prepared conditional path, not proof that advancement occurred. `blocked` remains fail-closed.

## Repository contracts added by this workstream

- `schemas/wrs-group-planning-snapshot-v1.schema.json`
- `schemas/wrs-substep-source-packet-v1.schema.json`
- `schemas/wrs-lesson-build-request-v1.schema.json`
- `schemas/wrs-weekly-build-queue-v1.schema.json`
- `schemas/wrs-group-selection-history-v1.schema.json`

The build-request schema intentionally accepts a versioned `wrs-teacher-plan-contract-vN` identifier. The active instructional contract is allowed to evolve without making the orchestration request lie about which contract actually ran.

## Implementation state

Completed in this draft workstream:

1. Versioned state/source/build-request/weekly-queue/selection-history contracts and precedence rules.
2. Verified reusable source packets for 1.6, 2.5, 3.1, 5.2, 5.5, and 7.5.
3. Executable fail-closed preflight/final orchestration gate.
4. Synthetic regression tests with no real student fixtures.
5. Deterministic input fingerprinting for targeted regeneration.
6. Executable rolling weekly queue generator.
7. One-command planning-state refresh from live/exported Current Snapshot + Daily Notes rows, plus a raw Google Sheets `values` adapter that performs the row normalization automatically.
8. Persistent-history recorder/reader logic with duplicate protection and explicit completed/started Part evidence.
9. Conditional real-group 5B 5.5 runtime pilot.
10. Real-group 5A 7.5 Introduction runtime pilot.
11. Dedicated CI plus a pinned cross-branch check against the active PR40 canonical lesson gate.
12. Both real pilots passing the pinned canonical teacher-plan/runtime gate.
13. Deterministic live-record snapshot compiler with authority, conflict, unfinished-work, completed-Part, advancement, and passage-history tests.

Still required before this becomes the routine weekly planner:

1. Wire the authenticated connector call itself into the normal execution path. The repository side now accepts raw Google Sheets `values` output directly, so no manual row normalization remains.
2. Wire the group selection-history ledger and validated build fingerprints to the durable operational store used by the live system.
3. Expand reusable source packets only when a new current/near-term instructional path is not already covered.
4. Run the rolling weekly queue against refreshed live state and feed each unblocked planning bundle directly into generation/reuse for only the affected group artifacts.
5. Record validated fingerprints from exact live snapshot/build-request inputs.

PR #48 remains draft. No merge or production deployment belongs to this workstream until those gates are proven.