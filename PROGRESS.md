# Development status — 2026-11-06

Implemented: Google self-registration/profile, school event catalog/posters/dialogs, owned applications and QR passes; server-enforced event roles/capacity/duplicates; event editing; application search/status filters, bulk approval, contact editing and audit; Admin-only trash/restore; verified-email staff assignment; mobile check-in preview/confirmation/next-person flow; reports with date/status/check-in filters and CSV.

Live updates cover applicant application status, staff table notifications, published home/catalog listings and Admin overview/counters. Current schedule/name/place are displayed on applicant cards and open passes while original application snapshots remain stored. Forms retain typed fields during catalog updates. Latest-load generation guards reject delayed event responses. Partial-create retries save changed event fields before retrying the poster.

Security review fixes: legacy Storage paths are Admin-only; server Firebase dependencies are updated, including a tested Node-22-compatible rimraf override; npm audit reports zero vulnerabilities for server dependencies. DOM regression tests cover catalog redraw and form preservation. See REALTIME.md for scope/verification limits.

Firestore native daily backups retain 7 days. The weekly schedule was removed after the user selected the economical policy; pre-existing backups are left to expire normally. Bucket exports are reserved for significant system changes/event completion, with proposed Standard storage and 14-day export lifecycle. No export/restore drill has run (BACKUP.md).

Operational monitoring is now configured: sanitized unexpected-error logging, a same-project incident policy for application failures/HTTP 5xx, and an Admin connection check. No external notification channels are attached (MONITORING.md).

Outstanding: isolated staging; physical mobile/multiple-device regression tests; local Rules emulator tests (Java unavailable); school privacy/retention policy and final content. Backup export/restore and LINE embedded-browser guidance are deferred by the user. External notification delivery needs an explicitly requested destination.
# LINE pilot — 2026-11-06

- Event deletion release: Admin may move activities to a recoverable trash with explicit confirmation. Atomic closure/public removal, preserved applications/seat counts/check-in evidence, blocked stale writes and QR use, same-ID restore with registration/checkin closed, and separate global trash workspace. See EVENT-TRASH.md. Automated suite: 158 passing; no real event deleted in verification.

- Publicity release: homepage live banner carousel plus global Admin ประชาสัมพันธ์ tab, image/mobile upload, safe links, ordering, visibility and version-protected deletion/editing. 20-record cap, Admin-only server writes/storage uploads, private drafts, transactional audit. Two editable school-service starter banners; see BANNERS.md. Automated suite: 148 passing; Cloud Rules synthetic banner checks passed.

- Normal login release authorized after owner testing: polished Google/LINE account pages, registration/privacy notices, no trial wording, optional linking controls collapsed, production server mode removes 20-account cap without changing Admin approval. LINE Developers channel publication remains an external setting to verify.

- Superseding pilot mode: direct LINE applicants need no Google (20 new-account trial cap). Explicitly approved existing Google Admin UID can receive LINE Admin sessions only after proving both accounts. Live mapping for the named Admin was missing, so one-time confirmation remains for the owner. No roles are inferred from name/email/phone. Full details: LINE-PILOT.md.

- Follow-up: signed-out account page now includes a LINE sign-in entry without first logging into Google. Existing link/allowlist enforcement remains server-side. Root LIFF primary callbacks initialize the SDK before fixed same-origin navigation, and successful LINE sign-in returns to the pending event when present.

- Added LIFF 2012417122-9huGTgkq, explicit fresh-Google linking and same-UID applicant login. No duplicate accounts, email matching, Channel Secret or applicant backups.
- Pilot uses a private explicit UID allowlist; first tester is icontrol.kung@gmail.com. Channel remains Developing in LINE Console.
- LINE/custom sessions cannot obtain staff/admin privileges through operations, Firestore, Storage or UI, even when Google identity has Admin claims.
- Added synthetic LINE verification, mapping and privilege tests plus Cloud Rules evaluations. Physical LINE consent and mobile login still require the owner to test.
- LINE Console endpoint must be changed to /line-pilot.html after publication; main Google login remains available.


2026-11-06: Added scoped resumable permanent event purge with typed confirmation, lease, private tombstone, upload lock and deletion of nested event documents. Synthetic tests only; production data not purged.

2026-11-06: Short KUSKevent references: atomic unique reservations, protected same-event checkin lookup, legacy QR preserved, UI/report display and idempotent existing-application backfill. Synthetic suite 171 passed; Cloud Rules 18 cases passed.

Existing application backfill completed: 3 updated, 0 skipped. Applicant fields and QR retained; registry lookup verified on idempotent rerun.

2026-11-06: Optional checkin signature capture/view with mobile pointer pad, acknowledgment, private PNG storage, immutable evidence metadata, upload lease and purge integration. Tests: 183 passed plus 25 Cloud Storage Rules synthetic checks. No real attendee signature or checkin created during verification.

2026-11-07: Added private signature column in reports and A4 print/PDF preview using current filters. Includes immutable hash matching, bounded concurrency, all-or-error print gating, repeat permission/data checks, 200-row document limit and DOM cleanup. Full synthetic suite 191 passed; local browser preview connection unavailable; no real evidence exported.
