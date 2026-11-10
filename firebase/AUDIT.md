# Live security audit — 2026-11-05

Read-only retrieval of deployed `cloud.firestore` release succeeded using the existing Firebase CLI login. Exact snapshot: `audit/firestore.rules` (or the server-provided source basename in that directory).

Critical finding: recursive wildcard `allow read, write: if true` permits unauthenticated reads and writes to every document, including all proposed new collections. Adding restrictive matches does not override this permissive rule.

Real applicant authentication/data UI remains disabled. Prepared `account-auth.js` defaults to disabled and is not loaded by the demo page. Do not pass securityReady=true until live policies and legacy authorization have been corrected and tested. The Firebase adapter alone is not access control.

Legacy admin shell also defaults to authenticated compatibility access. Both backend permissions and frontend roles require correction. Changing live rules immediately without mapping legacy anonymous registration/Event Pass flows could interrupt current operations.

Required before activation:
1. Inventory current staff roles and anonymous legacy reads/writes.
2. Define explicit staff claims and protect role documents from self-editing.
3. Implement restricted public submission/pass lookup where legacy flows currently read full collections.
4. Test complete replacement rules against staff, applicant, anonymous, cross-account and legacy workflows.
5. Deploy tested rules and strict legacy role checks together, then enable real accounts.

No production records, permissions or provider configuration were changed during this audit.
