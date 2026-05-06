import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Recycle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/meal-plan")({ component: MealPlan, head: () => ({ meta: [{ title: "Meal plan — NutriLoop" }] }) });

function MealCard({ k, m, leftoversUsed }: { k: string; m: any; leftoversUsed: string[] }) {
  if (!m) return null;
  const used = (m.ingredients || []).filter((i: string) => leftoversUsed.some((l) => i.toLowerCase().includes(l.toLowerCase().split(" ")[0])));
  return (
    <div className="rounded-2xl bg-card border shadow-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider text-primary font-bold">{k}</div>
        <div className="text-xs font-semibold text-muted-foreground">{m.calories} kcal</div>
      </div>
      <h3 className="font-semibold text-lg">{m.name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(m.ingredients || []).map((i: string, idx: number) => {
          const isLeft = used.includes(i);
          return (
            <span key={idx} className={`text-xs px-2 py-1 rounded-md font-medium ${isLeft ? "bg-success/15 text-success-foreground border border-success/30" : "bg-muted text-muted-foreground"}`}>
              {isLeft && <Recycle className="inline h-3 w-3 mr-1" />}{i}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MealPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("meal_plans").select("*").eq("user_id", user.id).eq("plan_date", today).maybeSingle();
    setPlan(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Meal plan generated!");
      setPlan(data.plan);
    } catch (e: any) {
      const msg = e.message || "Failed to generate meal plan";
      if (msg.includes("Rate limit")) toast.error("Too many requests. Try again in a moment.");
      else if (msg.includes("credits")) toast.error("AI credits exhausted. Add funds in workspace settings.");
      else toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today's meal plan</h1>
          <p className="text-muted-foreground mt-1">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <Button onClick={generate} disabled={generating} className="gradient-primary text-primary-foreground">
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : plan ? <RefreshCw className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {generating ? "Generating…" : plan ? "Regenerate" : "Generate plan"}
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : !plan ? (
        <div className="rounded-2xl bg-card border shadow-card p-12 text-center">
          <div className="h-14 w-14 rounded-2xl gradient-primary mx-auto grid place-items-center shadow-soft mb-4">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-semibold">No plan yet for today</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">Generate a personalized AI meal plan based on your profile, latest health data, and leftovers.</p>
          <Button onClick={generate} disabled={generating} className="gradient-primary text-primary-foreground mt-6">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? "Generating…" : "Generate now"}
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl gradient-soft border p-5 mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-bold">{plan.total_calories} kcal</div>
              <div className="text-sm text-muted-foreground">total for the day</div>
            </div>
            {plan.used_leftovers?.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-success-foreground bg-success/15 px-3 py-1.5 rounded-full font-medium">
                <Recycle className="h-4 w-4" /> Used {plan.used_leftovers.length} leftover{plan.used_leftovers.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
          {plan.notes && <div className="text-sm text-muted-foreground italic mb-4">💡 {plan.notes}</div>}
          <div className="grid md:grid-cols-2 gap-4">
            <MealCard k="Breakfast" m={plan.breakfast} leftoversUsed={plan.used_leftovers || []} />
            <MealCard k="Lunch" m={plan.lunch} leftoversUsed={plan.used_leftovers || []} />
            <MealCard k="Dinner" m={plan.dinner} leftoversUsed={plan.used_leftovers || []} />
            <MealCard k="Snacks" m={plan.snacks} leftoversUsed={plan.used_leftovers || []} />
          </div>
        </>
      )}
    </AppLayout>
  );
}
