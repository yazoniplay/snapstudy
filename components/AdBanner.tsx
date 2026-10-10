import { Platform, View } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

export default function AdBanner() {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return null;
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
