# Shared Firebase integration

Project: `kusk-register` (existing Firebase project).

The prototype stays in demo mode. `dist/firebase-client.js` is a separate, lazy-loaded adapter and is not loaded by the demo UI. Demo accounts and registrations must never be migrated automatically to real accounts.

New paths only:
- `schoolEventAccounts/{authUid}/participants/{id}`: owned participants.
- `schoolEventApplications/{id}`: applications with immutable ownerUid, written through trusted server logic.

Before activating real sign-in:
1. Retrieve and back up the currently deployed Firestore and Storage rules.
2. Audit broad wildcard rules: Firestore grants access if ANY matching allow permits it.
3. Merge the fragment into the complete live rules; test cross-user isolation and legacy compatibility in the emulator. This file is deliberately not deployable alone.
4. Enable Google in Firebase Authentication and authorize the actual web domain. Confirm existing admin guards no longer accept every authenticated applicant.
5. Implement trusted enrollment, capacity policy, duplicate keys and staff authorization before enabling applications.
6. Wire the account UI to onAuthStateChanged; separate real state from browser-local demo state. Do not store participant data or ID tokens manually in localStorage.

No live rules, existing collections, provider settings or production data have been changed by preparing these files.
