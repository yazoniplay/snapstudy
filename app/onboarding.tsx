import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeColors } from "../lib/theme";

const subjects = ["Maths","Science","English","Languages","History","Geography","Other"];
const goals = [{value:"10",title:"10 minutes",sub:"A quick daily session"},{value:"20",title:"20 minutes",sub:"A solid study habit"},{value:"30",title:"30 minutes",sub:"Go a little deeper"}];

export default function Onboarding() {
 const {colors:c,mode,setMode}=useTheme(); const s=makeStyles(c);
 const [step,setStep]=useState(0); const [selected,setSelected]=useState<string[]>(["Maths","Science"]); const [goal,setGoal]=useState("20"); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 function toggle(subject:string){setSelected(old=>old.includes(subject)?old.filter(x=>x!==subject):[...old,subject]);}
 async function finish(){
  if(!selected.length){setError("Pick at least one subject.");return;}
  setBusy(true);setError("");
  const prefs={subjects:selected,study_goal_minutes:Number(goal),onboarding_completed:true,theme:mode};
  try{
   const {data:{user},error:getError}=await supabase.auth.getUser();
   if(getError) throw getError;
   if(!user){router.replace("/auth");return;}
   const {error:updateError}=await supabase.auth.updateUser({data:prefs});
   if(updateError) throw updateError;
   await AsyncStorage.setItem("snapstudy:preferences",JSON.stringify(prefs));
   router.replace("/");
  }catch(e:any){setError(e?.message||"Couldn't save your setup. Try again.");}
  finally{setBusy(false);}
 }
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.wrap}>
  <View style={s.top}><Text style={s.eyebrow}>LET'S SET YOU UP</Text><Text style={s.step}>0{step+1}<Text style={s.stepTotal}> / 02</Text></Text></View>
  <View style={s.progressTrack}><View style={[s.progressFill,{width:step===0?"50%":"100%"}]}/></View>
  {step===0?<><Text style={s.title}>What are you studying?</Text><Text style={s.sub}>Choose your subjects. You can change these later.</Text><View style={s.grid}>{subjects.map((subject,i)=>{const active=selected.includes(subject);return <Pressable key={subject} onPress={()=>toggle(subject)} style={[s.subject,active&&s.subjectActive]}><View style={[s.check,active&&s.checkActive]}><Text style={[s.checkText,active&&s.checkTextActive]}>{active?"✓":["∑","⚗","A","文","⌂","⌖","＋"][i]}</Text></View><Text style={[s.subjectText,active&&s.subjectTextActive]}>{subject}</Text></Pressable>})}</View><Text style={s.note}>Pick more than one if you want.</Text><Pressable style={s.primary} onPress={()=>{if(!selected.length){setError("Pick at least one subject.");return;}setError("");setStep(1);}}><Text style={s.primaryText}>Continue →</Text></Pressable></>:<><Text style={s.title}>Set a daily goal.</Text><Text style={s.sub}>Small, consistent sessions beat cramming the night before.</Text><View style={s.goalList}>{goals.map(g=><Pressable key={g.value} onPress={()=>setGoal(g.value)} style={[s.goal,goal===g.value&&s.goalActive]}><View style={{flex:1}}><Text style={[s.goalTitle,goal===g.value&&s.goalTitleActive]}>{g.title}</Text><Text style={s.goalSub}>{g.sub}</Text></View><View style={[s.radio,goal===g.value&&s.radioActive]}>{goal===g.value&&<View style={s.radioDot}/>}</View></Pressable>)}</View><View style={s.themeCard}><View style={{flex:1}}><Text style={s.goalTitle}>App appearance</Text><Text style={s.goalSub}>Switch whenever you want in settings.</Text></View><View style={s.themeRow}><Pressable onPress={()=>setMode("light")} style={[s.themeBtn,mode==="light"&&s.themeBtnActive]}><Text style={[s.themeBtnText,mode==="light"&&s.themeBtnTextActive]}>☀ Light</Text></Pressable><Pressable onPress={()=>setMode("dark")} style={[s.themeBtn,mode==="dark"&&s.themeBtnActive]}><Text style={[s.themeBtnText,mode==="dark"&&s.themeBtnTextActive]}>☾ Dark</Text></Pressable></View></View><View style={s.actions}><Pressable style={s.back} onPress={()=>setStep(0)}><Text style={s.backText}>← Back</Text></Pressable><Pressable style={[s.primary,s.finish]} onPress={finish} disabled={busy}>{busy?<ActivityIndicator color={c.onAccent}/>:<Text style={s.primaryText}>Finish setup ✓</Text>}</Pressable></View></>}
  {!!error&&<Text style={s.error}>{error}</Text>}
  <Text style={s.footer}>You only do this once. Your setup is saved to your account.</Text>
 </ScrollView></SafeAreaView>;
}

const makeStyles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},wrap:{padding:22,paddingTop:30,paddingBottom:36,maxWidth:620,width:"100%",alignSelf:"center",flexGrow:1},
 top:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},eyebrow:{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:2},step:{color:c.text,fontSize:12,fontWeight:"900"},stepTotal:{color:c.subtle,fontWeight:"700"},
 progressTrack:{height:5,borderRadius:9,backgroundColor:c.border,marginTop:15,marginBottom:30,overflow:"hidden"},progressFill:{height:5,borderRadius:9,backgroundColor:c.accent},
 title:{color:c.text,fontSize:32,fontWeight:"900",letterSpacing:-1,marginTop:5},sub:{color:c.muted,fontSize:14,lineHeight:21,marginTop:8,marginBottom:22},
 grid:{flexDirection:"row",flexWrap:"wrap",gap:10},subject:{width:"48%",minHeight:78,borderRadius:16,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,padding:13,flexDirection:"row",alignItems:"center",gap:10},subjectActive:{borderColor:c.accent,backgroundColor:c.accentSoft},
 check:{width:30,height:30,borderRadius:10,backgroundColor:c.input,alignItems:"center",justifyContent:"center"},checkActive:{backgroundColor:c.accent},checkText:{color:c.muted,fontSize:15,fontWeight:"900"},checkTextActive:{color:c.onAccent},
 subjectText:{color:c.muted,fontSize:13,fontWeight:"800"},subjectTextActive:{color:c.text},note:{color:c.subtle,fontSize:11,marginTop:13},
 primary:{height:52,borderRadius:14,backgroundColor:c.accent,alignItems:"center",justifyContent:"center",marginTop:22,flex:1},primaryText:{color:c.onAccent,fontWeight:"900",fontSize:14},
 goalList:{gap:10},goal:{borderWidth:1,borderColor:c.border,backgroundColor:c.surface,borderRadius:16,padding:16,flexDirection:"row",alignItems:"center",gap:12},goalActive:{borderColor:c.accent,backgroundColor:c.accentSoft},goalTitle:{color:c.text,fontSize:14,fontWeight:"900"},goalTitleActive:{color:c.text},goalSub:{color:c.muted,fontSize:12,marginTop:4},
 radio:{width:22,height:22,borderRadius:11,borderWidth:1.5,borderColor:c.border,alignItems:"center",justifyContent:"center"},radioActive:{borderColor:c.accent},radioDot:{width:11,height:11,borderRadius:6,backgroundColor:c.accent},
 themeCard:{marginTop:15,padding:15,borderRadius:16,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,gap:14},themeRow:{flexDirection:"row",gap:8},themeBtn:{paddingHorizontal:13,paddingVertical:10,borderRadius:11,borderWidth:1,borderColor:c.border},themeBtnActive:{backgroundColor:c.accentSoft,borderColor:c.accent},themeBtnText:{color:c.muted,fontSize:12,fontWeight:"800"},themeBtnTextActive:{color:c.text},
 actions:{flexDirection:"row",alignItems:"center",gap:10,marginTop:10},back:{paddingHorizontal:15,paddingVertical:15},backText:{color:c.muted,fontWeight:"800"},finish:{marginTop:10},error:{color:c.danger,fontSize:12,lineHeight:18,marginTop:12},footer:{color:c.subtle,fontSize:11,textAlign:"center",lineHeight:17,marginTop:26}
});
