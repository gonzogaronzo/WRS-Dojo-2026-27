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

`curriculum/source-packets/5.5.v1.json` is the first reusable verified packet. It resolves against the original Fourth Edition Steps 1-6 Instructor Manual/Step Instruction, Dictation Book, Student Reader Five, and Student Notebook 1-6 Answer Key. It stores stable source IDs and exact page/range locators rather than duplicating long source text.

For Substep 5.5, the verified source locations include:

- Step Instruction: Instructor Manual PDF pp. 338-348 / printed pp. 346-356.
- Dictation Book: 5.5 words on PDF pp. 123-126, phrases on PDF p. 128, and sentences on PDF pp. 137-138.
- Student Reader Five: printed pp. 108-117 word lists, 118-127 sentences, and 128-141 controlled passages.
- Student Notebook 1-6 Answer Key: relevant sound, syllable-exception, prefix, spelling-option, and HFW entries are registered by PDF page in the packet.

## Build flow

1. **Compile state** from Current Snapshot plus newer Daily Notes / teacher reports.
2. **Reject stale state** if a newer teacher report exists than the snapshot `asOf` state used by the build.
3. **Resolve conflicts**. A conflict affecting roster, placement, current target, focus, unfinished work, or advancement blocks the build until resolved.
4. **Resolve the target Substep**. Official placement and review/backfill remain separate fields. Advancement occurs only from explicit teacher authority / recorded completion conditions.
5. **Load the packet** for that exact target Substep and active curriculum release.
6. **Apply selection history** so passage and controlled-item reuse is deliberate rather than accidental.
7. **Generate one complete runtime object** in `wrs-runtime-v1` format.
8. **Run mechanical gates** in this order:
   - runtime structural schema;
   - current-state / packet compatibility gate;
   - active teacher-plan instructional contract;
   - live-runtime compatibility gate.
9. **Fail closed** on any error. Do not render a teacher plan or import JSON from a failed runtime.
10. **Render both outputs from the same runtime object** after all gates pass.
11. **Record results** after instruction so the next snapshot reflects actual Parts completed, unfinished work, student data, passage history, and teacher advancement decisions.

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

## Weekly queue

Each queued lesson stores:

- entry condition;
- planned Parts / route;
- exit evidence;
- continue / repeat / advance decision rule;
- next-lesson dependency.

If reality differs from the queue, regenerate only the affected group. Do not shift the entire week forward automatically.

## Repository contracts added by this workstream

- `schemas/wrs-group-planning-snapshot-v1.schema.json`
- `schemas/wrs-substep-source-packet-v1.schema.json`
- `schemas/wrs-lesson-build-request-v1.schema.json`

The build-request schema intentionally accepts a versioned `wrs-teacher-plan-contract-vN` identifier. The active instructional contract is allowed to evolve without making the orchestration request lie about which contract actually ran.

## Implementation order

1. Lock the schemas and state-precedence rules.
2. Implement snapshot compilation from the live 2026-27 records.
3. Build source packets from Curriculum Release 1.0.1 / its successor, preserving fail-closed fidelity status.
4. Add the executable preflight / build wrapper.
5. Connect the active teacher-plan contract and runtime compatibility gate.
6. Pilot one group end to end.
7. Expand to all current groups and create the rolling weekly queue.
