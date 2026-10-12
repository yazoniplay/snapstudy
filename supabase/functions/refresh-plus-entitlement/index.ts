import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecret) {
    return json({ error: "Entitlement refresh is not configured" }, 503);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Sign in required" }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return json({ error: "Invalid session" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: row, error: lookupError } = await admin
      .from("user_subscriptions")
      .select("provider, provider_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (row?.provider !== "stripe" || !row.provider_subscription_id) {
      return json({ active: false, reason: "No Stripe subscription linked" });
    }

    const response = await fetch(
      "https://api.stripe.com/v1/subscriptions/" + encodeURIComponent(row.provider_subscription_id),
      { headers: { Authorization: "Bearer " + stripeSecret } },
    );
    const subscription = await response.json();
    if (!response.ok) throw new Error("Stripe subscription lookup failed");

    const status = subscription.status;
    const activeStatus = status === "active" || status === "trialing";
    const endSeconds = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end ?? null;
    const expiresAt = typeof endSeconds === "number" ? new Date(endSeconds * 1000).toISOString() : null;
    const active = activeStatus && !!expiresAt && Date.parse(expiresAt) > Date.now();
    const storedStatus = active ? "active" : status === "past_due" ? "past_due" : status === "canceled" ? "canceled" : "expired";

    const { error: updateError } = await admin.from("user_subscriptions").update({
      status: storedStatus,
      current_period_end: expiresAt,
      product_id: subscription.items?.data?.[0]?.price?.id ?? null,
      provider_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id).eq("provider", "stripe");
    if (updateError) throw updateError;

    return json({ active, expiresAt, provider: "stripe" });
  } catch (error) {
    console.error("Plus entitlement refresh failed", error);
    return json({ error: "Could not verify Plus right now" }, 502);
  }
});
