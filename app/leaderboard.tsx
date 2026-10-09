import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import BottomNav from "../components/BottomNav";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeColors } from "../lib/theme";

type Profile = { id:string; username:string; display_name:string; avatar_url:string|null; current_streak:number; longest_streak:number; last_study_date:string|null };
export default function Leaderboard() {
  const {colors:c}=useTheme(); const s=makeStyles(c);
  const [rows,setRows]=useState<Profile[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [myId,setMyId]=useState("");
  useEffect(()=>{let active=true;(async()=>{
    try {
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){router.replace("/auth");return;} setMyId(user.id);
      const {data,error}=await supabase.from("profiles").select("id,username,display_name,avatar_url,current_streak,longest_streak,last_study_date").eq("leaderboard_opt_in",true).order("longest_streak",{ascending:false}).order("current_streak",{ascending:false}).limit(100);
      if(error) throw error;
      if(active) setRows((data||[]) as Profile[]);
    } catch(e:any){if(active)setError(e?.message||"Couldn't load the leaderboard.");}
    finally{if(active)setLoading(false);}
  })();return()=>{active=false}},[]);
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
    <Pressable onPress={()=>router.replace("/account")}><Text style={s.back}>← Account</Text></Pressable>
    <Text style={s.eyebrow}>SNAPSTUDY COMMUNITY</Text><Text style={s.title}>Streak leaderboard 🔥</Text>
    <Text style={s.sub}>Build a daily habit. Every study day counts.</Text>
    <View style={s.hero}><Text style={s.heroEmoji}>🔥</Text><Text style={s.heroTitle}>Consistency wins.</Text><Text style={s.heroSub}>Ranked by longest streak, then current streak. Only people who opt in appear here.</Text></View>
    {loading?<View style={s.center}><ActivityIndicator color={c.accent}/><Text style={s.muted}>Loading students…</Text></View>:error?<Text style={s.error}>{error}</Text>:rows.length===0?<View style={s.empty}><Text style={s.emptyTitle}>It's quiet in here… for now.</Text><Text style={s.muted}>Turn on leaderboard visibility in Account to join the rankings.</Text><Pressable style={s.primary} onPress={()=>router.replace("/account")}><Text style={s.primaryText}>Set up my profile</Text></Pressable></View>:<View style={s.list}>{rows.map((p,i)=><View key={p.id} style={[s.row,p.id===myId&&s.myRow]}><Text style={[s.rank,i<3&&s.topRank]}>{i===0?"👑":i===1?"🥈":i===2?"🥉":String(i+1).padStart(2,"0")}</Text>{p.avatar_url?<Image source={{uri:p.avatar_url}} style={s.avatar}/>:<View style={s.avatar}><Text style={s.avatarText}>{(p.display_name||p.username||"S")[0].toUpperCase()}</Text></View>}<View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={s.name}>{p.display_name||p.username}</Text><Text numberOfLines={1} style={s.handle}>@{p.username}{p.id===myId?" · YOU":""}</Text></View><View style={s.score}><Text style={s.streak}>🔥 {p.longest_streak}</Text><Text style={s.scoreLabel}>best days</Text><Text style={s.current}>{p.current_streak} current</Text></View></View>)}</View>}
    <Text style={s.foot}>Streaks update when you open a study session. Keep going daily to build your best streak.</Text>
  </ScrollView><BottomNav/></SafeAreaView>;
}
const makeStyles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},container:{padding:20,paddingTop:22,paddingBottom:25},back:{color:c.muted,fontSize:13,fontWeight:"800",marginBottom:24},eyebrow:{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:1.8},title:{color:c.text,fontSize:30,fontWeight:"900",letterSpacing:-1,marginTop:7},sub:{color:c.muted,fontSize:13,marginTop:6,marginBottom:20},hero:{backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.accent,borderRadius:20,padding:18,marginBottom:20},heroEmoji:{fontSize:26},heroTitle:{color:c.text,fontSize:19,fontWeight:"900",marginTop:6},heroSub:{color:c.muted,fontSize:12,lineHeight:19,marginTop:5},center:{padding:30,alignItems:"center",gap:9},muted:{color:c.muted,fontSize:12,lineHeight:19},error:{color:c.danger},empty:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:18,gap:9},emptyTitle:{color:c.text,fontSize:17,fontWeight:"900"},primary:{backgroundColor:c.accent,borderRadius:12,padding:13,alignItems:"center",marginTop:8},primaryText:{color:c.onAccent,fontWeight:"900"},list:{gap:9},row:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:17,padding:12},myRow:{borderColor:c.accent,backgroundColor:c.accentSoft},rank:{width:25,textAlign:"center",fontSize:13,color:c.muted,fontWeight:"900"},topRank:{fontSize:20},avatar:{width:42,height:42,borderRadius:15,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",overflow:"hidden"},avatarText:{color:c.accent,fontSize:16,fontWeight:"900"},name:{color:c.text,fontSize:13,fontWeight:"900"},handle:{color:c.muted,fontSize:10,marginTop:3},score:{alignItems:"flex-end",minWidth:66},streak:{color:c.text,fontSize:13,fontWeight:"900"},scoreLabel:{color:c.muted,fontSize:9,marginTop:1},current:{color:c.accent,fontSize:10,fontWeight:"800",marginTop:4},foot:{color:c.subtle,fontSize:10,lineHeight:16,textAlign:"center",marginTop:18}
});