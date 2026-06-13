import { createFileRoute, Outlet, Link, useNavigate, useRouterState, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useDb } from "@/lib/data/store";
import { BrandLogo } from "@/components/brand-logo";
import { SaveIndicator } from "@/components/save-indicator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/status";
import type { Role } from "@/lib/data/types";
import {
  LayoutDashboard, Users, FileText, PhoneCall, Truck, HandCoins,
  Inbox, Activity, Settings, Menu, Moon, Sun, LogOut, X, Loader2, BadgeCheck, BarChart3, Bell, MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/_app")({ component: AppLayout });

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "exec"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["super_admin", "exec"] },
  { to: "/leads", label: "Leads", icon: Users, roles: ["super_admin", "exec"] },
  { to: "/follow-ups", label: "Follow-ups", icon: PhoneCall, roles: ["super_admin", "exec"] },
  { to: "/deliveries", label: "Deliveries & Tasks", icon: Truck, roles: ["super_admin", "exec"] },
  { to: "/quotations", label: "Quotations", icon: FileText, roles: ["super_admin", "exec"] },
  { to: "/customers", label: "Customers", icon: BadgeCheck, roles: ["super_admin", "exec"] },
  { to: "/negotiations", label: "Negotiations", icon: HandCoins, roles: ["super_admin", "exec"] },
  { to: "/common-requests", label: "Common Requests", icon: Inbox, roles: ["super_admin", "exec"] },
  { to: "/whatsapp", label: "WhatsApp Hub", icon: MessageSquare, roles: ["super_admin", "exec"] },
  { to: "/team", label: "Team & Targets", icon: Activity, roles: ["super_admin"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["super_admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["super_admin"] },
];

function AppLayout() {
  const { user, role, loading, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const db = useDb();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Auth gate: wait for the session to resolve, then require a signed-in user.
  if (loading) {
    return (
      <div className="grid h-dvh place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;

  const items = NAV.filter((n) => (role ? n.roles.includes(role) : false));
  const company = user?.companyId ? db.companies.find((c) => c.id === user.companyId) : null;

  const SidebarBody = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between gap-2 px-4">
        <BrandLogo variant="light" />
        <button
          className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable nav — fixes the "options hidden below screen" complaint */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback style={{ backgroundColor: company?.accent ?? "var(--primary)", color: "#fff" }}>
              {user ? initialsOf(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{company?.name ?? "All companies"}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar — always present, never collapses away on split-screen */}
      <aside className="hidden w-64 shrink-0 lg:block">{SidebarBody}</aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          {SidebarBody}
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — hamburger ALWAYS visible on small screens */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-md p-2 hover:bg-accent lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="lg:hidden">
            <BrandLogo />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <SaveIndicator />
            {role === "super_admin" && (
              <Select defaultValue="__all">
                <SelectTrigger className="hidden h-9 w-[180px] sm:flex" aria-label="Company filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All companies</SelectItem>
                  {db.companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full" aria-label="Account">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback style={{ backgroundColor: company?.accent ?? "var(--primary)", color: "#fff" }}>
                      {user ? initialsOf(user.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-semibold">{user?.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user?.title}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    navigate({ to: "/login" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Independently scrollable content — fixes lost-scroll & hidden options */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
