# Operational readiness

Implemented: explicit per-event assignments with review/checkin/reports capabilities; transactional decisions and seat release; idempotent check-in; immutable server-written audit records; event-level registration and check-in pause; 50-item staff pages; owner cancellation endpoint. Admin custom claim is required to assign staff; no existing Google user is promoted automatically.

Tests use mock serial transaction stores and validate business behavior; they do not prove Firestore contention/retry behavior or full Rules isolation. Do not call those production concurrency tests.

Remaining release work: approved-pass QR generation/scanning, owner cancellation UI, live event administration, export/audit viewer, full emulator/concurrent browser tests, error alert delivery, automated backup schedule and restore drill, isolated staging project. No backup or monitoring is claimed active. Staff list is a minimal projection containing participant names/status only; raw application documents are owner/admin-only.

Before assigning first admin, user must identify the intended Google account. Preserve existing custom claims when setting admin. Staff cannot self-enroll into roles.

Update 2026-11-06: QR generation/scanning, owner cancellation, event administration and export/audit viewer listed above have since been implemented. PROGRESS.md is the current checklist. Staff table change notifications are described in REALTIME.md. Backup, alert delivery, restore drill, isolated staging and full emulator/concurrent browser tests remain outstanding.
