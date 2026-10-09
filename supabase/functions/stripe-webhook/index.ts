import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;

  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`));
  const digest = Array.from(new Uint8Array(signed)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return signatures.some((signature) => constantTimeEqual(signature, digest));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !stripeSecret || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Webhook is not configured" }, 503);
  }

  const payload = await req.text();
  const signature = req.headers.get("Stripe-Signature") || "";
  if (!(await verifyStripeSignature(payload, signature, webhookSecret))) {
    return json({ error: "Invalid signature" }, 400);
  }

  let event: any;
  try { event = JSON.parse(payload); } catch { return json({ error: "Invalid JSON" }, 400); }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const object = event?.data?.object;
    if (event.type === "checkout.session.completed" && object?.mode === "subscription") {
      const userId = object?.metadata?.user_id || object?.client_reference_id;
      const subscriptionId = object?.subscription;
      if (!userId || !subscriptionId) return json({ received: true, ignored: "missing user or subscription" });

      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: { "Authorization": `Bearer ${stripeSecret}` },
      });
      const subscription = await response.json();
      if (!response.ok) throw new Error("Could not retrieve Stripe subscription");

      const active = subscription.status === "active" || subscription.status === "trialing";
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      const { error } = await supabase.from("user_subscriptions").upsert({
        user_id: userId,
        status: active ? "active" : subscription.status === "past_due" ? "past_due" : "expired",
        provider: "stripe",
        product_id: subscription.items?.data?.[0]?.price?.id ?? null,
        provider_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
        provider_subscription_id: subscription.id,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = object;
      const userId = subscription?.metadata?.user_id;
      if (!userId) return json({ received: true, ignored: "subscription has no user metadata" });
      const active = event.type !== "customer.subscription.deleted" &&
        (subscription.status === "active" || subscription.status === "trialing");
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      const { error } = await supabase.from("user_subscriptions").upsert({
        user_id: userId,
        status: active ? "active" : subscription.status === "past_due" ? "past_due" : "canceled",
        provider: "stripe",
        product_id: subscription.items?.data?.[0]?.price?.id ?? null,
        provider_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
        provider_subscription_id: subscription.id,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
    } else if (event.type === "invoice.payment_failed") {
      const subscriptionId = typeof object?.subscription === "string" ? object.subscription : object?.subscription?.id;
      if (subscriptionId) {
        const { error } = await supabase.from("user_subscriptions").update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        }).eq("provider_subscription_id", subscriptionId).eq("provider", "stripe");
        if (error) throw error;
      }
    }
    return json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
