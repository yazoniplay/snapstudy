import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";

type Session = { id: string; topic?: string; createdAt: number };
type ReviewEntry = { dueAt: number; intervalDays: number; repetitions: number; lastRating: string };
export default function StudyDashboard() {
  const { colors: c } = useTheme();
  const { language } = useLanguage();
  const s = makeStyles(c);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [goal, setGoal] = useState(2);
  const [dueCards, setDueCards] = useState(0);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const [raw, savedGoal, rawSchedule, auth] = await Promise.all([
        AsyncStorage.getItem("snapstudy:sessions"),
        AsyncStorage.getItem("snapstudy:dailyGoal"),
        AsyncStorage.getItem("snapstudy:reviewSchedule"),
        supabase.auth.getUser()
      ]);
      if (!active) return;
      let localSessions: Session[] = [];
      let schedule: Record<string, ReviewEntry> = {};
      if (raw) { try { localSessions = JSON.parse(raw); setSessions(localSessions); } catch {} }
      if (rawSchedule) { try { schedule = JSON.parse(rawSchedule); } catch {} }
      if (savedGoal) setGoal(Math.max(1, Math.min(5, Number(savedGoal) || 2)));
      let due = 0;
      let firstDueSession: string | null = null;
      for (const session of localSessions.slice(0, 50)) {
        try {
          const savedResult = await AsyncStorage.getItem("snapstudy:session:" + session.id);
          if (!savedResult) continue;
          const result = JSON.parse(savedResult) as { topic?: string; flashcards?: { question: string }[] };
          const cards = result.flashcards || [];
          const sessionDue = cards.filter(card => {
            const entry = schedule[String(result.topic || "topic") + "::" + card.question];
            return !entry || entry.dueAt <= Date.now();
          }).length;
          due += sessionDue;
          if (sessionDue > 0 && !firstDueSession) firstDueSession = session.id;
        } catch {}
      }
      if (active) { setDueCards(due); setReviewSessionId(firstDueSession || localSessions[0]?.id || null); }
      if (auth.data.user) {
        const { data } = await supabase.from("profiles").select("current_streak,longest_streak").eq("id", auth.data.user.id).maybeSingle();
        if (active && data) { setStreak(data.current_streak || 0); setBest(data.longest_streak || 0); }
      }
    })().catch(() => {});
    return () => { active = false; };
  }, []);
  const today = new Date().toDateString();
  const todayCount = sessions.filter(x => new Date(x.createdAt).toDateString() === today).length;
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 6 + i);
    return { key: d.toISOString(), day: d.getDate(), label: d.toLocaleDateString(language === "sv" ? "sv-SE" : language === "ar" ? "ar" : "en-US", { weekday: "short" }).slice(0, 2), count: sessions.filter(x => new Date(x.createdAt).toDateString() === d.toDateString()).length, today: d.toDateString() === today };
  }), [sessions, language, today]);
  const weekTotal = days.reduce((n, d) => n + d.count, 0);
  async function setDailyGoal(next: number) {
    const value = Math.max(1, Math.min(5, next));
    setGoal(value);
    await AsyncStorage.setItem("snapstudy:dailyGoal", String(value)).catch(() => {});
  }
  const sv = language === "sv";
  const ar = language === "ar";
  return <View style={s.card}>
    <View style={s.top}><View><Text style={s.eyebrow}>{sv ? "DIN VECKA" : ar ? "أسبوعك" : "YOUR PROGRESS"}</Text><Text style={s.title}>{sv ? "Små steg räknas" : ar ? "كل خطوة مهمة" : "Small steps add up"}</Text></View><View style={s.streak}><Text style={s.flame}>🔥</Text><Text style={s.streakNum}>{streak}</Text><Text style={s.streakLabel}>{sv ? "dagar" : ar ? "أيام" : "day streak"}</Text></View></View>
    <View style={s.stats}><View style={s.stat}><Text style={s.value}>{todayCount}/{goal}</Text><Text style={s.label}>{sv ? "Pass idag" : ar ? "جلسات اليوم" : "Sessions today"}</Text><View style={s.track}><View style={[s.fill, { width: Math.min(100, todayCount / goal * 100) + "%" }]} /></View></View><View style={s.stat}><Text style={s.value}>{weekTotal}</Text><Text style={s.label}>{sv ? "Pass den här veckan" : ar ? "جلسات هذا الأسبوع" : "Sessions this week"}</Text><Text style={s.best}>{sv ? "Bästa svit: " + best : ar ? "أفضل سلسلة: " + best : "Best streak: " + best + " days"}</Text></View></View>
    <View style={s.week}>{days.map(d => <View key={d.key} style={s.day}><View style={[s.dot, d.count > 0 && s.dotActive, d.today && s.dotToday]}><Text style={[s.dayNum, d.count > 0 && s.dayNumActive]}>{d.count > 0 ? "✓" : d.day}</Text></View><Text style={[s.dayLabel, d.today && s.todayLabel]}>{d.label}</Text><View style={[s.bar, { height: Math.min(26, 4 + d.count * 7), opacity: d.count ? 1 : 0.3 }]} /></View>)}</View>
    <Pressable disabled={!reviewSessionId} onPress={() => reviewSessionId && router.push({ pathname: "/study", params: { id: reviewSessionId, mode: "flashcards", due: "1" } })} style={[s.reviewRow, !reviewSessionId && { opacity: 0.55 }]}>
      <View style={s.reviewIcon}><Text style={s.reviewIconText}>✦</Text></View>
      <View style={s.goalCopy}>
        <Text style={s.goalTitle}>{sv ? "Flashcards att repetera" : ar ? "بطاقات للمراجعة" : "Flashcards to review"}</Text>
        <Text style={s.goalSub}>{dueCards > 0 ? (sv ? "Repetera nu för att behålla det du lärt dig." : ar ? "راجع الآن لتثبيت ما تعلمته." : "Review now to keep what you’ve learned fresh.") : (sv ? "Du ligger i fas. Bra jobbat!" : ar ? "أنت على المسار الصحيح!" : "You’re all caught up. Nice work!")}</Text>
      </View>
      <View style={s.reviewCount}><Text style={s.reviewCountText}>{dueCards}</Text><Text style={s.reviewArrow}>›</Text></View>
    </Pressable>
    <View style={s.goalRow}><View style={s.goalCopy}><Text style={s.goalTitle}>{sv ? "Ditt dagliga mål" : ar ? "هدفك اليومي" : "Daily study goal"}</Text><Text style={s.goalSub}>{sv ? "Välj antal pluggpass per dag." : ar ? "اختر عدد جلسات الدراسة يوميًا." : "Choose how many study sessions you aim for."}</Text></View><View style={s.controls}><Pressable disabled={goal <= 1} style={s.goalButton} onPress={() => setDailyGoal(goal - 1)}><Text style={s.goalButtonText}>−</Text></Pressable><Text style={s.goalValue}>{goal}</Text><Pressable disabled={goal >= 5} style={s.goalButton} onPress={() => setDailyGoal(goal + 1)}><Text style={s.goalButtonText}>+</Text></Pressable></View></View>
  </View>;
}
const makeStyles = (c: ThemeColors) => StyleSheet.create({
 card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:23,padding:16,marginBottom:22},
 top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},eyebrow:{color:c.muted,fontSize:9,fontWeight:"900",letterSpacing:1.8},title:{color:c.text,fontSize:19,fontWeight:"900",marginTop:5},
 streak:{flexDirection:"row",alignItems:"center",gap:4,backgroundColor:c.accentSoft,borderRadius:13,paddingHorizontal:9,paddingVertical:8},flame:{fontSize:13},streakNum:{color:c.text,fontSize:16,fontWeight:"900"},streakLabel:{color:c.muted,fontSize:9,fontWeight:"800"},
 stats:{flexDirection:"row",gap:9,marginTop:16},stat:{flex:1,minHeight:86,borderRadius:15,padding:12,backgroundColor:c.surfaceAlt},value:{color:c.text,fontSize:23,fontWeight:"900"},label:{color:c.muted,fontSize:10,fontWeight:"700",marginTop:3},track:{height:5,backgroundColor:c.border,borderRadius:5,overflow:"hidden",marginTop:10},fill:{height:"100%",backgroundColor:c.accent,borderRadius:5},best:{color:c.subtle,fontSize:9,marginTop:9},
 week:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-end",marginTop:17,paddingHorizontal:2},day:{flex:1,alignItems:"center",gap:5},dot:{width:27,height:27,borderRadius:10,backgroundColor:c.input,alignItems:"center",justifyContent:"center"},dotActive:{backgroundColor:c.accent},dotToday:{borderWidth:2,borderColor:c.accent},dayNum:{color:c.muted,fontSize:10,fontWeight:"800"},dayNumActive:{color:c.onAccent},dayLabel:{color:c.subtle,fontSize:9,fontWeight:"800"},todayLabel:{color:c.accent},bar:{width:5,minHeight:4,borderRadius:5,backgroundColor:c.accent,marginTop:1},
 reviewRow:{flexDirection:"row",alignItems:"center",gap:10,borderTopWidth:1,borderBottomWidth:1,borderColor:c.border,marginTop:16,paddingVertical:14},
 reviewIcon:{width:35,height:35,borderRadius:12,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},reviewIconText:{color:c.accent,fontSize:17,fontWeight:"900"},reviewCount:{flexDirection:"row",alignItems:"center",gap:7},reviewCountText:{color:c.accent,fontSize:17,fontWeight:"900"},reviewArrow:{color:c.muted,fontSize:23,fontWeight:"700"},
 goalRow:{flexDirection:"row",alignItems:"center",gap:10,borderTopWidth:0,borderTopColor:c.border,marginTop:2,paddingTop:8},goalCopy:{flex:1},goalTitle:{color:c.text,fontSize:12,fontWeight:"900"},goalSub:{color:c.muted,fontSize:10,lineHeight:15,marginTop:3},controls:{flexDirection:"row",alignItems:"center",gap:9},goalButton:{width:30,height:30,borderRadius:10,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},goalButtonText:{color:c.accent,fontSize:19,fontWeight:"900"},goalValue:{color:c.text,fontSize:14,fontWeight:"900",minWidth:10,textAlign:"center"}
});