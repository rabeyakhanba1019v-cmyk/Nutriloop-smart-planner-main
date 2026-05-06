import { ReactNode, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, HeartPulse, Salad, Scale, Sparkles, LogOut, Leaf } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/health", label: "Health", icon: HeartPulse },
  { to: "/leftovers", label: "Leftovers", icon: Salad },
  { to: "/weight", label: "Weight", icon: Scale },
  { to: "/meal-plan", label: "Meal Plan", icon: Sparkles },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar p-4 gap-2">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center shadow-soft">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold tracking-tight">NutriLoop</div>
            <div className="text-xs text-muted-foreground">Smart diet engine</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <div className="rounded-lg bg-muted/60 p-3 text-xs">
            <div className="font-medium truncate">{user.email}</div>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}>
              <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between bg-sidebar border-b px-4 h-14">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center"><Leaf className="h-4 w-4 text-primary-foreground" /></div>
          <span className="font-bold">NutriLoop</span>
        </Link>
        <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}><LogOut className="h-4 w-4" /></Button>
      </div>

      <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8 pb-24 md:pb-8 overflow-x-hidden">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 bg-sidebar border-t">
        {nav.map((n) => {
          const Icon = n.icon;
          const active = path === n.to;
          return (
            <Link key={n.to} to={n.to} className={cn("flex flex-col items-center gap-1 py-2 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
              <Icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
