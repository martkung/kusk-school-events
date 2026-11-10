# Real enrollment

Deploy from the school-events root with `firebase deploy --only functions:school-events --project kusk-register --config firebase.json`. The separate codebase preserves unrelated functions.

Callable `schoolEventEnroll` uses authenticated UID and that account's participant document. A deterministic application ID makes retries idempotent. Firestore transaction writes a pending application and increments reservedCount atomically. Pending applications reserve seats. Approval/rejection/cancellation workflows are not implemented yet; no client write access is granted to applications or catalog.

Catalog documents are provisioned by trusted administrative tooling at schoolEventCatalog/{id}, with published, registrationOpen, name, date, place, description, capacity (positive integer), reservedCount (integer initially 0), optional opensAt/closesAt Firestore timestamps. Never seed fictional demo events as real activities.

`node --test functions/enroll.test.cjs` from root runs 6 business-logic tests. These use a mocked transaction store; production concurrent contention and a full authenticated browser enrollment still need validation with a designated test activity.
