import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import BottomNav from "../components/BottomNav";

import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
type Session={id:string;title:string;subject:string|null;created_at:string};

export default function History(){
 const { colors:c } = useTheme(); const s=makeStyles(c); const {t}=useLanguage();
 const [sessions,setSessions]=useState<Session[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{try{
  const {data:user}=await supabase.auth.getUser(); if(!user.user){router.replace("/auth");return;}
  const {data,error}=await supabase.from("study_sessions").select("id,title,subject,created_at").order("created_at",{ascending:false});
  if(error)throw error; if(active)setSessions(data||[]);
 }catch(e:any){if(active)setError(e?.message||t("historyLoadFailed"));}finally{if(active)setLoading(false);}})();return()=>{active=false}},[]);
 const date=(d:string)=>new Date(d).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container}>
  <Pressable onPress={()=>router.replace("/")}><Text style={s.back}>{t("back")}</Text></Pressable>
  <Text style={s.eyebrow}>{t("libraryLabel")}</Text><Text style={s.title}>{t("historyTitle")}</Text><Text style={s.sub}>{t("historySub")}</Text>
  {loading?<View style={s.center}><ActivityIndicator color={c.accent}/></View>:error?<Text style={s.error}>{error}</Text>:sessions.length===0?<View style={s.empty}><Text style={s.emptyTitle}>{t("emptyHistory")}</Text><Text style={s.emptyText}>{t("emptyHistorySub")}</Text><Pressable style={s.primary} onPress={()=>router.replace("/")}><Text style={s.primaryText}>{t("startStudying")}</Text></Pressable></View>:
   <View style={s.list}>{sessions.map(item=><Pressable key={item.id} style={s.row} onPress={()=>router.push({pathname:"/study",params:{id:item.id}})}><View style={s.icon}><Text style={s.iconText}>✦</Text></View><View style={{flex:1}}><Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text><Text style={s.meta}>{item.subject||t("studySubject")} · {date(item.created_at)}</Text></View><Text style={s.arrow}>›</Text></Pressable>)}</View>}
 </ScrollView><BottomNav /></SafeAreaView>
}
const makeStyles = (c: ThemeColors) => StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},container:{padding:22,paddingTop:25,paddingBottom:25},back:{color:c.muted,fontSize:15,marginBottom:28},eyebrow:{color:c.muted,fontSize:11,fontWeight:"900",letterSpacing:2},title:{color:c.text,fontSize:34,fontWeight:"900",letterSpacing:-1.2,marginTop:5},sub:{color:c.muted,fontSize:13,marginTop:7,marginBottom:25},center:{padding:30,alignItems:"center"},error:{color:c.text,lineHeight:21},list:{gap:9},row:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:14},icon:{width:40,height:40,borderRadius:13,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},iconText:{color:c.accent,fontSize:18},itemTitle:{color:c.text,fontSize:14,fontWeight:"900"},meta:{color:c.subtle,fontSize:11,marginTop:4},arrow:{color:c.subtle,fontSize:24},empty:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:20,padding:20,marginTop:5},emptyTitle:{color:c.text,fontSize:18,fontWeight:"900"},emptyText:{color:c.muted,fontSize:13,lineHeight:20,marginTop:7},primary:{backgroundColor:c.accent,paddingVertical:14,borderRadius:13,alignItems:"center",marginTop:18},primaryText:{color:c.onAccent,fontWeight:"900"}
});