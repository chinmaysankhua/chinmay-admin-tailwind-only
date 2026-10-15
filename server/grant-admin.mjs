
import "dotenv/config";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({
  credential: applicationDefault(),
});

const uid = process.argv[2];

if (!uid) {
  throw new Error("Usage: node grant-admin.mjs <user-uid>");
}

async function grantAdmin() {
  const auth = getAuth();

  // Confirm the existing Firebase user before granting access.
  const user = await auth.getUser(uid);

  if (user.email !== "sankhuachinmay9@gmail.com") {
    throw new Error("UID does not belong to the intended admin email.");
  }

  // Preserve existing custom claims.
  await auth.setCustomUserClaims(uid, {
    ...(user.customClaims || {}),
    admin: true,
  });

  console.log(`Admin access granted to ${user.email}`);
}

grantAdmin().catch((error) => {
  console.error("Failed to grant admin access:", error.message);
  process.exitCode = 1;
});
