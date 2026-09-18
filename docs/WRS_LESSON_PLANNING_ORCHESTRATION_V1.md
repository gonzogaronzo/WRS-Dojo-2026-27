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

### First verified packet

`curriculum/source-packets/5.5.v1.json` is the first reusable verified packet. Packet v1.0.4 resolves against the original Fourth Edition Steps 1-6 Instructor Manual/Step Instruction, Dictation Book, Student Reader Five, and Student Notebook 1-6 Answer Key. It stores stable source IDs and exact page/range locators rather than duplicating long source text.

For Substep 5.5, the verified source locations include:

- Step Instruction: Instructor Manual PDF pp. 338-348 / printed pp. 346-356.
- Dictation Book: 5.5 words on PDF pp. 123-126, phrases on PDF p. 128, and sentences on PDF pp. 137-138.
- Student Reader Five: printed pp. 108-117 word lists, 118-127 sentences, and 128-141 controlled passages.
- Student Reader Five Substep 5.2N, printed p. 31 / PDF p. 33: verified prior-Substep Wilson nonsense-word pool, eligible only as cumulative review when Part 8 requires nonsense words. It must never be labeled as current 5.5 nonsense material.
- Student Notebook 1-6 Answer Key: relevant sound, syllable-exception, prefix, spelling-option, and HFW entries are registered by PDF page in the packet.

The packet was manually reconciled against the original PDFs before being marked `verified`. Searchable companions remain retrieval aids only.

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

## Build fingerprints and targeted regeneration

`lesson:fingerprint` computes a SHA-256 fingerprint from substantive build inputs. It deliberately ignores volatile snapshot/request generation IDs and timestamps while retaining state, packet version/content, planned date, teacher decisions, and selection history.

Use it to decide whether a previously validated lesson may be reused:

- same substantive fingerprint + validated artifact: reuse;
- different fingerprint: regenerate only that group/date;
- changed selection/passage history: regenerate;
- changed packet version/content: regenerate;
- changed current state, unfinished work, focus, trouble spots, or advancement: regenerate;
- merely regenerated snapshot/request IDs with identical substantive content: do not regenerate.

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

## Repository contracts added by this workstream

- `schemas/wrs-group-planning-snapshot-v1.schema.json`
- `schemas/wrs-substep-source-packet-v1.schema.json`
- `schemas/wrs-lesson-build-request-v1.schema.json`
- `schemas/wrs-weekly-build-queue-v1.schema.json`

The build-request schema intentionally accepts a versioned `wrs-teacher-plan-contract-vN` identifier. The active instructional contract is allowed to evolve without making the orchestration request lie about which contract actually ran.

## Implementation state

Completed in this draft workstream:

1. Versioned state/source/build-request contracts and precedence rules.
2. First verified reusable 5.5 source packet.
3. Executable fail-closed preflight/final orchestration gate.
4. Synthetic regression tests with no real student fixtures.
5. Deterministic input fingerprinting for targeted regeneration.
6. Rolling weekly queue contract.
7. Conditional real-group 5B 5.5 runtime pilot.
8. Dedicated CI plus a pinned cross-branch check against the active PR40 canonical lesson gate.
9. Real 5B conditional 5.5 pilot passing the pinned canonical teacher-plan/runtime gate.
10. Deterministic live-record snapshot compiler for Current Snapshot + Daily Notes row exports, with synthetic authority/conflict tests.

Still required before this becomes the routine weekly planner:

1. Wire the live Sheets/connector export step to feed the snapshot compiler automatically at build time.
2. Persist selection/passage history and validated build fingerprints in the appropriate operational store.
3. Expand reusable source packets across current instructional paths.
4. Generate the rolling weekly queue from live group state and regenerate only entries whose fingerprints or entry conditions changed.
5. Record a validated fingerprint for the real 5B pilot once its exact live snapshot/build-request inputs are produced by the new feed path.

PR #48 remains draft. No merge or production deployment belongs to this workstream until those gates are proven.