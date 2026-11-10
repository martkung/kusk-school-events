# Cutover plan (not deployed)

The candidate rules deliberately block legacy anonymous application and Event Pass reads. Do not deploy until their replacement endpoints are implemented and tested.

| Current operation | Required replacement |
| --- | --- |
| Register reads all registrations for duplicates/seats | Authenticated enrollment endpoint, deterministic duplicate lock and transactional capacity |
| Browser creates registration counter + registration | Trusted transaction; never accept approval or owner UID from client |
| Public Event Pass searches all registrations | Owner-authenticated pass endpoint or expiring random scoped capability; never expose signature/contact fields |
| Browser updates evaluation | Validate questionnaire and allowed state transitions in authenticated endpoint |
| Logged-in user enters admin/check-in | Explicit admin/checkin/reports custom claims, enforced in rules and endpoints |
| Reports read every application | Staff-only filtered queries and pagination |

Before cutover, identify actual staff and set explicit custom claims using a privileged server tool. Do not infer admins from mere existence in Authentication or from email domain. Existing role documents must be reviewed, not trusted automatically, because the current rules allow public edits.

Check-in field allowlist in candidate is a proposed normalized schema and differs from existing writes. Map/update existing check-in fields before deploying. Reports include personal data; assign the reports claim only to authorized staff.

Validation requirements: anonymous denial; owner reads; cross-owner denial; no self-assigned claims; invalid participant rejection; immutable application owner/status; staff scoped access; duplicate submission; concurrent capacity; existing workflow regression. Emulator needs Java and Firebase rules unit test dependencies. None of these live-policy tests have yet passed in this environment.
