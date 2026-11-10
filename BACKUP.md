# Backup and recovery — 2026-11-06

## Configured
Firestore native scheduled backups for `kusk-register/(default)`:
- Daily, retained 7 days.
- No weekly schedule. Removed on 2026-11-06 after the user selected the economical daily-only policy. Existing historical backups, if any, are left to expire under their original retention.

These are Firestore database backups. They do not claim to back up Firebase Auth users, Storage objects or site source. The first scheduled backup is created asynchronously by Google; schedule creation is not a restore test.

## Pending explicit destination approval

Status update 2026-11-06: the user explicitly deferred creating additional personal-data copies. The export/restore drill must remain unexecuted until the user gives a new instruction approving it. The native schedules configured earlier remain as previously disclosed; no new copies are created by the monitoring work.
Automatic approval review rejected executing the proposed managed export/restore drill because applicant personal data would be copied into a new destination without destination-specific approval. No export, backup bucket or restore-test database was created by that rejected command. Do not rerun `firebase/backup-maintenance.cjs` without the required approval.

Prepared optional workflow: private bucket `gs://kusk-register-school-events-backups`, Standard storage in the database region, public access prevention and a 14-day export-file lifecycle. Exports are reserved for a significant system change or event completion, not a daily duplicate. No export has been executed. Native schedules do not store their backups in this bucket.

Default execution and `--schedule-only` only reconcile the daily-seven-day policy. `--export` explicitly requests the prepared one-off export without creating a restore-test database; `--export-restore` additionally requests the isolated restore drill. These record-copy actions must not be run merely to update configuration. Export/drill state is resumable; a later independent export needs a separately reviewed fresh run state so an old completed export is not mistaken for a current one.

An eventual approved drill imports into a uniquely-created `school-restore-check-<random>` database after verifying anonymous access is denied, checks restored collection counts, then removes only that scratch database. Production `(default)` is never an import destination. Export/import creates an additional personal-data copy and usage charges. It remains unexecuted.

The operational script keeps non-secret run state in ignored `firebase/audit/backup-maintenance.json`. It is an administrative recovery tool, not a scheduled application function. Its restore drill is NOT yet executed or verified. Counts-only validation does not prove every historical document matches; a complete recovery exercise also needs record sampling and an isolated application smoke test.
