# Event deletion and recovery

Admin: จัดการระบบ > จัดการกิจกรรม > ลบกิจกรรม (also available in event settings). Confirmation identifies the event and reserved seats, explains retained history, and requires typing ลบ. The server requires an explicit DELETE confirmation and the current event name before mutating the selected event.

deleteEvent is Admin-only, including explicitly approved LINE Admin. It atomically sets deleted:true, published:false, registrationOpen:false, checkinOpen:false and server-side deletion actor/time, then creates an audit and event-change signal. Repeated requests are idempotent. No applications, check-in evidence, seat counts, assignments or poster files are removed or copied.

Enrollment rejects deleted events even with stale open/published flags. Other application mutations, event edits, opening registration/checkin, and QR preview/checkin reject deleted events. Reports remain protected by existing roles and retain historical records. My Activities keeps application history but disables QR/cancellation for events absent from the public catalog; an open pass closes when its event is removed. Downloaded QR images remain historical copies; server validation blocks their use while the event is deleted.

Admin: จัดการระบบ > ถังขยะกิจกรรม > กู้คืนกิจกรรม. Restore uses the same event ID, preserves seat counts and all references, republishes the event, and keeps registration/checkin closed until Admin explicitly opens them. Repeat restore never reopens an already active event. Event deletion and restore are audited. There is no permanent purge in this release.

The trash workspace is global and works even if no active events remain. It watches the Admin catalog, while public pages continue to query published events only. No Firestore/Storage access rules are broadened. Admin can read archived event documents under existing Admin rules; applicants retain access only to their own applications.

Tests cover authority, typed confirmation, stale event names, idempotent/concurrent requests, retained check-in evidence, blocked enrollment/checkin, closed restore, live UI disposal and unavailable QR/history. Tests use synthetic fixtures; no real event is deleted during verification.

Permanent purge: Admin selects ลบถาวร in the global trash, reviews counts, types the exact event name and acknowledges irreversibility. Server purges only the selected event applications (including descendants), audit, staff assignments, signal, catalog descendants and schoolEventPosters/eventId files, in resumable leased stages. It locks restore/edit/uploads once started. Shared Auth identities, profiles, other events and banners are retained. A minimal private tombstone keeps actor/time/counts and prevents ID reuse; no applicant contact is copied. Existing managed backup and object retention expire under their existing policies. No production event was purged in verification.

Signature evidence is private under schoolEventSignatures/eventId. Permanent purge waits for active signature uploads, includes signature images in file counts/removal, and removes upload descendants. Soft trash preserves evidence.
