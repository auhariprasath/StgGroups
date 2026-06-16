import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, hydrateStore } from "@/lib/data/store";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Mail, Loader2, Bug } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@/lib/data/types";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const noSupabase = typeof window !== "undefined" && !supabase;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--brand-yellow) 0 24px, transparent 24px 48px)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl"
        style={{ backgroundColor: "color-mix(in srgb, var(--brand-red) 18%, transparent)" }}
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLogo />
        </div>

        {noSupabase ? (
          <DevLogin />
        ) : (
          <form onSubmit={submit} className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
            <h1 className="text-xl font-bold tracking-tight">Sign in to STG CRM</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your STG Groups account credentials.
            </p>

            <div className="mt-6 space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="pl-9"
                    placeholder="you@stggroups.co.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="pl-9"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="mt-6 w-full" disabled={submitting || loading}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          STG Groups · Equipment Rentals, Infra &amp; Trading
        </p>
      </div>
    </div>
  );
}

function DevLogin() {
  const db = useDb();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [devLoading, setDevLoading] = useState(false);

  const enterDevMode = async () => {
    if (!userId) return toast.error("Select a user");
    setDevLoading(true);
    // Manually hydrate store with seed data, then set user directly on window
    await hydrateStore();
    const appUser = db.users.find((u) => u.id === userId);
    if (appUser) {
      const mockUser: User = {
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
        phone: appUser.phone,
        role: appUser.role,
        companyId: appUser.companyId,
        title: appUser.title,
      };
      // Store user reference so AuthProvider picks it up
      (window as any).__DEV_USER__ = mockUser;
      window.location.reload();
    }
    setDevLoading(false);
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-2 mb-1">
        <Bug className="h-4 w-4 text-warning" />
        <h1 className="text-xl font-bold tracking-tight">Dev mode</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Supabase is not connected. Select a test user to continue.
      </p>

      {db.users.length === 0 ? (
        <DevQuickLogin />
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Test user</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user…" />
              </SelectTrigger>
              <SelectContent>
                {db.users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} — {u.role} ({u.companyId ?? "all"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={enterDevMode} disabled={devLoading || !userId}>
            {devLoading ? "Loading…" : "Enter dev mode"}
          </Button>
        </div>
      )}
    </div>
  );
}

function DevQuickLogin() {
  const navigate = useNavigate();

  const quickLogin = async (userId: string) => {
    await hydrateStore();
    const db = useDb();
    const appUser = db.users.find((u) => u.id === userId);
    if (appUser) {
      (window as any).__DEV_USER__ = {
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
        phone: appUser.phone,
        role: appUser.role,
        companyId: appUser.companyId,
        title: appUser.title,
      } satisfies User;
      window.location.reload();
    }
  };

  return (
    <div className="text-center space-y-3">
      <p className="text-sm text-muted-foreground">Quick select a role:</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={() => quickLogin("u-md")}>
          MD (all)
        </Button>
        <Button variant="outline" onClick={() => quickLogin("u-sanjay")}>
          Sanjay — Rentals
        </Button>
        <Button variant="outline" onClick={() => quickLogin("u-naveen")}>
          Naveen — Trading
        </Button>
        <Button variant="outline" onClick={() => quickLogin("u-exec1")}>
          Infra exec
        </Button>
      </div>
    </div>
  );
}
