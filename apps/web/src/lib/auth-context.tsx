"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError, setAccessToken, setUnauthorizedHandler } from "./api-client";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: { key: string; name: string };
  permissions: string[];
  organization: { id: string; name: string; slug: string };
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { firmName: string; fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const router = useRouter();

  const handleUnauthorized = React.useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  React.useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  // Silently attempt to restore a session from the httpOnly refresh cookie.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.post<{ accessToken: string; user: AuthUser }>("/auth/refresh");
        if (cancelled) return;
        setAccessToken(data.accessToken);
        setUser(data.user);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        setStatus("unauthenticated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const data = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const register = React.useCallback(
    async (input: { firmName: string; fullName: string; email: string; password: string }) => {
      const data = await api.post<{ accessToken: string; user: AuthUser }>("/auth/register", input);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setStatus("authenticated");
    },
    [],
  );

  const logout = React.useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
      router.push("/login");
    }
  }, [router]);

  const hasPermission = React.useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = React.useMemo(
    () => ({ user, status, login, register, logout, hasPermission }),
    [user, status, login, register, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiClientError };
