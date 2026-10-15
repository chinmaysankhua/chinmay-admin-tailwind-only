import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authRequest, verifyAdminToken } from "../firebase/rest";

const AuthContext = createContext(null);
const STORAGE_KEY = "chinmay-admin-session";

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  useEffect(() => {
    let active = true;
    async function validateSession() {
      if (!session?.idToken) {
        setLoading(false);
        return;
      }
      try {
        const tokenInfo = await authRequest("lookup", { idToken: session.idToken });
        const expiry = Number(session.expiresAt || 0);
        if (!tokenInfo.users?.[0] || expiry < Date.now()) throw new Error("Session expired. Sign in again.");
        await verifyAdminToken(session.idToken);
      } catch {
        if (active) {
          localStorage.removeItem(STORAGE_KEY);
          setSession(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    validateSession();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const auth = await authRequest("signInWithPassword", {
      email: email.trim(),
      password,
      returnSecureToken: true,
    });

    try {
      await verifyAdminToken(auth.idToken);
    } catch (error) {
      throw new Error("Signed in, but this account has no admin permission. Ask the project owner to grant the admin role.");
    }

    const nextSession = {
      uid: auth.localId,
      email: auth.email,
      idToken: auth.idToken,
      refreshToken: auth.refreshToken,
      expiresAt: Date.now() + Number(auth.expiresIn || 3600) * 1000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    return nextSession;
  }, []);

  const value = { user: session, loading, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}