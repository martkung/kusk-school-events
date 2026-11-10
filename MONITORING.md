# Operational monitoring — 2026-11-06

Cloud Logging metric `school_event_system_failures` counts only ERROR entries with the application-specific tag and fixed message. An enabled same-project Cloud Monitoring policy detects either an unexpected application failure or HTTP 5xx responses from the two deployed school-event services. No notification channels are attached: incidents are visible in Google Cloud, and no email/LINE/webhook is sent.

The callable wrapper treats normal authentication, permission, validation, full-capacity and application-state errors as expected outcomes. Unexpected failures log only fixed operation/action identifiers and a normalized system-error code. Raw request/auth payloads, names, emails, phone numbers, QR codes, exception messages/details/stacks are not supplied to application error logging. The caller receives a generic retry message. Infrastructure/audit logs remain governed by Google Cloud settings.

Admin has a manual connection check: an authenticated Admin-only callable reads one non-personal health document path without creating data, returning success/time. This checks the callable and Firestore reachability, not every business workflow or the Google identity provider. Google Cloud access still requires that account's existing cloud permissions.

Verification includes successful privacy/error-classification unit tests, configuration readback, real unauthenticated-call rejection and deployment checks. No artificial server failure was injected into production; end-to-end incident firing and delivery are not claimed tested. Metric/incident propagation is asynchronous. External notification delivery remains unconfigured until a destination is explicitly requested.

Backup export/restore remains deferred at the user's request; monitoring does not export applicant records or read their names.
