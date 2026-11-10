# Reports and audit — 2026-11-06

Reports use a dedicated event-scoped callable requiring Admin or the event reports permission, rechecked after each query. All 50-record pages load before totals/export are enabled. Filters cover Bangkok application-date bounds, status and check-in. Missing historical dates are labeled unknown and excluded only when date bounds are selected. Preview shows 50 matching rows per page; CSV includes all matching rows, dates/times, references, names and statuses. Phone/email/signatures are excluded; spreadsheet formula prefixes are neutralized. Permissions are refreshed before download.

Multi-page results are not a consistent point-in-time snapshot under concurrent changes. The interface states load time and provides an update button; report totals are not realtime. Partial/failed loads cannot be exported; event/account changes discard late results.

Audit is Admin-only, filtered by event, paginated by document ID and time-sorted within each batch (not globally latest-first). It includes contact changes before/after and trash/restore actions. Operations before auditing cannot be reconstructed.

Automated backup, external alerts, restore drill and isolated staging remain outstanding.
