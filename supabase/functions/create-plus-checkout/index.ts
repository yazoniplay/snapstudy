import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://yazoniplay.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  const allowedOrigins = new Set([
    "https://yazoniplay.github.io",
    "http://localhost:8081",
    "http://localhost:19006",
  ]);
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json({ error: "Please sign in before subscribing." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const priceId = Deno.env.get("STRIPE_PRICE_ID");
  const appUrl = Deno.env.get("APP_URL") || "https://yazoniplay.github.io/snapstudy";

  if (!supabaseUrl || !anonKey || !stripeSecret || !priceId) {
    return json({ error: "Payments are not configured yet. Please try again later." }, 503);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return json({ error: "Your session expired. Please sign in again." }, 401);

  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("line_items[0][price]", priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("client_reference_id", user.id);
  form.set("metadata[user_id]", user.id);
  form.set("metadata[plan]", "snapstudy_plus_monthly");
  form.set("subscription_data[metadata][user_id]", user.id);
  form.set("subscription_data[metadata][plan]", "snapstudy_plus_monthly");
  form.set("success_url", `${appUrl}/plus?plus=success`);
  form.set("cancel_url", `${appUrl}/plus?plus=cancelled`);
  if (user.email) form.set("customer_email", user.email);

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${stripeSecret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const session = await stripeResponse.json();
  if (!stripeResponse.ok || !session.url) {
    console.error("Stripe checkout creation failed", stripeResponse.status, session?.error?.type);
    return json({ error: "Could not start checkout. Please try again later." }, 502);
  }
  return json({ url: session.url });
});
