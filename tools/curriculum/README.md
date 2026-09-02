# WRS Curriculum → Dojo integration

This directory is the first bridge between **WRS Curriculum Release 1.0.1** and the existing WRS Dojo runtime.

## Current safe path

`compile_lesson.py` reads the release SQLite database **server/admin-side**, validates the release ID and fail-closed policy, checks the 10-Part coverage gate, retrieves the validated lesson fixture, verifies required Reader selections against registered source chunks, hydrates controlled material, and emits a `wrs-runtime-v1` lesson that the current Dojo compatibility adapter can run.

Release 1.0.1 currently exposes **Substep 8.2** as the validated golden automatic-generation fixture. The compiler therefore stops for other Substeps instead of synthesizing Wilson content.

Example:

```bash
python3 tools/curriculum/compile_lesson.py \
  --database /path/to/WRS_Curriculum_Release_1.0.1.sqlite \
  --substep 8.2 \
  --output /tmp/lesson-8.2.json
```

## Architectural boundary

- **Curriculum SQLite / source corpus:** read-only curriculum and provenance authority. It contains no student data.
- **Firestore:** group/student instructional state, history, errors, mastery evidence, teacher notes, and saved lesson instances.
- **Compiler:** joins approved curriculum selections with instructional context and emits the canonical 10-Part lesson record.
- **Dojo browser app:** renders/runs the returned lesson and writes instructional results back to Firestore.

The full SQLite/source corpus should **not** be shipped to the browser. The production end state should wrap this compiler behind an authenticated, versioned server-side endpoint (Cloud Run or equivalent), then have Dojo request a lesson for a group/substep/focus and save the returned release ID + source provenance with the lesson instance.

## Fidelity rules

1. Keep all 10 WRS Parts in every generated runtime object. Daily path controls execution, not record shape.
2. Follow the Project source-priority hierarchy.
3. Part 4 practice and charting history remain separate.
4. Part 8 uses registered source-controlled items only.
5. Part 9 uses registered controlled text and passage history.
6. Part 10 remains teacher-selected when the release says teacher selection is required.
7. Advancement is recommendation-only and always requires teacher approval.
8. If coverage/provenance is not sufficient, **fail closed**. Do not fill the hole with generated Wilson-like content.

## Deployment status

This integration branch is a pilot only. It does not change Firestore rules, student records, presenter transport, Firebase configuration, or the deployed WRS Dojo site.
