import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  full_name?: string | null;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  goal_weight_kg?: number | null;
  activity_level?: string | null;
  dietary_preference?: string | null;
}

function calcCalories(p: Profile): number {
  if (!p.weight_kg || !p.height_cm || !p.age) return 2000;
  // Mifflin-St Jeor (assume average sex factor)
  const bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + 0; // neutral
  const mult: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const tdee = bmr * (mult[p.activity_level || "moderate"] || 1.55);
  // weight loss deficit if goal lower than current
  const deficit = p.goal_weight_kg && p.goal_weight_kg < p.weight_kg ? 400 : 0;
  return Math.max(1200, Math.round(tdee - deficit));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userData.user.id;

    const [{ data: profile }, { data: health }, { data: leftovers }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("health_logs").select("*").eq("user_id", userId).order("logged_at", { ascending: false }).limit(1),
      supabase.from("leftovers").select("*").eq("user_id", userId).gte("expiry_date", new Date().toISOString().slice(0, 10)),
    ]);

    const targetCalories = calcCalories(profile || {});
    const latestHealth = health?.[0];
    const sugar = latestHealth?.sugar_level;
    const feeling = latestHealth?.feeling || "normal";
    const sugarStatus = sugar == null ? "unknown" : sugar < 70 ? "low" : sugar > 140 ? "high" : "normal";

    const lefts = (leftovers || []).map((l: any) => `${l.food_name} (${l.quantity})`).join(", ") || "none";

    const directives: string[] = [];
    if (sugarStatus === "high") directives.push("Reduce simple carbs and sugars; favor fiber, lean protein, and healthy fats.");
    if (sugarStatus === "low") directives.push("Include complex carbs with protein to stabilize blood sugar.");
    if (feeling === "sick") directives.push("Use light, easily digestible foods (broths, soups, soft fruits, rice).");
    if (feeling === "weak") directives.push("Include iron-rich foods and balanced protein.");
    if (profile?.goal_weight_kg && profile?.weight_kg && profile.goal_weight_kg < profile.weight_kg)
      directives.push("High protein, moderate fats, lower carbs for safe weight loss.");
    if (lefts !== "none") directives.push(`Prioritize using these leftovers where reasonable: ${lefts}.`);

    const systemPrompt = `You are a registered dietitian designing safe, realistic daily meal plans. Always return valid JSON via the function tool. Keep portions practical, ingredients commonly available, and respect medical safety.`;

    const userPrompt = `Build a 1-day meal plan.
Target calories: ~${targetCalories} kcal.
Profile: age ${profile?.age ?? "unknown"}, weight ${profile?.weight_kg ?? "?"}kg, height ${profile?.height_cm ?? "?"}cm, activity ${profile?.activity_level ?? "moderate"}, dietary ${profile?.dietary_preference || "none"}.
Latest sugar: ${sugar ?? "unknown"} mg/dL (${sugarStatus}). Feeling: ${feeling}.
Available leftovers: ${lefts}.
Guidelines: ${directives.join(" ") || "Balanced healthy meals."}
Each meal must include: name, description (1 sentence), ingredients (array), calories (int).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_meal_plan",
              description: "Return the structured daily meal plan",
              parameters: {
                type: "object",
                properties: {
                  breakfast: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, ingredients: { type: "array", items: { type: "string" } }, calories: { type: "integer" } }, required: ["name", "description", "ingredients", "calories"] },
                  lunch: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, ingredients: { type: "array", items: { type: "string" } }, calories: { type: "integer" } }, required: ["name", "description", "ingredients", "calories"] },
                  dinner: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, ingredients: { type: "array", items: { type: "string" } }, calories: { type: "integer" } }, required: ["name", "description", "ingredients", "calories"] },
                  snacks: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, ingredients: { type: "array", items: { type: "string" } }, calories: { type: "integer" } }, required: ["name", "description", "ingredients", "calories"] },
                  notes: { type: "string" },
                  used_leftovers: { type: "array", items: { type: "string" } },
                },
                required: ["breakfast", "lunch", "dinner", "snacks", "notes", "used_leftovers"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_meal_plan" } },
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await response.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const plan = JSON.parse(toolCall.function.arguments);
    const total = (plan.breakfast?.calories || 0) + (plan.lunch?.calories || 0) + (plan.dinner?.calories || 0) + (plan.snacks?.calories || 0);

    // upsert today's plan
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("meal_plans").delete().eq("user_id", userId).eq("plan_date", today);
    const { data: saved, error: saveErr } = await supabase.from("meal_plans").insert({
      user_id: userId,
      plan_date: today,
      breakfast: plan.breakfast,
      lunch: plan.lunch,
      dinner: plan.dinner,
      snacks: plan.snacks,
      total_calories: total,
      notes: plan.notes,
      used_leftovers: plan.used_leftovers || [],
    }).select().single();
    if (saveErr) throw saveErr;

    return new Response(JSON.stringify({ plan: saved, target_calories: targetCalories, sugar_status: sugarStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-meal-plan error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
