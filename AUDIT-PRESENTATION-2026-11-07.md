# Pre-presentation stability review — 2026-11-07

Reviewed the active `school-events` browser flows, enrollment/operations/signature/report/purge Functions, and existing rule boundaries. The dormant parent application is outside this publication.

## Fixed

1. The enrollment form now prevents native submission immediately while profile loading is pending. Pressing Enter cannot issue a default GET containing typed contact fields. Detached forms and repeated submissions are ignored.
2. Saving a first-time LINE profile now resumes the pending activity, instead of leaving the user on the account screen.
3. Creating an event now guards simultaneous submissions and stops the next upload/navigation step if the form was removed while the request was pending.

## Checks

- 208 automated tests passed, including the new loading/submission and pending-event continuation cases.
- Syntax and local-import checks passed across 104 source/script files.
- Production dependency audits: zero known vulnerabilities reported for Functions and QR/scanner tooling at review time.
- Read-only live verification: Firestore source matches the tested candidate; anonymous reads of protected applicant/admin/account collections are denied.
- The existing home-grid regression test and actual QR bitmap decoding tests still pass.
- Each of the 10 generated images was visually inspected before JPEG encoding. Posters retain 3:4 proportions and banners retain their panoramic proportions without cropping.
- Fixture creation is limited to 5 new catalog entries, 5 new banner entries, their 10 public images, setup audit entries, and the banner-count increment. Existing data and roles are preserved.

## Limits

This is not a guarantee that all defects are absent. Physical mobile-camera scanning, Google/LINE interactions on a real phone, paper print output, and sustained concurrent production load were not re-tested in this round. No existing applicant was modified or deleted for testing; no signature or attendance record was fabricated.
