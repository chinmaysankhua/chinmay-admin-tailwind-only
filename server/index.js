import "dotenv/config";
import express from "express";
import cors from "cors";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({ credential: applicationDefault() });

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5174" }));
app.use(express.json({ limit: "20kb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: "Missing bearer token." });

  try {
    const decoded = await getAuth().verifyIdToken(match[1], true);
    if (decoded.admin !== true) {
      return res.status(403).json({ error: "Administrator permission required." });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired sign-in token." });
  }
}

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ admin: true, uid: req.admin.uid, email: req.admin.email || null });
});

// Intentionally no public endpoint to grant custom claims.
// Grant the admin claim only from a trusted operator environment after verifying identity.

const PORT = Number(process.env.PORT || 8787);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Chinmay Admin auth service listening on port ${PORT}`);
});
