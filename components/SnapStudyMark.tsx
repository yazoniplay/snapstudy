import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

export default function SnapStudyMark({ size = 32 }: { size?: number }) {
  return (
    <LinearGradient
      colors={["#7357FF", "#A66BFF", "#F39BD4"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.32 }]}
    >
      <Ionicons name="book-outline" size={size * 0.57} color="#FFFFFF" />
      <View style={[styles.spark, { width: size * 0.18, height: size * 0.18, borderRadius: size }]} />
      <View style={[styles.glint, { width: size * 0.11, height: size * 0.11, borderRadius: size }]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#7656FF",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  spark: { position: "absolute", right: "16%", top: "16%", backgroundColor: "#FFFFFF", opacity: 0.95 },
  glint: { position: "absolute", left: "18%", bottom: "18%", backgroundColor: "rgba(255,255,255,0.62)" },
});
