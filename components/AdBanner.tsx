import { useCallback, useEffect, useState } from "react";
import { AppState, Image, Linking, Platform, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { supabase } from "../lib/supabase";
import { useFocusEffect } from "expo-router";
import { hasPlusFeature, loadPlusEntitlement } from "../lib/plus";

type SponsoredAd = {
  id: string;
  advertiser_name: string;
  headline: string;
  body: string | null;
  image_url: string | null;
  target_url: string;
};

export default function AdBanner() {
  const [ad, setAd] = useState<SponsoredAd | null>(null);
  const [checked, setChecked] = useState(false);
  const [adFree, setAdFree] = useState(false);

  const loadAd = useCallback(async () => {
    try {
      const entitlement = await loadPlusEntitlement();
      const premium = hasPlusFeature(entitlement, "ad_free");
      setAdFree(premium);
      if (premium) { setAd(null); return; }
      const { data, error } = await supabase
        .from("sponsored_ads")
        .select("id,advertiser_name,headline,body,image_url,target_url,starts_at,ends_at")
        .eq("status", "approved")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const now = Date.now();
      const active = (data ?? []).find((item: any) =>
        (!item.starts_at || new Date(item.starts_at).getTime() <= now) &&
        (!item.ends_at || new Date(item.ends_at).getTime() >= now)
      );
      setAd(active ?? null);
    } catch {
      // Keep the standard ad slot working even if the custom ad feed is unavailable.
      setAd(null);
    } finally {
      setChecked(true);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadAd();
  }, [loadAd]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void loadAd();
    });
    return () => subscription.remove();
  }, [loadAd]);

  if (adFree) return null;
  if (Platform.OS !== "android" && Platform.OS !== "ios") return null;

  if (ad) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Sponsored ad: ${ad.advertiser_name}. ${ad.headline}`}
        onPress={() => { void Linking.openURL(ad.target_url).catch(() => {}); }}
        style={{
          marginVertical: 12,
          borderRadius: 18,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(154,130,235,0.28)",
          backgroundColor: "rgba(255,255,255,0.06)",
        }}
      >
        <LinearGradient
          colors={["rgba(156,124,255,0.13)", "rgba(244,167,210,0.10)", "rgba(255,255,255,0.04)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 12 }}
        >
          {ad.image_url ? (
            <Image
              source={{ uri: ad.image_url }}
              resizeMode="cover"
              style={{ width: 68, height: 68, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.08)" }}
            />
          ) : (
            <View style={{ width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(156,124,255,0.18)" }}>
              <Text style={{ color: "#C5B2FF", fontSize: 24, fontWeight: "900" }}>✦</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: "#BBA9FF", fontSize: 9, fontWeight: "900", letterSpacing: 1.6 }}>SPONSORED</Text>
            <Text numberOfLines={2} style={{ color: "#F6F3FF", fontSize: 14, fontWeight: "800" }}>{ad.headline}</Text>
            {!!ad.body && <Text numberOfLines={2} style={{ color: "#B9B3CC", fontSize: 11, lineHeight: 16 }}>{ad.body}</Text>}
            <Text numberOfLines={1} style={{ color: "#C5B2FF", fontSize: 10, fontWeight: "700" }}>{ad.advertiser_name} · Learn more ↗</Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // AdMob's test banner remains as a safe fallback during development.
  // Replace TestIds.BANNER with your real ad unit ID before production monetization.
  return (
    <View style={{ alignItems: "center", minHeight: 54, justifyContent: "center", marginVertical: 12 }}>
      <BannerAd
        unitId={TestIds.BANNER}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(error) => console.warn("SnapStudy test banner did not load:", error.message)}
      />
    </View>
  );
}
