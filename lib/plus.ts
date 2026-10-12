import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export type PlusFeature =
  | "extra_scans"
  | "extended_history"
  | "ad_free"
  | "customization"
  | "ai_coach"
  | "exam_prep"
  | "smart_review"
  | "export";
export type SubscriptionSource = "none" | "stripe" | "webhook" | "app_store" | "play_store" | "trial";
export type PlusEntitlement = { active: boolean; verified: boolean; source: SubscriptionSource; expiresAt?: string | null };
export type PlusTrialStatus = { used: boolean; active: boolean; startedAt: string | null; expiresAt: string | null };

export const FREE_PLAN = { id: "free", name: "SnapStudy Free" } as const;
export const PLUS_PLAN_PREVIEW = {
  id: "plus-monthly",
  name: "SnapStudy Plus",
  proposedMonthlyPrices: { SEK: 29, USD: 2.99, EUR: 2.79, QAR: 10.99, AED: 10.99 },
  features: ["extra_scans", "extended_history", "ad_free", "customization", "ai_coach", "exam_prep", "smart_review", "export"] as PlusFeature[],
} as const;

// A trial is a no-payment preview on this device, not a paid subscription.
// Paid access still comes only from the server-verified subscription row.
const PLUS_TRIAL_KEY = "snapstudy:plus-trial:v1";
const TRIAL_DURATION_MS = 48 * 60 * 60 * 1000;
const NO_TRIAL: PlusTrialStatus = { used: false, active: false, startedAt: null, expiresAt: null };
export const NO_PLUS_ENTITLEMENT: PlusEntitlement = { active: false, verified: false, source: "none", expiresAt: null };

export async function loadPlusTrialStatus(): Promise<PlusTrialStatus> {
  try {
    const raw = await AsyncStorage.getItem(PLUS_TRIAL_KEY);
    if (!raw) return NO_TRIAL;
    const saved = JSON.parse(raw);
    const started = typeof saved.startedAt === "string" ? Date.parse(saved.startedAt) : NaN;
    const expires = typeof saved.expiresAt === "string" ? Date.parse(saved.expiresAt) : NaN;
    if (!Number.isFinite(started) || !Number.isFinite(expires) || expires <= started) {
      return { used: true, active: false, startedAt: null, expiresAt: null };
    }
    return {
      used: true,
      active: expires > Date.now(),
      startedAt: new Date(started).toISOString(),
      expiresAt: new Date(expires).toISOString(),
    };
  } catch {
    return NO_TRIAL;
  }
}

export async function startPlusTrial(): Promise<PlusTrialStatus> {
  const existing = await AsyncStorage.getItem(PLUS_TRIAL_KEY);
  if (existing) throw new Error("The 2-day trial has already been used on this device.");
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + TRIAL_DURATION_MS);
  const trial: PlusTrialStatus = { used: true, active: true, startedAt: startedAt.toISOString(), expiresAt: expiresAt.toISOString() };
  await AsyncStorage.setItem(PLUS_TRIAL_KEY, JSON.stringify(trial));
  return trial;
}

export async function loadPlusEntitlement(): Promise<PlusEntitlement> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("status,provider,current_period_end")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!error && data) {
        const expiresAt = data.current_period_end || null;
        const active = data.status === "active" && data.provider !== "none" && !!expiresAt && Date.parse(expiresAt) > Date.now();
        if (active) return { active: true, verified: true, source: data.provider as SubscriptionSource, expiresAt };
      }
    }
  } catch {
    // A temporary billing lookup failure should not turn a local no-payment trial into a paid entitlement.
  }
  const trial = await loadPlusTrialStatus();
  if (trial.active) return { active: true, verified: false, source: "trial", expiresAt: trial.expiresAt };
  return NO_PLUS_ENTITLEMENT;
}

export function hasPlusFeature(entitlement: PlusEntitlement, feature: PlusFeature): boolean {
  const validExpiry = entitlement.expiresAt == null || Date.parse(entitlement.expiresAt) > Date.now();
  const verifiedPaidAccess = entitlement.active && entitlement.verified && validExpiry;
  const activeTrialPreview = entitlement.active && entitlement.source === "trial" && !entitlement.verified && validExpiry;
  return (verifiedPaidAccess || activeTrialPreview) && PLUS_PLAN_PREVIEW.features.includes(feature);
}
