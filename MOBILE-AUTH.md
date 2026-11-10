# Mobile Google sign-in

Desktop keeps Firebase signInWithPopup. Mobile uses Google Identity Services' official button and sends the returned ID credential directly to Firebase signInWithCredential, avoiding the Firebase hosted auth-helper round trip. Credentials are never placed in URLs or saved manually.

Required console setup for the existing OAuth web client ending `ur1kgb240tnhtr7v47ba1jiggci53t57.apps.googleusercontent.com`: add `https://kusk-school-events.racing-genet-6727.chatgpt.site` to Authorized JavaScript origins in Google Auth Platform → Clients. Firebase Authorized domains alone is not sufficient for GIS. No client secret is needed or shipped.

Pending: verify OAuth origin configuration and end-to-end login on the affected phone. The observed missing-initial-state screenshot does not prove a unique root cause; this alternate supported flow removes reliance on that helper state. Do not claim the mobile issue fixed until tested on device.
