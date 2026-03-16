import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { login, register, me, logout } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import type { UserProfile } from "@/lib/profile";
import { getToken } from "@/lib/api";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";

// Provides authentication context to the app, managing user state, loading state, and auth functions for login, registration, and logout. 
// On mount, it checks for an existing token and fetches user info if present.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  const refreshProfile = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      return;
    }
    me()
      .then(async (u) => {
        setUser(u);
        await refreshProfile();
      })
      .catch(() => {
        setUser(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, [refreshProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      login: async (email, password) => {
        const u = await login(email, password);
        setUser(u);
        await refreshProfile();
      },
      register: async (email, password) => {
        const u = await register(email, password);
        setUser(u);
        await refreshProfile();
      },
      refreshProfile,
      logout: () => {
        logout();
        setUser(null);
        setProfile(null);
      },
    }),
    [user, profile, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
