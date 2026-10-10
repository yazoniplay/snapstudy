import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

export default function SnapStudyMark({ size = 32 }: { size?: number }) {
  return (
    <LinearGradient
      colors={["#7357FF", "#A66BFF", "#F39BD4"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.32 }]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.63, lineHeight: size * 0.76 }]}>S</Text>
      <View style={[styles.glint, { width: size * 0.16, height: size * 0.16, borderRadius: size }]} />
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
  letter: { color: "#FFFFFF", fontWeight: "900", letterSpacing: -1.5, textAlign: "center" },
  glint: { position: "absolute", right: "18%", top: "17%", backgroundColor: "rgba(255,255,255,0.82)" },
});
