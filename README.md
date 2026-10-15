# Chinmay Store Admin

Separate React + Vite repository for the Chinmay Store admin app. The storefront repository remains independent.

## Stack
- Tailwind CSS v4 configured through `@tailwindcss/vite`
- React + Vite + Tailwind CSS v4 + React Router
- Firebase Authentication REST API from the browser
- Firebase Realtime Database REST API for future catalog/order CRUD
- Small Express verification service using Firebase Admin SDK server-side only for verifying custom admin claims

## Start the frontend

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `.env` with the same Firebase project's web API key and Realtime Database URL as the storefront. Frontend runs on `http://localhost:5174`.

## Start the trusted verification service

```bash
cd server
npm install
cp .env.example .env
# Configure credentials as described in server/README.md
npm run dev
```

The frontend calls `GET http://localhost:8787/api/admin/me` after Firebase REST sign-in. It only admits a token with a server-verified `admin: true` custom claim.

## Security notes
- No client-side signup screen and no public admin-role assignment endpoint.
- A valid Firebase account is not enough; the trusted server checks the custom claim.
- Keep service account credentials outside the repository and browser bundle.
- Configure Realtime Database rules separately. Hiding routes in React is not database security.
- The dashboard currently contains foundation/placeholder metrics. Product CRUD and order management are the next milestones.
