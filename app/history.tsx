import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

type Session={id:string;title:string;subject:string|null;created_at:string};

export default function History(){
 const [sessions,setSessions]=useState<Session[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{try{
  const {data:user}=await supabase.auth.getUser(); if(!user.user){router.replace("/auth");return;}
  const {data,error}=await supabase.from("study_sessions").select("id,title,subject,created_at").order("created_at",{ascending:false});
  if(error)throw error; if(active)setSessions(data||[]);
 }catch(e:any){if(active)setError(e?.message||"Couldn't load history.");}finally{if(active)setLoading(false);}})();return()=>{active=false}},[]);
 const date=(d:string)=>new Date(d).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container}>
  <Pressable onPress={()=>router.replace("/")}><Text style={s.back}>‹  Home</Text></Pressable>
  <Text style={s.eyebrow}>YOUR LIBRARY</Text><Text style={s.title}>Study history</Text><Text style={s.sub}>Pick up where you left off.</Text>
  {loading?<View style={s.center}><ActivityIndicator color="#A78BFA"/></View>:error?<Text style={s.error}>{error}</Text>:sessions.length===0?<View style={s.empty}><Text style={s.emptyTitle}>Nothing here yet</Text><Text style={s.emptyText}>Scan your first page and your study session will show up here.</Text><Pressable style={s.primary} onPress={()=>router.replace("/")}><Text style={s.primaryText}>Start studying</Text></Pressable></View>:
   <View style={s.list}>{sessions.map(item=><Pressable key={item.id} style={s.row} onPress={()=>router.push({pathname:"/study",params:{id:item.id}})}><View style={s.icon}><Text style={s.iconText}>✦</Text></View><View style={{flex:1}}><Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text><Text style={s.meta}>{item.subject||"Study"} · {date(item.created_at)}</Text></View><Text style={s.arrow}>›</Text></Pressable>)}</View>}
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#070A12"},container:{padding:22,paddingTop:25,paddingBottom:50},back:{color:"#AAA6B8",fontSize:15,marginBottom:28},eyebrow:{color:"#8F89A0",fontSize:11,fontWeight:"900",letterSpacing:2},title:{color:"#F7F5FF",fontSize:34,fontWeight:"900",letterSpacing:-1.2,marginTop:5},sub:{color:"#858096",fontSize:13,marginTop:7,marginBottom:25},center:{padding:30,alignItems:"center"},error:{color:"#B8BDC8",lineHeight:21},list:{gap:9},row:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#0F1320",borderWidth:1,borderColor:"#242A3A",borderRadius:18,padding:14},icon:{width:40,height:40,borderRadius:13,backgroundColor:"#1B1730",alignItems:"center",justifyContent:"center"},iconText:{color:"#B49AFF",fontSize:18},itemTitle:{color:"#F4F1FF",fontSize:14,fontWeight:"900"},meta:{color:"#777286",fontSize:11,marginTop:4},arrow:{color:"#777286",fontSize:24},empty:{backgroundColor:"#0F1320",borderWidth:1,borderColor:"#242A3A",borderRadius:20,padding:20,marginTop:5},emptyTitle:{color:"#F4F1FF",fontSize:18,fontWeight:"900"},emptyText:{color:"#858096",fontSize:13,lineHeight:20,marginTop:7},primary:{backgroundColor:"#8B5CF6",paddingVertical:14,borderRadius:13,alignItems:"center",marginTop:18},primaryText:{color:"#fff",fontWeight:"900"}
});