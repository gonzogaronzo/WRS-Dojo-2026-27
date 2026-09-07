# WRS Dojo Cloud Setup

WRS Dojo keeps its long-term records in Firebase project `wrs-firebase`. Firebase Authentication and Firestore are the live classroom data layer; the assigned 2026–27 Google Sheets are downstream documentation mirrors.

## Authentication and classroom safety

Real classroom use requires a signed-in Firebase teacher. The app uses persistent Google/Firebase Authentication and does **not** fall back to an anonymous or guest teacher when Firebase is slow. If authentication is unavailable or signed out, the app requires sign-in before roster data or lesson-session saves are available.

## One-time Firebase / Google Cloud setup

1. Open the Firebase console and select `wrs-firebase`.
2. Under **Authentication → Sign-in method**, enable **Google**.
3. Under **Authentication → Settings → Authorized domains**, make sure every live app hostname is authorized, including `wrs-firebase.web.app` and any alternate host still in use.
4. In **Firestore Database**, use the production rule set in [`firestore.rules`](./firestore.rules). The deployment workflow publishes these rules automatically.
5. In the Google Cloud project for `wrs-firebase`, enable the **Google Sheets API** (`sheets.googleapis.com`). This is required by the server-side documentation mirror.
6. Grant the Firebase Functions runtime service account `680748133806-compute@developer.gserviceaccount.com` editor access to both assigned spreadsheets:
   - `WRS 2026–27 Student Data Log`
   - `WRS 2026–27 Daily Notes Log`

Do not give the browser direct Google Sheets credentials. The browser writes authenticated records to Firestore; server-side Firebase Functions mirror those records to Sheets.

## What is mirrored to Sheets

- Completed mission/student records → `WRS 2026–27 Student Data Log` → `Data Log`
- Completed lesson summaries → `WRS 2026–27 Daily Notes Log` → `Daily Log`
- Sensei Daily Log entries → `WRS 2026–27 Daily Notes Log` → `Daily Log`
- Group Quick Notes → `WRS 2026–27 Daily Notes Log` → `Daily Log`

The mirror uses stable source identifiers so retries and updates target the same record rather than creating duplicate rows. It writes observed lesson/session data only; it does not invent mastery decisions, scores, or instructional responses.

## Verify the live app

1. Open `https://wrs-firebase.web.app/`.
2. Sign in with **Connect Cloud** if the Firebase session is not already restored.
3. Confirm the header reports an authenticated/online cloud state rather than guest/local mode.
4. Open **Cloud Readiness** and run **Cloud Save Check**. A successful Firestore write/read-back should produce a green confirmation and a current **Last Confirmed Cloud Save** time.
5. After a real lesson, confirm the Mission Complete screen reports **Saved to Cloud** before leaving.
6. Confirm the corresponding real record appears in the assigned Student Data Log and/or Daily Notes Log. Do not create fake student records in the live sheets for testing.

If old browser-only records from the retired guest behavior are detected after sign-in, migrate them only when they represent real 2026–27 classroom data. Do not migrate test records.

## Deployment

Pushes to `independent-hosting` run the production workflow. It verifies the application, builds the standalone Firebase app, deploys Hosting, then deploys the Firestore rules and version-controlled Firebase Functions.

Do not commit Firebase service-account private keys or other server credentials. The browser Firebase configuration is a public project identifier; access control comes from Firebase Authentication and `firestore.rules`.
