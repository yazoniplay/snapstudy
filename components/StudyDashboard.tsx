import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";

type Session = { id: string; topic?: string; createdAt: number };
export default function StudyDashboard() {
  const { colors: c } = useTheme();
  const { language } = useLanguage();
  const s = makeStyles(c);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState(0);
  const [goal, setGoal] = useState(2);

  useEffect(() => {
    let active = true;
    (async () => {
      const [raw, savedGoal, auth] = await Promise.all([
        AsyncStorage.getItem("snapstudy:sessions"),
        AsyncStorage.getItem("snapstudy:dailyGoal"),
        supabase.auth.getUser()
      ]);
      if (!active) return;
      if (raw) { try { setSessions(JSON.parse(raw)); } catch {} }
      if (savedGoal) setGoal(Math.max(1, Math.min(5, Number(savedGoal) || 2)));
      if (auth.data.user) {
        const { data } = await supabase.from("profiles").select("current_streak").eq("id", auth.data.user.id).maybeSingle();
        if (active && data) setStreak(data.current_streak || 0);
      }
    })().catch(() => {});
    return () => { active = false; };
  }, []);

  const today = new Date().toDateString();
  const todayCount = sessions.filter(item => new Date(item.createdAt).toDateString() === today).length;
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + i);
    return {
      key: date.toISOString(),
      label: date.toLocaleDateString(language === "sv" ? "sv-SE" : language === "ar" ? "ar" : "en-US", { weekday: "short" }).slice(0, 2),
      count: sessions.filter(item => new Date(item.createdAt).toDateString() === date.toDateString()).length,
      today: date.toDateString() === today
    };
  });
  const sv = language === "sv";
  const ar = language === "ar";

  return <View style={s.card}>
    <View style={s.top}>
      <View style={{ flex: 1 }}>
        <Text style={s.eyebrow}>{sv ? "DINA FRAMSTEG" : ar ? "تقدمك" : "YOUR PROGRESS"}</Text>
        <Text style={s.title}>{sv ? "Dagens mål" : ar ? "هدف اليوم" : "Today's goal"}</Text>
      </View>
      <View style={s.streak}><Text style={s.flame}>🔥</Text><Text style={s.streakNum}>{streak}</Text><Text style={s.streakLabel}>{sv ? "dagars svit" : ar ? "أيام متتالية" : "day streak"}</Text></View>
    </View>
    <View style={s.progressRow}>
      <Text style={s.count}>{todayCount}<Text style={s.goal}> / {goal}</Text></Text>
      <Text style={s.caption}>{sv ? "studiepass idag" : ar ? "جلسات اليوم" : "study sessions"}</Text>
      <View style={s.track}><View style={[s.fill, { width: Math.min(100, todayCount / goal * 100) + "%" }]} /></View>
    </View>
    <View style={s.week}>{days.map(day => <View key={day.key} style={s.day}>
      <View style={[s.dot, day.count > 0 && s.dotActive, day.today && s.dotToday]} />
      <Text style={[s.dayLabel, day.today && s.todayLabel]}>{day.label}</Text>
    </View>)}</View>
  </View>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 17, padding: 14, marginBottom: 18 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  eyebrow: { color: c.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: c.text, fontSize: 15, fontWeight: "900", marginTop: 3 },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.accentSoft, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 7 },
  flame: { fontSize: 12 }, streakNum: { color: c.text, fontSize: 13, fontWeight: "900" }, streakLabel: { color: c.muted, fontSize: 9, fontWeight: "700" },
  progressRow: { marginTop: 12 }, count: { color: c.text, fontSize: 20, fontWeight: "900" }, goal: { color: c.muted, fontSize: 13, fontWeight: "700" },
  caption: { position: "absolute", right: 0, top: 5, color: c.muted, fontSize: 10, fontWeight: "700" },
  track: { height: 5, borderRadius: 9, backgroundColor: c.border, overflow: "hidden", marginTop: 8 },
  fill: { height: "100%", borderRadius: 9, backgroundColor: c.accent },
  week: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 3 },
  day: { alignItems: "center", gap: 5, minWidth: 24 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.border },
  dotActive: { backgroundColor: c.accent }, dotToday: { borderWidth: 1.5, borderColor: c.accent, width: 9, height: 9, borderRadius: 5 },
  dayLabel: { color: c.subtle, fontSize: 9, fontWeight: "700" }, todayLabel: { color: c.accent }
});