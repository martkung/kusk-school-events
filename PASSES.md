# Event pass release

Approved applications show a locally generated QR using bundled qrcode 1.5.4. Payload contains version, event ID and application ID only, no names/contact details or Firebase tokens. This is an application locator, not authorization: schoolEventOperate rechecks assigned staff, event, approved state, check-in pause and duplicate check-in in its transaction.

Owners can save the QR as PNG. The saved image may outlive approval/cancellation; live server status always decides admission. Staff can use a keyboard-wedge QR reader, paste the code/reference, or explicitly start the phone camera. Camera decoding runs locally using bundled ZXing; scanning stops after detection and requires confirmation before the existing check-in endpoint is called. Hidden/removed panels, page navigation and backgrounding stop the active scanner.

Build vendor module: `node tooling/build-qr.cjs` after installing tooling dependencies. License included in dist/vendor.

Tested code parsing, wrong-event rejection, unapproved-pass rejection and local QR matrix generation. Browser canvas rendering, downloaded PNG scanning and two-device live end-to-end check-in still require QA. No applicant records were generated/approved by automated tests.
