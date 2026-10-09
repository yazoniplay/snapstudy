export type PlusFeature = "extra_scans" | "extended_history" | "ad_free" | "customization";
export type SubscriptionSource = "none" | "webhook" | "app_store" | "play_store";
export type PlusEntitlement = { active: boolean; verified: boolean; source: SubscriptionSource; expiresAt?: string | null };
export const FREE_PLAN = { id: "free", name: "SnapStudy Free" } as const;
export const PLUS_PLAN_PREVIEW = {
 id: "plus-monthly",
 name: "SnapStudy Plus",
 proposedMonthlyPrices: { SEK: 29, USD: 2.99, EUR: 2.79, QAR: 10.99, AED: 10.99 },
 features: ["extra_scans", "extended_history", "ad_free", "customization"] as PlusFeature[],
} as const;
// Client storage is never proof of a paid subscription. Until a trusted billing webhook/store receipt
// verifies the entitlement, every Plus-only capability must remain disabled.
export const NO_PLUS_ENTITLEMENT: PlusEntitlement = { active: false, verified: false, source: "none", expiresAt: null };
import { supabase } from "./supabase";
export async function loadPlusEntitlement(): Promise<PlusEntitlement> {
 try {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NO_PLUS_ENTITLEMENT;
  const { data, error } = await supabase.from("user_subscriptions").select("status,provider,current_period_end").eq("user_id", auth.user.id).maybeSingle();
  if (error || !data) return NO_PLUS_ENTITLEMENT;
  const expiresAt = data.current_period_end || null;
  const active = data.status === "active" && data.provider !== "none" && !!expiresAt && Date.parse(expiresAt) > Date.now();
  return { active, verified: active, source: data.provider as SubscriptionSource, expiresAt };
 } catch { return NO_PLUS_ENTITLEMENT; }
}
export function hasPlusFeature(entitlement: PlusEntitlement, feature: PlusFeature): boolean {
 return entitlement.active && entitlement.verified && (entitlement.expiresAt == null || Date.parse(entitlement.expiresAt) > Date.now()) && PLUS_PLAN_PREVIEW.features.includes(feature);
}
