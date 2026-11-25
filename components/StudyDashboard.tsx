import { LocalizedText as Text, LocalizedTextInput as TextInput } from "./LocalizedText";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";

type Session = { id: string; topic?: string; createdAt: number };
export default function StudyDashboard() {
  const { colors:c } = useTheme();
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
    const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate()-6+i);
    return { key: date.toISOString(), label: date.toLocaleDateString(language==="sv"?"sv-SE":language==="ar"?"ar":"en-US",{weekday:"short"}).slice(0,2), count:sessions.filter(item=>new Date(item.createdAt).toDateString()===date.toDateString()).length, today:date.toDateString()===today };
  });
  const max = Math.max(1,...days.map(d=>d.count));
  const sv=language==="sv", ar=language==="ar";
  return <View style={s.card}>
    <View style={s.header}>
      <View style={{flex:1}}><Text style={s.kicker}>{sv?"DEN HÄR VECKAN":ar?"هذا الأسبوع":"YOUR WEEK"}</Text><Text style={s.title}>{sv?"Dina studiepass":ar?"جلسات الدراسة":"Study activity"}</Text></View>
      <View style={s.streak}><Ionicons name="flame" size={15} color="#F59E65"/><Text style={s.streakNumber}>{streak}</Text><Text style={s.streakText}>{sv?"dagar":ar?"أيام":"day streak"}</Text></View>
    </View>
    <View style={s.chart}>{days.map(day=><View key={day.key} style={s.barCol}><View style={s.barTrack}><View style={[s.bar,{height:Math.max(day.count?12:4,day.count/max*62),backgroundColor:day.today?c.accent:day.count?c.accent+"99":c.border}]} /></View><Text style={[s.dayLabel,day.today&&s.dayToday]}>{day.label}</Text></View>)}</View>
    <View style={s.footer}><View><Text style={s.goalCount}>{todayCount}<Text style={s.goalSlash}> / {goal}</Text></Text><Text style={s.goalCaption}>{sv?"pass idag":ar?"جلسات اليوم":"sessions today"}</Text></View><View style={s.goalRight}><View style={s.goalTrack}><View style={[s.goalFill,{width:Math.min(100,todayCount/goal*100)+"%"}]}/></View><Text style={s.goalHint}>{todayCount>=goal?(sv?"Dagens mål klart!":ar?"تم إنجاز هدف اليوم!":"Daily goal reached!"):((goal-todayCount)+" "+(sv?"kvar till målet":ar?"متبقي لتحقيق الهدف":"to your daily goal"))}</Text></View></View>
  </View>;
}
const makeStyles=(c:ThemeColors)=>StyleSheet.create({
 card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:22,padding:17,marginBottom:15},
 header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},kicker:{color:c.accent,fontSize:9,fontWeight:"900",letterSpacing:1.7},title:{color:c.text,fontSize:18,fontWeight:"900",letterSpacing:-.3,marginTop:4},
 streak:{flexDirection:"row",alignItems:"center",gap:4,backgroundColor:c.input,borderRadius:12,paddingHorizontal:10,paddingVertical:8},streakNumber:{color:c.text,fontSize:13,fontWeight:"900"},streakText:{color:c.muted,fontSize:9,fontWeight:"700"},
 chart:{height:104,flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",paddingTop:14,paddingHorizontal:3},barCol:{flex:1,alignItems:"center",justifyContent:"flex-end",gap:8},barTrack:{height:68,width:20,justifyContent:"flex-end",alignItems:"center"},bar:{width:18,borderRadius:7},dayLabel:{color:c.subtle,fontSize:9,fontWeight:"800"},dayToday:{color:c.accent},
 footer:{flexDirection:"row",alignItems:"center",gap:15,borderTopWidth:1,borderTopColor:c.border,paddingTop:13,marginTop:3},goalCount:{color:c.text,fontSize:21,fontWeight:"900"},goalSlash:{color:c.muted,fontSize:13,fontWeight:"700"},goalCaption:{color:c.muted,fontSize:10,fontWeight:"700",marginTop:1},goalRight:{flex:1,gap:6},goalTrack:{height:7,backgroundColor:c.border,borderRadius:8,overflow:"hidden"},goalFill:{height:"100%",backgroundColor:c.accent,borderRadius:8},goalHint:{color:c.muted,fontSize:10,fontWeight:"700"}
});
