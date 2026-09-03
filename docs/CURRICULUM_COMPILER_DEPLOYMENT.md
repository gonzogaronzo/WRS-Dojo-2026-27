# WRS Curriculum Compiler Deployment Checklist

This checklist rolls out the Release 1.0.1 compiler **without changing any current student/group Substep**.

## Current pilot boundary

- Branch: `curriculum-release-1-0-1-integration-v2`
- Draft PR: #13
- Curriculum release: `WRS-CURRICULUM-1.0.1-2026-09-02`
- Automatic generation enabled: **Substep 8.2 only**
- Current real group Substeps must remain unchanged during the pilot.

## 1. Work only from the home Mac

The school Windows laptop + ClearTouch remain browser-only classroom devices. Do all development, Cloud Run, gcloud, Git, npm, and Firebase deployment work from the home Mac.

## 2. Get the integration branch

```bash
cd /path/to/WRS-Dojo-2026-27
git fetch origin
git switch curriculum-release-1-0-1-integration-v2
git pull --ff-only origin curriculum-release-1-0-1-integration-v2
```

Confirm:

```bash
git status --short
git rev-parse HEAD
```

`git status --short` should be empty.

## 3. Locate the Release 1.0.1 SQLite file

Extract `WRS_Curriculum_Release_1.0.1_2026-09-02.zip` somewhere outside the Git repository.

The file needed by the service is:

```text
WRS_Curriculum_Release_1.0.1/database/WRS_Curriculum_Release_1.0.1.sqlite
```

Do **not** copy the SQLite file into the Git repository.

## 4. Make sure Google Cloud CLI is available

Check:

```bash
gcloud --version
```

If it is not installed, install Google Cloud CLI on the home Mac, then authenticate:

```bash
gcloud auth login
gcloud config set project wrs-firebase
```

The deployment account must be able to enable APIs, create a private Storage bucket/service account, build a container, and deploy Cloud Run in project `wrs-firebase`.

## 5. Deploy the private curriculum service

From the repository root:

```bash
bash scripts/deploy-curriculum-compiler.sh "/ABSOLUTE/PATH/TO/WRS_Curriculum_Release_1.0.1.sqlite"
```

The script will:

1. use Google Cloud project `wrs-firebase` by default;
2. enable Cloud Run, Cloud Build, Artifact Registry, and Storage APIs;
3. create a private bucket named `wrs-firebase-wrs-curriculum-private` if needed;
4. upload only the SQLite database to `gs://wrs-firebase-wrs-curriculum-private/releases/1.0.1/`;
5. create the `wrs-curriculum-compiler` service account if needed;
6. grant that service account read-only access to the private curriculum bucket;
7. deploy `curriculum-compiler/` to Cloud Run;
8. configure the expected release ID and allowed Dojo origin;
9. print the Cloud Run service URL.

The Cloud Run network endpoint is intentionally reachable for browser CORS/preflight. The lesson endpoint itself still requires and verifies the signed-in teacher's Firebase ID token.

## 6. Verify the service health endpoint

Use the URL printed by the deploy script:

```bash
curl https://YOUR-CLOUD-RUN-URL/healthz
```

Expected shape:

```json
{
  "ok": true,
  "releaseId": "WRS-CURRICULUM-1.0.1-2026-09-02",
  "supportedSubsteps": ["8.2"]
}
```

Stop if the release ID differs or the request fails.

## 7. Configure the Dojo branch to call the compiler

```bash
bash scripts/configure-curriculum-compiler-url.sh https://YOUR-CLOUD-RUN-URL
```

This creates local `.env.local` with:

```text
VITE_WRS_COMPILER_URL=https://YOUR-CLOUD-RUN-URL
```

`.env.local` is ignored by Git and must not be committed.

## 8. Run Dojo locally before touching live Firebase Hosting

```bash
npm install
npm run test
npm run dev:standalone
```

Open the local URL printed by Vite and sign in with the normal teacher account.

## 9. Create a disposable 8.2 compiler test group

Do **not** change Group 2, 3A, 3B, 4A, 5A, or 5B.

Create a temporary group named something unmistakable, for example:

```text
COMPILER TEST 8.2 — DELETE ME
```

Do not add real students.

In its Instructional Profile:

- Current Substep: `8.2`
- Lesson Focus: `Introduction`
- Trouble Spots: optional test text only
- Concepts to Weave: optional test text only

Save the profile once. The **Generate Lesson** control should become available.

## 10. Generate and inspect the lesson

Click **Generate Lesson**.

Expected behavior:

1. Dojo saves the Instructional Profile first.
2. The signed-in browser sends the profile to Cloud Run with the Firebase ID token.
3. The compiler verifies Release 1.0.1 and its fail-closed 8.2 coverage/provenance gates.
4. Dojo opens the returned lesson in the existing lesson editor. It does **not** immediately run or silently save the lesson.

Verify before saving:

- exactly Parts 1–10 are present;
- lesson focus is Introduction;
- current HFWs are `superior, vary, varies, variety, vocabulary, area, garage`;
- Part 4 has 6 practice words and a separate 15-word charting list;
- Part 5 contains the controlled Reader 8 sentence set;
- Part 8 has a sound, word element, real words, phrase, and sentences;
- Part 9 is `Backyard Visitor` from Reader 8 pp. 58–59;
- Part 10 remains teacher-selected rather than containing fabricated text;
- source metadata identifies Release 1.0.1 / the registered WRS sources.

## 11. Prove persistence

In the disposable test group:

1. save the generated lesson;
2. return to the group dashboard;
3. fully reload the browser page;
4. reopen the group;
5. confirm the generated lesson still exists;
6. reopen it and confirm its controlled content is intact;
7. launch it and confirm the existing lesson runner accepts it.

Do not enter real student scores or attendance in the disposable pilot.

## 12. Stop and report the result before live cutover

If all of the above passes, report the Cloud Run URL and the result of the local test in the project thread. At that point the safe next actions are:

1. merge PR #13 into `independent-hosting`;
2. pull the merged branch on the home Mac;
3. preserve/recreate `.env.local` with the compiler URL;
4. run the full test/build suite again;
5. deploy Firebase Hosting with the existing guarded `npm run deploy:standalone` command;
6. run a signed-in live-browser smoke test;
7. later validate teacher/student presenter behavior on the actual school Windows laptop + ClearTouch.

Do not enable automatic generation for 1.6, 3.1, 4.1, 5.3, or 7.3 merely because 8.2 works. Each current Substep must first receive equivalent source/provenance validation and history-aware selection logic.
