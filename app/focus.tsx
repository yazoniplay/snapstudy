import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../components/LocalizedText";
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Animated, ImageBackground, Pressable, SafeAreaView, StatusBar, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { awardXP, loadGamification } from "../lib/gamification";
import { useTheme } from "../lib/theme";
import ConfirmActionModal from "../components/ConfirmActionModal";

type FocusMode="focus"|"short"|"long";
const DEFAULT_DURATIONS:Record<FocusMode,number>={focus:25*60,short:5*60,long:15*60};
export default function FocusRoom(){
 const { colors:c } = useTheme();
 const [mode,setMode]=useState<FocusMode>("focus");
 const [durations,setDurations]=useState(DEFAULT_DURATIONS);
 const [seconds,setSeconds]=useState(DEFAULT_DURATIONS.focus);
 const [running,setRunning]=useState(false);
 const [confirmReset,setConfirmReset]=useState(false);
 const [finished,setFinished]=useState(false);
 const [motionEnabled,setMotionEnabled]=useState(true);
 const [xp,setXp]=useState(0);
 const completed=useRef(false);
 const runId=useRef("focus-room-"+Date.now());
 const styles=makeStyles(c);
 const appear=useRef(new Animated.Value(0)).current;
 const breathe=useRef(new Animated.Value(0)).current;
 useEffect(()=>{AsyncStorage.multiGet(["snapstudy:focus-minutes","snapstudy:break-minutes"]).then(values=>{const focus=Number(values[0]?.[1]);const rest=Number(values[1]?.[1]);const next={...DEFAULT_DURATIONS,focus:[15,20,25,30,45].includes(focus)?focus*60:DEFAULT_DURATIONS.focus,short:[5,10,15].includes(rest)?rest*60:DEFAULT_DURATIONS.short};setDurations(next);setSeconds(next.focus);}).catch(()=>{});},[]);
 useEffect(()=>{Animated.spring(appear,{toValue:1,useNativeDriver:true,friction:8,tension:48}).start();},[appear]);
 useEffect(()=>{let active=true;AsyncStorage.getItem("snapstudy:motion").then(value=>{if(active)setMotionEnabled(value!=="off");}).catch(()=>{});return()=>{active=false}},[]);
 useEffect(()=>{if(!motionEnabled){breathe.setValue(0);return;}const loop=Animated.loop(Animated.sequence([Animated.timing(breathe,{toValue:1,duration:1900,useNativeDriver:true}),Animated.timing(breathe,{toValue:0,duration:1900,useNativeDriver:true})]));loop.start();return()=>loop.stop();},[breathe,motionEnabled]);
 useEffect(()=>{let active=true;loadGamification().then(v=>{if(active)setXp(v.totalXp)}).catch(()=>{});return()=>{active=false}},[]);
 useEffect(()=>{if(!running)return;const timer=setInterval(()=>setSeconds(v=>Math.max(0,v-1)),1000);return()=>clearInterval(timer)},[running]);
 useEffect(()=>{
  if(seconds!==0||!running)return;
  setRunning(false);setFinished(true);
  if(mode==="focus"&&!completed.current){completed.current=true;awardXP(runId.current,40,"focus",`${durations.focus/60}-minute focus session`,{focusSessions:1,focusMinutes:durations.focus/60}).then(v=>setXp(v.totalXp)).catch(e=>console.warn("Focus XP award failed",e));}
 },[seconds,running,mode,durations.focus]);
 function choose(next:FocusMode){setRunning(false);setMode(next);setSeconds(durations[next]);setFinished(false);completed.current=false;runId.current="focus-room-"+Date.now();}
 function reset(){setRunning(false);setSeconds(durations[mode]);setFinished(false);completed.current=false;runId.current="focus-room-"+Date.now();setConfirmReset(false);}
 function requestReset(){if(running||finished||seconds!==durations[mode])setConfirmReset(true);else reset();}
 const clock=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
 return <SafeAreaView style={styles.safe}>
  <StatusBar barStyle="light-content"/>
  <ImageBackground source={{uri:"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1800&q=85"}} resizeMode="cover" style={styles.background}>
   <LinearGradient colors={["rgba(28,18,53,0.48)","rgba(29,20,54,0.38)","rgba(14,19,35,0.76)"]} locations={[0,0.5,1]} style={styles.overlay}>
    <View style={styles.topBar}>
     <Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="chevron-back" size={20} color="#FFFFFF"/><Text style={styles.backText}>Back</Text></Pressable>
     <View style={styles.brand}><Ionicons name="sparkles" size={15} color="#E4D9FF"/><Text style={styles.brandText}>SNAPSTUDY FOCUS</Text></View>
     <Pressable onPress={requestReset} style={styles.iconButton}><Ionicons name="refresh-outline" size={19} color="#FFFFFF"/></Pressable>
    </View>
    <Animated.View style={[styles.center,{opacity:appear,transform:[{translateY:appear.interpolate({inputRange:[0,1],outputRange:[20,0]})}]}]}>
     <View style={styles.modeTabs}>
      {(["focus","short","long"] as FocusMode[]).map(item=><Pressable key={item} onPress={()=>choose(item)} style={[styles.modeTab,mode===item&&styles.modeActive]}><Text style={[styles.modeText,mode===item&&styles.modeTextActive]}>{item==="focus"?`${durations.focus/60} min focus`:item==="short"?`${durations.short/60} min break`:"Long break"}</Text></Pressable>)}
     </View>
     <Text style={styles.headline}>{mode==="focus"?"Find your flow.":mode==="short"?"Take a breath.":"Step away a little."}</Text>
     <Text style={styles.subtitle}>{mode==="focus"?"One thing at a time. You’ve got this.":"Rest is part of learning, too."}</Text>
     <View style={styles.timerWrap}>
      <Animated.View style={[styles.timerRing,{transform:[{scale:breathe.interpolate({inputRange:[0,1],outputRange:[1,1.025]})}]}]}><View style={styles.timerInner}>
       <Text style={styles.clock}>{clock}</Text>
       <Text style={styles.timerCaption}>{finished?(mode==="focus"?"+40 XP EARNED":"BREAK COMPLETE"):running?(mode==="focus"?"FOCUSING":"TAKE A MOMENT"):(mode==="focus"?"READY WHEN YOU ARE":"YOUR BREAK")}</Text>
      </View></Animated.View>
     </View>
     <View style={styles.controls}>
      <Pressable onPress={()=>{if(finished){setSeconds(durations[mode]);completed.current=false;runId.current="focus-room-"+Date.now();}setFinished(false);setRunning(finished?true:!running)}} style={styles.startButton}><Text style={styles.startText}>{running?"Pause":finished?"Start again":"Start session"}</Text><Ionicons name={running?"pause":"play"} size={17} color="#5D459C"/></Pressable>
      <Pressable onPress={requestReset} style={styles.resetButton}><Ionicons name="refresh" size={20} color="#FFFFFF"/></Pressable>
     </View>
     {finished&&mode==="focus"?<Text style={styles.completeText}>Beautiful work. You added 40 XP to your study journey.</Text>:null}
    </Animated.View>
    <View style={styles.bottom}>
     <View style={styles.bottomStat}><View style={styles.statIcon}><Ionicons name="flash" size={17} color="#F7D18A"/></View><View><Text style={styles.statLabel}>TOTAL XP</Text><Text style={styles.statValue}>{xp.toLocaleString()}</Text></View></View>
     <View style={styles.bottomDivider}/>
     <View style={styles.bottomStat}><View style={styles.statIcon}><Ionicons name="leaf" size={17} color="#C8E9D3"/></View><View><Text style={styles.statLabel}>A LITTLE PROGRESS</Text><Text style={styles.statValue}>Every session counts</Text></View></View>
    </View>
   </LinearGradient>
  </ImageBackground>
 <ConfirmActionModal visible={confirmReset} title="Reset focus timer?" message="Your current timer progress will be lost and the session will restart from the beginning." confirmLabel="Reset timer" cancelLabel="Keep session" onCancel={()=>setConfirmReset(false)} onConfirm={reset}/>
 </SafeAreaView>;
}
const makeStyles=(c:{bg:string;surface:string;border:string;text:string;muted:string;accent:string;accentSoft:string;onAccent:string})=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},background:{flex:1,backgroundColor:c.bg},overlay:{flex:1,paddingHorizontal:22,paddingTop:12,paddingBottom:18,justifyContent:"space-between",backgroundColor:"rgba(12,16,27,0.48)"},
 topBar:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",minHeight:44},back:{flexDirection:"row",alignItems:"center",gap:2,paddingVertical:9,paddingRight:12},backText:{color:"#FFFFFF",fontSize:12,fontWeight:"700"},brand:{flexDirection:"row",alignItems:"center",gap:7},brandText:{color:"#F0E9FF",fontSize:10,fontWeight:"900",letterSpacing:2},iconButton:{width:40,height:40,borderRadius:14,backgroundColor:"#FFFFFF1A",borderWidth:1,borderColor:"#FFFFFF30",alignItems:"center",justifyContent:"center"},
 center:{alignItems:"center",width:"100%",maxWidth:720,alignSelf:"center",paddingVertical:18},modeTabs:{flexDirection:"row",gap:8,backgroundColor:"#FFFFFF16",borderWidth:1,borderColor:"#FFFFFF28",borderRadius:18,padding:5},modeTab:{paddingHorizontal:14,paddingVertical:10,borderRadius:13},modeActive:{backgroundColor:c.accent},modeText:{color:"#F2EFFF",fontSize:11,fontWeight:"800"},modeTextActive:{color:c.onAccent},
 headline:{color:"#FFFFFF",fontSize:25,fontWeight:"900",letterSpacing:-.5,textAlign:"center",marginTop:26},subtitle:{color:"#E3DCEF",fontSize:13,textAlign:"center",marginTop:7},
 timerWrap:{marginTop:25,marginBottom:22},timerRing:{width:264,height:264,borderRadius:132,borderWidth:1.5,borderColor:"#FFFFFF70",backgroundColor:"#FFFFFF0B",alignItems:"center",justifyContent:"center",padding:12},timerInner:{width:"100%",height:"100%",borderRadius:120,borderWidth:1,borderColor:"#FFFFFF20",alignItems:"center",justifyContent:"center",backgroundColor:"#1C15382A"},clock:{color:"#FFFFFF",fontSize:62,fontWeight:"300",letterSpacing:-2,fontVariant:["tabular-nums"]},timerCaption:{color:"#E5DDF5",fontSize:9,fontWeight:"900",letterSpacing:1.6,marginTop:7},
 controls:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:12},startButton:{minWidth:156,height:50,borderRadius:18,backgroundColor:c.accent,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingHorizontal:20},startText:{color:c.onAccent,fontSize:13,fontWeight:"900"},resetButton:{width:50,height:50,borderRadius:18,backgroundColor:"#FFFFFF1C",borderWidth:1,borderColor:"#FFFFFF35",alignItems:"center",justifyContent:"center"},completeText:{color:"#F8E8FF",fontSize:11,fontWeight:"800",textAlign:"center",marginTop:16},
 bottom:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:20,backgroundColor:"rgba(255,255,255,0.13)",borderWidth:1,borderColor:"rgba(255,255,255,0.28)",borderRadius:20,paddingVertical:13,paddingHorizontal:16,alignSelf:"center",width:"100%",maxWidth:620},bottomStat:{flexDirection:"row",alignItems:"center",gap:10},statIcon:{width:34,height:34,borderRadius:12,backgroundColor:"#FFFFFF18",alignItems:"center",justifyContent:"center"},statLabel:{color:"#C9BFE0",fontSize:8,fontWeight:"900",letterSpacing:1.2},statValue:{color:"#FFFFFF",fontSize:12,fontWeight:"900",marginTop:3},bottomDivider:{width:1,height:30,backgroundColor:"#FFFFFF30"}
});
