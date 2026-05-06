import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

export const Route = createFileRoute("/weight")({ component: Weight, head: () => ({ meta: [{ title: "Weight tracker — NutriLoop" }] }) });

function Weight() {
  const { user } = useAuth();
  const [weight, setWeight] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from("weight_logs").select("*").eq("user_id", user.id).order("logged_at", { ascending: true }),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setLogs(l ?? []); setProfile(p);
  };
  useEffect(() => { load(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const w = parseFloat(weight);
    if (isNaN(w) || w < 20 || w > 400) { toast.error("Enter a valid weight (20-400 kg)"); return; }
    setBusy(true);
    const { error } = await supabase.from("weight_logs").insert({ user_id: user.id, weight_kg: w });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Weight logged");
    setWeight("");
    load();
  };

  const chart = logs.map((l) => ({ date: new Date(l.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }), weight: Number(l.weight_kg) }));
  const latest = logs[logs.length - 1]?.weight_kg ?? null;
  const start = logs[0]?.weight_kg ?? null;
  const goal = profile?.goal_weight_kg;
  const prediction = (() => {
    if (!latest || !goal || logs.length < 2) return null;
    const days = (new Date(logs[logs.length - 1].logged_at).getTime() - new Date(logs[0].logged_at).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 1) return null;
    const ratePerDay = (latest - start) / days;
    if (ratePerDay === 0 || (goal - latest) / ratePerDay <= 0) return null;
    const daysToGoal = Math.round((goal - latest) / ratePerDay);
    if (daysToGoal > 365 * 3) return "More than 3 years at current pace";
    return `~${daysToGoal} day${daysToGoal !== 1 ? "s" : ""} to your goal at current pace`;
  })();

  return (
    <AppLayout>
      <h1 className="text-3xl font-bold tracking-tight mb-1">Weight tracker</h1>
      <p className="text-muted-foreground mb-6">Log your weight and watch your progress.</p>

      <div className="grid md:grid-cols-3 gap-6">
        <form onSubmit={submit} className="rounded-2xl bg-card border shadow-card p-6 space-y-4">
          <div><Label>Current weight (kg)</Label><Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} required /></div>
          <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground w-full">{busy ? "Saving…" : "Log weight"}</Button>
          {goal && <div className="rounded-xl bg-mint text-mint-foreground p-3 text-sm">Goal: <strong>{goal} kg</strong>{latest && <div className="mt-1 text-xs">{Math.abs(latest - goal).toFixed(1)} kg to go</div>}</div>}
          {prediction && <div className="text-xs text-muted-foreground">{prediction}</div>}
        </form>

        <div className="md:col-span-2 rounded-2xl bg-card border shadow-card p-6">
          <h3 className="font-semibold mb-4">Progress</h3>
          {chart.length < 2 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">Log at least 2 entries to see your trend.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chart}>
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                {goal && <ReferenceLine y={goal} stroke="var(--primary)" strokeDasharray="4 4" label={{ value: "Goal", fill: "var(--primary)", fontSize: 11 }} />}
                <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2.5} dot={{ fill: "var(--primary)", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
