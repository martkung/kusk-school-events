# LINE login trial

## Normal login mode — 2026-11-06

Token recovery: LIFF login state can outlive its one-hour ID token. The page checks decoded expiry only as a UI hint, including before each submission; the server still verifies the signed token with LINE. Rejected credentials return a fixed non-sensitive renewal reason. The recovery button explicitly logs out the external-browser LIFF cache before requesting fresh authorization; inside LINE it reopens the fixed LIFF URL. Role denials, provider throttling and outages do not trigger a renewal loop. Never forward or log token/provider response bodies.

The owner tested Google and LINE successfully and authorized normal login. Private config mode=production removes the 20-account trial cap; trial counters are not written in production. Existing Admin UID approvals, LINE identity verification, role separation and Google login remain unchanged. The login UI uses normal service wording and registration/privacy notices. Account linking is collapsed under account management, not presented as a mandatory step.
The existing LIFF endpoint/file and function names are retained for compatibility. The LINE channel's external Developing/Published status must be verified in LINE Developers; a Developing channel still blocks the public even when the website is in normal login mode. The website does not claim that changing its UI publishes the external channel.

Channel 2012417122, LIFF 2012417122-9huGTgkq, school provider ChatBotKUSK.
Keep the LINE channel Developing. Endpoint: https://kusk-school-events.racing-genet-6727.chatgpt.site/line-pilot.html
Full size, openid scope only. No Channel Secret is used. Do not share credentials in chat.

## Applicants

Private schoolEventSystem/linePilot config enables direct LINE signup. A verified channel-specific LINE subject maps to a deterministic Firebase UID. Google, email and phone matching are not required. New accounts receive no staff/admin claims. Trial limit is 20 new identities, enforced transactionally. LINE Developers channel tester restrictions still apply while Developing.
First login routes applicants with incomplete profiles to My Account to enter name and phone. Existing linked Google identities retain their UID/history. New separate accounts are never merged by matching names, email or phone.

## Admin

The user explicitly approved the LINE belonging to existing Admin icontrol.kung@gmail.com. Only that Google UID is included in private lineAdminUids, and the Firebase Auth user must still hold admin:true. Tokens are minted with line_admin:true only when both checks pass. All other LINE tokens have admin:false and line_admin:false.
The live Google Admin did not have an active LINE mapping at configuration time. The owner must use the pilot page's one-time Google confirmation button to prove ownership of the Admin account and the currently open LINE identity. After that, subsequent LINE logins need no Google login. Use Chrome/Safari for this one-time popup.
If the same LINE already created an empty provisional account, fresh proof of both identities may relink it to the existing Google UID. A provisional account with any application history is never merged automatically. Native enrollment reads its reverse link in the enrollment transaction to prevent writes from a stale relinked session.

Server operations recheck current config for LINE Admin work. Firestore and Storage Rules accept only signed server-issued line_admin + line_login + admin + custom-provider claims together. Ordinary LINE/custom sessions remain applicant-only. Existing issued tokens can retain rule-based rights until expiry, as with Google role claims; revoke Firebase sessions for a lost device/urgent revocation. Unlink stops future logins, not already issued Firebase sessions.

## Verification

Synthetic tests cover token validation, direct signup, bounded account creation, UID reuse, explicit Admin approval, role denial, relinking and privacy. Cloud Rules tests cover ordinary LINE denial and approved LINE Admin access. Real LINE consent/mobile login must be tested by the owner.
Root LIFF callbacks initialize the SDK before changing URLs, then navigate only to a fixed same-origin pilot page. ID tokens, LINE subjects and contact details are never logged by application handlers; tokens are not persisted in mappings. No applicant backups or cross-project copies are performed.
