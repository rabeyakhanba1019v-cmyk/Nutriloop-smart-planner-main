import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Leaf, Sparkles, HeartPulse, Recycle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen gradient-soft">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center shadow-soft">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">NutriLoop</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost">Sign in</Button>
        </Link>
      </header>

      <main className="container mx-auto px-6 pt-12 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-mint text-mint-foreground px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" /> AI-powered nutrition
          </span>
          <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight">
            Eat smarter. Waste less.
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Live healthier.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            NutriLoop builds your daily meal plan around your health, sugar levels, and the leftovers in your fridge.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-soft">Get started free</Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {[
            { icon: HeartPulse, title: "Health-aware meals", desc: "Adjusts carbs and calories based on your sugar level and how you feel." },
            { icon: Recycle, title: "Leftover-first", desc: "Prioritizes the food you already have so nothing goes to waste." },
            { icon: Sparkles, title: "AI meal planner", desc: "Generates breakfast, lunch, dinner and snacks in seconds." },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="rounded-2xl bg-card p-6 shadow-card border">
                <div className="h-10 w-10 rounded-xl bg-mint grid place-items-center mb-4">
                  <Icon className="h-5 w-5 text-mint-foreground" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
