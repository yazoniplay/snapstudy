import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LocalizedText as Text } from "./LocalizedText";
import { useLanguage } from "../lib/language";
import { useTheme } from "../lib/theme";
import { subscribeXPRewards, type XPRewardNotice } from "../lib/gamification";

export default function XPRewardSplash() {
  const { colors: c } = useTheme();
  const { language } = useLanguage();
  const sv = language === "sv";
  const [notice, setNotice] = useState<XPRewardNotice | null>(null);
  const motion = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styles = makeStyles(c);

  useEffect(() => {
    const unsubscribe = subscribeXPRewards((next) => {
      if (timer.current) clearTimeout(timer.current);
      setNotice(next);
      motion.stopAnimation();
      motion.setValue(0);
      Animated.spring(motion, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 170, mass: 0.8 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(motion, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setNotice(null);
        });
      }, next.leveledUp ? 4200 : 2400);
    });
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
      motion.stopAnimation();
    };
  }, [motion]);

  if (!notice) return null;
  const levelUp = notice.leveledUp;
  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View style={[styles.card, levelUp && styles.levelCard, {
        opacity: motion,
        transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }, { scale: motion.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
      }]}>
        <View style={[styles.icon, levelUp && styles.levelIcon]}>
          <Ionicons name={levelUp ? "trophy" : "flash"} size={levelUp ? 27 : 22} color={levelUp ? "#FFD66B" : c.accent} />
        </View>
        <View style={styles.copy}>
          {levelUp ? (
            <>
              <Text style={styles.eyebrow}>{sv ? "NY NIVÅ UPPLÅST!" : "LEVEL UP UNLOCKED!"}</Text>
              <Text style={styles.level}>{sv ? "Nivå" : "Level"} {notice.level}</Text>
              <Text style={styles.sub}>{sv ? "Du klättrar uppåt. Fortsätt så!" : "You're moving up. Keep it going!"}</Text>
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>{sv ? "XP INTJÄNAT" : "XP EARNED"}</Text>
              <Text style={styles.amount}>+{notice.xp} XP</Text>
              <Text style={styles.sub} numberOfLines={1}>{notice.title}</Text>
            </>
          )}
        </View>
        {levelUp ? <View style={styles.levelPill}><Text style={styles.levelPillText}>LVL {notice.level}</Text></View> : null}
      </Animated.View>
    </View>
  );
}

function makeStyles(c: any) {
  return StyleSheet.create({
    host: { position: "absolute", top: 54, left: 16, right: 16, zIndex: 9999, alignItems: "center" },
    card: { width: "100%", maxWidth: 430, minHeight: 76, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 15, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
    levelCard: { minHeight: 112, borderColor: "#D6A83D", backgroundColor: "#202033", paddingVertical: 16 },
    icon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: c.accent + "20" },
    levelIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#D6A83D22" },
    copy: { flex: 1, minWidth: 0 },
    eyebrow: { color: "#D6A83D", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
    amount: { color: c.text, fontSize: 23, fontWeight: "900", marginTop: 1 },
    level: { color: "#FFF4D2", fontSize: 27, fontWeight: "900", marginTop: 1 },
    sub: { color: c.muted, fontSize: 11, fontWeight: "600", marginTop: 2 },
    levelPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: "#D6A83D22", borderWidth: 1, borderColor: "#D6A83D66" },
    levelPillText: { color: "#FFD66B", fontSize: 10, fontWeight: "900" },
  });
}
