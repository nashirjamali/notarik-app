import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { bootstrapSession } from "@/lib/api";
import { login as loginRequest, logout as logoutRequest, signup as signupRequest } from "@/lib/client";
import { clearSession, getSession, saveSession, subscribeSession, type Session } from "@/lib/session";
import type { TokenPair } from "@/lib/types";

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function storePair(pair: TokenPair) {
  await saveSession({
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token,
    userId: pair.user_id,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(getSession());

  useEffect(() => subscribeSession(() => setSession(getSession())), []);
  useEffect(() => {
    bootstrapSession()
      .catch(() => clearSession())
      .finally(() => setReady(true));
  }, []);

  async function signup(email: string, password: string, name?: string) {
    const pair = await signupRequest({ email, password, name: name?.trim() || undefined });
    await storePair(pair);
  }

  async function login(email: string, password: string) {
    const pair = await loginRequest({ email, password });
    await storePair(pair);
  }

  async function logout() {
    const current = getSession();
    if (current) {
      await logoutRequest({ refresh_token: current.refreshToken }).catch(() => undefined);
    }
    await clearSession();
  }

  return (
    <AuthContext.Provider value={{ ready, session, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}
