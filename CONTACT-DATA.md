# Applicant contact information

Profile: owner-only schoolEventProfiles/{uid} now requires displayName, normalized Thai phone and updatedAt when saved. Existing profiles without a phone remain readable and prompt for the missing phone on the next application/profile save. No automated migration of old applications occurs.

New applications snapshot participantName, phone and the Google email from the authenticated server token. Future profile edits never update past applications. Existing duplicate applications return their original records without adding contact information or reserving another seat.

Contact lookup uses the existing operation endpoint with event-level review permission (or admin). Check-in-only/report-only staff cannot retrieve contacts. Staff list, CSV export and QR payloads do not include phone/email. No OTP added; phone format validation is not proof of ownership.

19 business/validation tests passed with mocked database transactions. Full end-to-end contact saving and mobile keyboard behavior still require user QA. Phone validation currently supports Thai 9/10-digit numbers and +66/0066 normalization.
