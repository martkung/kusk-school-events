# Firestore release — 2026-11-05

User explicitly accepted the candidate policy and interruption of inactive legacy workflows. Firebase CLI compiled and released `firestore.candidate.rules` successfully.

`verify-live.cjs` confirmed exact deployed source equality and HTTP 403 for unauthenticated list requests against registrations, schoolEventApplications, admins and a participant path. No production records were changed by verification.

These checks do not replace emulator coverage: Java remains unavailable, so owner/cross-owner and staff behavior unit tests have not run. Google OAuth still requires interactive end-to-end testing with the user.

Real account screen enabled: Google sign-in/out plus owned participant creation/list. Demo enrollment remains separate. Live enrollment, live passes, staff claims assignment and Storage Rules audit remain outstanding.

This supersedes the pre-deployment status in AUDIT.md and MIGRATION.md. Legacy anonymous registration/pass workflows are intentionally blocked; don't reopen them by restoring public wildcard access.
