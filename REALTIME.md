# Realtime change 1: applicant activities

My activities now uses ownerUid-filtered Firestore onSnapshot instead of getDocs. Account changes and page navigation unsubscribe previous listeners, and late callbacks after cleanup are suppressed. Cache metadata is labeled as potentially stale. Approval, rejection, cancellation and check-in update the list; approved open passes update their check-in status and close if the application is no longer approved.

No database rules or server functions changed. Other screens (home catalog, staff list, counts, reports and audit) remain unchanged in this focused release. Client lifecycle tests use a mocked Firestore SDK; cross-device live behavior still needs user validation.

## Change 2: staff application table (2026-11-06)

Enrollment and audited operations publish a timestamp-only `schoolEventSignals/{eventId}` notification in the same transaction. Rules permit reads only to Admin or active staff assigned to that event; clients cannot write it. No applicant identities/contact information are exposed.

The table listens to this one document and reloads only the number of 50-record pages already loaded through the existing authorized callable. Bursts are coalesced. Search/status filters and eligible selections are preserved. Updates wait during modals/bulk work, hidden tabs or offline states. Event/account/page changes dispose listeners; permission-denied clears the table. Cached data is labeled potentially stale.

The indicator describes this table only. Reports remain explicit timestamped loads. Public catalog, event counters, staff directory and audit are not made realtime by this change. Unit tests use mocked SDK/timers. Added Rules emulator tests require Java, unavailable here; cross-device browser validation remains required.

## Change 3: live catalog and current schedules (2026-11-06)

Home and public events now subscribe to the published catalog. Applicant cards/pass details combine current catalog name/date/place with immutable stored application identity; registration-time event dates remain stored for history. Open passes update their schedule and show a changed-schedule notice. Catalog redraws wait while registration forms or detail dialogs are open, and submission rechecks the most recently received availability without clearing typed fields.

Admin overview and displayed seat/open-state counters subscribe to published catalog changes without rebuilding event/staff editors. Event-load generation tokens reject late A-B-A results. Reports remain explicit timestamped loads. Legacy catalog documents are not copied into the public catalog.
