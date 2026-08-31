# WRS Dojo Cloud Setup

WRS Dojo keeps its long-term records in Firebase project `wrs-firebase`. The app itself can move to another host later without moving the database immediately.

## One-time Firebase Console setup

1. Open the [Firebase console](https://console.firebase.google.com/) and select `wrs-firebase`.
2. Go to **Authentication → Sign-in method** and enable **Google**.
3. Go to **Authentication → Settings → Authorized domains** and add:

   ```text
   ashers-site.gonzogaronzo.chatgpt.site
   ```

4. Go to **Firestore Database** and create the database if it does not exist. Choose the production/locked mode; do not use an open test-mode rule set.
5. Open **Firestore Database → Rules**, replace the editor contents with [`firestore.rules`](./firestore.rules), and click **Publish**.

The rules isolate students, groups, group notes, missions, daily notes, unfinished lessons, and save-check records by the signed-in Firebase user ID.

## Verify the live app

1. Open <https://ashers-site.gonzogaronzo.chatgpt.site/>.
2. Click **Connect Cloud** and finish Google sign-in.
3. If the green Guest Mode migration banner appears, click **Migrate to Cloud**. The migration includes the roster, groups, exact word-by-word mission results, teaching notes, and any unfinished lesson. The browser copy is removed only after all uploads succeed.
4. In **Roster → Active Groups**, click **Activate 2026–27 Roster** once. Existing records are archived rather than deleted.
5. Click the globe icon in the app header to open **Cloud Readiness**.
6. Click **Run Cloud Save Check**. A successful write and read-back produces a green confirmation and a **Last Confirmed Cloud Save** time.
7. Save one Quick Note and complete a short test mission. Confirm that both still appear after a reload.

## Hosting somewhere else later

The Firebase web configuration is in `legacy/firebase.ts`. When moving to a different domain, add that hostname to **Authentication → Settings → Authorized domains**. The same Firestore data can continue serving the app from the new host.

For command-line rule deployment after connecting the Firebase CLI:

```bash
firebase deploy --only firestore:rules --project wrs-firebase
```

Do not commit Firebase service-account private keys or other server credentials. The browser Firebase configuration is a public project identifier; access control comes from Authentication and `firestore.rules`.
