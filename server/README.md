# Trusted admin verification service

This service uses Firebase Admin SDK **server-side only** to verify ID tokens and check the `admin: true` custom claim. The React client uses Firebase REST APIs and does not install the Firebase JS SDK.

## Local setup

1. In Firebase Console, use the same Firebase project as `chinmay-store`.
2. Enable Email/Password under Authentication providers.
3. Create a service account credential for local development, save it as `server/service-account.json`, and never commit it. Alternatively configure Application Default Credentials.
4. Copy `.env.example` to `.env`. Set `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json` (relative to the server working directory) and `CLIENT_ORIGIN=http://localhost:5174`.
5. From the `server` directory run `npm install`, then `npm run dev`.

## Grant the first administrator

There is intentionally no HTTP route that lets a user grant themselves admin privileges.

Use a trusted, private operator environment with Firebase Admin SDK credentials. Verify the intended account's UID out-of-band, then run a one-time script like this from `server/`:

```js
// grant-admin.mjs — run only from a trusted operator machine; never expose as an HTTP endpoint.
import "dotenv/config";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({ credential: applicationDefault() });

const uid = process.argv[2];
if (!uid) throw new Error("Usage: node grant-admin.mjs <verified-user-uid>");

const user = await getAuth().getUser(uid);
await getAuth().setCustomUserClaims(uid, {
  ...(user.customClaims || {}),
  admin: true,
});
console.log(`Granted admin claim to verified UID: ${uid}`);
```

After setting the claim, the administrator must sign in again (or refresh their ID token) before the claim appears in a token.

To revoke, use a similarly trusted operator script to remove `admin` from the existing custom claims, then revoke refresh tokens if needed. Do not create a public role-assignment endpoint.

## Deployment

Deploy this service behind HTTPS, restrict `CLIENT_ORIGIN`, and use a managed identity / Application Default Credentials where possible. Do not ship service-account keys to the browser or commit them to source control. Protect every future privileged endpoint with `requireAdmin` and validate its input server-side.