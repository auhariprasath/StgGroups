import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { hydrateStore, clearStore } from "./data/store";
import type { CompanyId, Role, User } from "./data/types";

interface AuthState {
  user: User | null;
  role: Role | null;
  companyId: CompanyId | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  companyId: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Track which Supabase Auth UID we have already resolved + hydrated.
   * Token refreshes fire onAuthStateChange with the SAME uid — we skip
   * re-hydration for them so the UI never flickers or reloads data.
   */
  const resolvedUid = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Capture in a non-null local so inner async functions can use it safely.
    const sb = supabase;
    let cancelled = false;

    const handleSession = async (s: Session | null) => {
      if (cancelled) return;

      // ── No session → clear everything and stop loading ──────────────────
      if (!s?.user) {
        if (resolvedUid.current !== null) {
          clearStore();
          resolvedUid.current = null;
        }
        setUser(null);
        setLoading(false);
        return;
      }

      // ── Same user (token refresh) → nothing to do ────────────────────────
      if (resolvedUid.current === s.user.id) {
        setLoading(false);
        return;
      }

      // ── New user → resolve profile and hydrate store ─────────────────────
      setLoading(true);
      try {
        const { data: profile } = await sb
          .from("profiles")
          .select("app_user_id, role, company_id")
          .eq("id", s.user.id)
          .maybeSingle();

        if (cancelled) return;

        let resolved: User | null = null;
        if (profile) {
          const { data: appUser } = await sb
            .from("app_users")
            .select("*")
            .eq("id", profile.app_user_id)
            .maybeSingle();

          resolved = appUser
            ? {
                id: appUser.id,
                name: appUser.name,
                email: appUser.email,
                phone: appUser.phone,
                role: appUser.role,
                companyId: appUser.company_id ?? null,
                title: appUser.title,
              }
            : {
                id: profile.app_user_id,
                name: s.user.email ?? "User",
                email: s.user.email ?? "",
                phone: "",
                role: profile.role,
                companyId: profile.company_id ?? null,
                title: profile.role === "super_admin" ? "Super Admin" : "Executive",
              };
        }

        if (cancelled) return;

        resolvedUid.current = s.user.id;
        setUser(resolved);
        await hydrateStore(); // called ONCE per unique login, never on token refresh
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // 1. Check for an existing persisted session immediately on mount.
    //    loading stays true until this resolves — no flash to /login.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) handleSession(data.session);
    });

    // 2. React to future auth events (sign-in, sign-out, token refresh).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!cancelled) handleSession(s);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []); // runs once — no session dependency, no race condition

  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error("Backend not configured");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    // handleSession fires via onAuthStateChange — no manual call needed
  };

  const logout = async () => {
    await supabase?.auth.signOut();
    clearStore();
    resolvedUid.current = null;
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        companyId: user?.companyId ?? null,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
