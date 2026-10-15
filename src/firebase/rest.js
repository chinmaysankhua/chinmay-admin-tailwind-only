const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
const DATABASE_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL;

export async function authRequest(endpoint, payload) {
  if (!API_KEY) throw new Error("Missing VITE_FIREBASE_API_KEY in .env");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = {
      EMAIL_NOT_FOUND: "No account exists for this email.",
      INVALID_LOGIN_CREDENTIALS: "Email or password is incorrect.",
      INVALID_PASSWORD: "Email or password is incorrect.",
      USER_DISABLED: "This account has been disabled.",
      OPERATION_NOT_ALLOWED: "Email/password sign-in is not enabled in Firebase.",
    };
    throw new Error(messages[data?.error?.message] || data?.error?.message || "Authentication failed.");
  }
  return data;
}

export async function verifyAdminToken(idToken) {
  const response = await fetch(`${import.meta.env.VITE_ADMIN_API_BASE_URL}/api/admin/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.admin !== true) {
    throw new Error(data?.error || "This account is not authorized as an administrator.");
  }
  return data;
}

export async function databaseRequest(path, method, idToken, body) {
  if (!DATABASE_URL) throw new Error("Missing VITE_FIREBASE_DATABASE_URL in .env");
  const cleanPath = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  const url = new URL(`${DATABASE_URL.replace(/\/+$/, "")}/${cleanPath}.json`);
  if (idToken) url.searchParams.set("auth", idToken);

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : `Database request failed (${response.status}).`);
  return data;
}