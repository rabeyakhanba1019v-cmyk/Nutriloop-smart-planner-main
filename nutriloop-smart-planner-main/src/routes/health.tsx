import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Droplet } from "lucide-react";

export const Route = createFileRoute("/health")({ component: Health, head: () => ({ meta: [{ title: "Health — NutriLoop" }] }) });

function Health() {
  const { user } = useAuth();
  const [sugar, setSugar] = useState("");
  const [feeling, setFeeling] = useState("normal");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("health_logs").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(30);
    setLogs(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const s = parseFloat(sugar);
    if (isNaN(s) || s < 20 || s > 600) { toast.error("Enter a valid sugar level (20-600 mg/dL)"); return; }
    setBusy(true);
    const { error } = await supabase.from("health_logs").insert({ user_id: user.id, sugar_level: s, feeling, notes: notes.slice(0, 500) || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Health log saved");
    setSugar(""); setNotes(""); setFeeling("normal");
    load();
  };

  return (
    <AppLayout>
      <h1 className="text-3xl font-bold tracking-tight mb-1">Health log</h1>
      <p className="text-muted-foreground mb-6">Track your sugar levels and how you feel.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={submit} className="rounded-2xl bg-card border shadow-card p-6 space-y-4">
          <div>
            <Label>Sugar level (mg/dL)</Label>
            <Input type="number" value={sugar} onChange={(e) => setSugar(e.target.value)} required min={20} max={600} />
          </div>
          <div>
            <Label>How are you feeling?</Label>
            <Select value={feeling} onValueChange={setFeeling}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="weak">Weak</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else?" />
          </div>
          <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground w-full">{busy ? "Saving…" : "Save log"}</Button>
        </form>

        <div className="rounded-2xl bg-card border shadow-card p-6">
          <h3 className="font-semibold mb-4">Recent logs</h3>
          <div className="space-y-2 max-h-[440px] overflow-y-auto">
            {logs.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No logs yet.</div>}
            {logs.map((l) => {
              const tone = l.sugar_level > 140 ? "bg-destructive/10 text-destructive" : l.sugar_level < 70 ? "bg-warning/15 text-warning-foreground" : "bg-success/10 text-success-foreground";
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                  <div className={`h-9 w-9 rounded-lg grid place-items-center ${tone}`}><Droplet className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{l.sugar_level} mg/dL · <span className="capitalize text-muted-foreground text-sm">{l.feeling}</span></div>
                    <div className="text-xs text-muted-foreground">{new Date(l.logged_at).toLocaleString()}</div>
                    {l.notes && <div className="text-xs text-muted-foreground mt-1 truncate">{l.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
