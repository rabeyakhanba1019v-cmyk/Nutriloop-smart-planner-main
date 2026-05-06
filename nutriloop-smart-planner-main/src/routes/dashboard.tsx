import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import ProfileDialog from "@/components/ProfileDialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Activity, Droplet, Flame, Recycle, Settings2, Sparkles, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — NutriLoop" }] }),
});

function Card({ title, value, hint, icon: Icon, tone = "primary" }: any) {
  const toneClass = tone === "warning" ? "bg-warning/15 text-warning-foreground" : tone === "destructive" ? "bg-destructive/15 text-destructive" : tone === "success" ? "bg-success/15 text-success-foreground" : "bg-mint text-mint-foreground";
  return (
    <div className="rounded-2xl bg-card border shadow-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`h-9 w-9 rounded-xl grid place-items-center ${toneClass}`}><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [latestHealth, setLatestHealth] = useState<any>(null);
  const [latestWeight, setLatestWeight] = useState<any>(null);
  const [leftCount, setLeftCount] = useState(0);
  const [todayPlan, setTodayPlan] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: p }, { data: h }, { data: w }, { data: l }, { data: mp }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("health_logs").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(1),
      supabase.from("weight_logs").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(1),
      supabase.from("leftovers").select("id").eq("user_id", user.id).gte("expiry_date", today),
      supabase.from("meal_plans").select("*").eq("user_id", user.id).eq("plan_date", today).maybeSingle(),
    ]);
    setProfile(p);
    setLatestHealth(h?.[0] ?? null);
    setLatestWeight(w?.[0] ?? null);
    setLeftCount(l?.length ?? 0);
    setTodayPlan(mp);
    if (!p?.weight_kg) setEditOpen(true);
  };

  useEffect(() => { refresh(); }, [user]);

  const calorieTarget = (() => {
    if (!profile?.weight_kg || !profile?.height_cm || !profile?.age) return "—";
    const bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age;
    const mult: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const tdee = bmr * (mult[profile.activity_level || "moderate"] || 1.55);
    const def = profile.goal_weight_kg && profile.goal_weight_kg < profile.weight_kg ? 400 : 0;
    return Math.max(1200, Math.round(tdee - def)).toString();
  })();

  const sugarStatus = !latestHealth ? { label: "No data", tone: "primary" as const } : latestHealth.sugar_level > 140 ? { label: "High", tone: "destructive" as const } : latestHealth.sugar_level < 70 ? { label: "Low", tone: "warning" as const } : { label: "Normal", tone: "success" as const };
  const weightDelta = profile?.weight_kg && latestWeight?.weight_kg ? (latestWeight.weight_kg - profile.weight_kg).toFixed(1) : null;

  const alerts: string[] = [];
  if (latestHealth && latestHealth.sugar_level > 140) alerts.push("Sugar level high — avoid simple carbs today");
  if (leftCount > 0) alerts.push(`You have ${leftCount} leftover item${leftCount > 1 ? "s" : ""} — let's use them today`);
  if (!latestHealth || (Date.now() - new Date(latestHealth.logged_at).getTime()) > 1000 * 60 * 60 * 24) alerts.push("Update your health data for a better meal plan");

  return (
    <AppLayout>
      <ProfileDialog open={editOpen} onOpenChange={setEditOpen} onSaved={refresh} />
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋</h1>
          <p className="text-muted-foreground mt-1">Here's your nutrition snapshot for today.</p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Settings2 className="h-4 w-4 mr-2" /> Edit profile</Button>
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 grid gap-2">
          {alerts.map((a, i) => (
            <div key={i} className="rounded-xl bg-mint text-mint-foreground px-4 py-2.5 text-sm font-medium border border-primary/10">{a}</div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Calorie target" value={calorieTarget} hint="kcal/day" icon={Flame} />
        <Card title="Sugar status" value={sugarStatus.label} hint={latestHealth ? `${latestHealth.sugar_level} mg/dL` : "Log to see"} icon={Droplet} tone={sugarStatus.tone} />
        <Card title="Weight" value={latestWeight?.weight_kg ?? profile?.weight_kg ?? "—"} hint={weightDelta ? `${weightDelta} kg vs profile` : "kg"} icon={TrendingDown} />
        <Card title="Leftovers" value={leftCount} hint="items not expired" icon={Recycle} tone="success" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="md:col-span-2 rounded-2xl bg-card border shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Today's meal plan</h2>
              <p className="text-sm text-muted-foreground">{todayPlan ? `${todayPlan.total_calories} kcal · ${todayPlan.used_leftovers?.length ?? 0} leftover items used` : "No plan yet for today"}</p>
            </div>
            <Link to="/meal-plan"><Button className="gradient-primary text-primary-foreground"><Sparkles className="h-4 w-4 mr-2" />Open</Button></Link>
          </div>
          {todayPlan ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {(["breakfast", "lunch", "dinner", "snacks"] as const).map((k) => {
                const m = todayPlan[k];
                if (!m) return null;
                return (
                  <div key={k} className="rounded-xl bg-muted/40 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k}</div>
                    <div className="font-semibold mt-1">{m.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.calories} kcal</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">Generate your first AI plan from the Meal Plan tab.</div>
          )}
        </div>

        <div className="rounded-2xl bg-card border shadow-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="h-4 w-4" /> Quick actions</h3>
          <div className="flex flex-col gap-2">
            <Link to="/health"><Button variant="outline" className="w-full justify-start">Log health data</Button></Link>
            <Link to="/leftovers"><Button variant="outline" className="w-full justify-start">Add leftover</Button></Link>
            <Link to="/weight"><Button variant="outline" className="w-full justify-start">Record weight</Button></Link>
            <Link to="/meal-plan"><Button className="gradient-primary text-primary-foreground w-full justify-start">Generate meal plan</Button></Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
