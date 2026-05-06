import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Salad, Trash2 } from "lucide-react";

export const Route = createFileRoute("/leftovers")({ component: Leftovers, head: () => ({ meta: [{ title: "Leftovers — NutriLoop" }] }) });

function Leftovers() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ food_name: "", quantity: "", expiry_date: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    // auto-clean expired
    await supabase.from("leftovers").delete().eq("user_id", user.id).lt("expiry_date", today);
    const { data } = await supabase.from("leftovers").select("*").eq("user_id", user.id).order("expiry_date", { ascending: true });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.food_name.trim() || !form.quantity.trim() || !form.expiry_date) { toast.error("Fill all fields"); return; }
    setBusy(true);
    const { error } = await supabase.from("leftovers").insert({
      user_id: user.id,
      food_name: form.food_name.slice(0, 100),
      quantity: form.quantity.slice(0, 50),
      expiry_date: form.expiry_date,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Leftover added");
    setForm({ food_name: "", quantity: "", expiry_date: "" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("leftovers").delete().eq("id", id);
    load();
  };

  return (
    <AppLayout>
      <h1 className="text-3xl font-bold tracking-tight mb-1">Leftovers</h1>
      <p className="text-muted-foreground mb-6">Track food you have so AI can use it in your plan. Expired items auto-remove.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={add} className="rounded-2xl bg-card border shadow-card p-6 space-y-4">
          <div><Label>Food name</Label><Input value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })} placeholder="e.g. Grilled chicken" /></div>
          <div><Label>Quantity</Label><Input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 2 servings" /></div>
          <div><Label>Expiry date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} min={new Date().toISOString().slice(0, 10)} /></div>
          <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground w-full">{busy ? "Adding…" : "Add leftover"}</Button>
        </form>

        <div className="rounded-2xl bg-card border shadow-card p-6">
          <h3 className="font-semibold mb-4">Your fridge ({items.length})</h3>
          <div className="space-y-2 max-h-[440px] overflow-y-auto">
            {items.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">Nothing tracked yet.</div>}
            {items.map((it) => {
              const days = Math.ceil((new Date(it.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const tone = days <= 1 ? "bg-destructive/10 text-destructive" : days <= 3 ? "bg-warning/15 text-warning-foreground" : "bg-mint text-mint-foreground";
              return (
                <div key={it.id} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                  <div className={`h-9 w-9 rounded-lg grid place-items-center ${tone}`}><Salad className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.food_name}</div>
                    <div className="text-xs text-muted-foreground">{it.quantity} · expires in {days} day{days !== 1 ? "s" : ""}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
