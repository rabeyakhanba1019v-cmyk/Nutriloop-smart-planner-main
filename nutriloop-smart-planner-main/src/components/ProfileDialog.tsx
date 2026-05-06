import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function ProfileDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (b: boolean) => void; onSaved?: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    age: "",
    height_cm: "",
    weight_kg: "",
    goal_weight_kg: "",
    activity_level: "moderate",
    dietary_preference: "",
  });

  useEffect(() => {
    if (!open || !user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({
        full_name: data.full_name ?? "",
        age: data.age?.toString() ?? "",
        height_cm: data.height_cm?.toString() ?? "",
        weight_kg: data.weight_kg?.toString() ?? "",
        goal_weight_kg: data.goal_weight_kg?.toString() ?? "",
        activity_level: data.activity_level ?? "moderate",
        dietary_preference: data.dietary_preference ?? "",
      });
    });
  }, [open, user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const payload = {
      user_id: user.id,
      full_name: form.full_name || null,
      age: form.age ? parseInt(form.age) : null,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      goal_weight_kg: form.goal_weight_kg ? parseFloat(form.goal_weight_kg) : null,
      activity_level: form.activity_level,
      dietary_preference: form.dietary_preference || null,
    };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Your profile</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div><Label>Age</Label><Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
          <div><Label>Height (cm)</Label><Input type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} /></div>
          <div><Label>Weight (kg)</Label><Input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></div>
          <div><Label>Goal weight (kg)</Label><Input type="number" step="0.1" value={form.goal_weight_kg} onChange={(e) => setForm({ ...form, goal_weight_kg: e.target.value })} /></div>
          <div className="col-span-2">
            <Label>Activity level</Label>
            <Select value={form.activity_level} onValueChange={(v) => setForm({ ...form, activity_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="very_active">Very active</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Dietary preference (optional)</Label>
            <Input placeholder="e.g. vegetarian, halal, no nuts" value={form.dietary_preference} onChange={(e) => setForm({ ...form, dietary_preference: e.target.value })} />
          </div>
        </div>
        <Button onClick={save} disabled={busy} className="gradient-primary text-primary-foreground">{busy ? "Saving…" : "Save profile"}</Button>
      </DialogContent>
    </Dialog>
  );
}
