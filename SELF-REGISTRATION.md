# Self-registration rollout — Firebase deployed 2026-11-05

Applicant UI no longer lists/creates family participants. Account shows an editable own display name and Google email. Enrollment offers the saved name (or Google display name) for confirmation, then submits directly.

Server uses authenticated UID + event + self-v1 for a deterministic application ID. It checks any existing owner/event application, including legacy child records, before creating a new record. Existing records, names, QR references and seat counts are not migrated or deleted. One-account-per-event currently includes cancelled/rejected registrations: retries return the existing record, not a new application.

New owner-only profile collection schoolEventProfiles stores displayName and updatedAt. Client cannot set role or approval in a profile. Submitted names are copied into new applications; changing the profile never changes historical passes.

User explicitly approved production rollout. 14 mocked business-logic tests and 2 enrollment-resume tests pass. Firebase compiled/released the rules and successfully updated schoolEventEnroll; deployed rule source and anonymous-read denial were verified. Firestore owner isolation emulator tests and live concurrent enrollment remain unverified. Old enrollment pages should be refreshed because the request changes from participantId to displayName. An unrelated build-artifact cleanup policy warning remains.

QR review fixes (stale scanned code, name preview, mobile keyboard focus and next-scan workflow) remain outstanding and are not included in this change.
