import { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme";
import { useLanguage } from "../lib/language";
import { LocalizedText as Text } from "./LocalizedText";

type Usage={plan:"free"|"plus";chatUsed:number;chatLimit:number;studyUsed:number;studyLimit:number;resetsAt:string};
export default function DailyAIUsage(){
 const {colors:c}=useTheme();const {language}=useLanguage();const sv=language==="sv";
 const [usage,setUsage]=useState<Usage|null>(null);
 useFocusEffect(useCallback(()=>{let active=true;(async()=>{const {data,error}=await supabase.rpc("get_ai_usage");if(!error&&active&&data)setUsage(data as Usage);})();return()=>{active=false};},[]));
 if(!usage)return null;
 return <View style={[styles.wrap,{backgroundColor:c.surface,borderColor:c.border}]}>
  <Text style={[styles.label,{color:c.muted}]}>{sv?"DAGLIG AI-ANVÄNDNING":"DAILY AI USAGE"} · {usage.plan.toUpperCase()}</Text>
  <Text style={[styles.value,{color:c.text}]}>{sv?"Chatt":"Chat"} {usage.chatUsed}/{usage.chatLimit}  ·  {sv?"Studiegrejer":"Study materials"} {usage.studyUsed}/{usage.studyLimit}</Text>
 </View>;
}
const styles=StyleSheet.create({wrap:{borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:9,marginTop:9,marginBottom:2},label:{fontSize:8,fontWeight:"900",letterSpacing:1.1},value:{fontSize:10,fontWeight:"800",marginTop:4}});
