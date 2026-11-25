import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Animated, Easing, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { imageToBase64, setPendingImages } from "../lib/image";
import BottomNav from "../components/BottomNav";
import StudyDashboard from "../components/StudyDashboard";
import SnapStudyMark from "../components/SnapStudyMark";
import AdBanner from "../components/AdBanner";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { getLevel, loadGamification, type GamificationState } from "../lib/gamification";
import { supabase } from "../lib/supabase";

import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
export default function Home() {
  const { colors:c, mode } = useTheme();
  const glass = mode === "dark" ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.78)";
  const glassEdge = mode === "dark" ? "rgba(255,255,255,0.19)" : "rgba(255,255,255,0.92)";
  const cardScale = useRef(new Animated.Value(1)).current; const {t,language}=useLanguage();
  const s = makeStyles(c);
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [camera, setCamera] = useState(false);
  const [firstName, setFirstName] = useState("there");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GamificationState | null>(null);
  const [welcomeLine,setWelcomeLine] = useState("What would you like to learn today?");
  const cameraRef = useRef<CameraView>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const splashPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [entrance]);
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(splashPulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(splashPulse, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [splashPulse]);
  const [permission, requestPermission] = useCameraPermissions();
  useEffect(() => { let active=true; loadGamification().then(value=>{if(active)setGameState(value);}).catch(()=>{}); return ()=>{active=false}; }, []);
  const level = getLevel(gameState?.totalXp || 0);
  useFocusEffect(useCallback(()=>{const lines=language==="sv"?["Redo att göra framsteg?","Lite plugg idag gör skillnad.","Dags att nå nästa nivå?","Vad vill du lära dig idag?"]:language==="ar"?["هل أنت مستعد للتقدم؟","القليل من الدراسة يصنع فرقًا.","هل نصل إلى المستوى التالي؟"]:["Ready to make progress?","A little study goes a long way.","One step closer to your next level.","What would you like to learn today?"];setWelcomeLine(lines[Math.floor(Math.random()*lines.length)]);},[language]));

  useEffect(() => {
    let active = true;
    const minimumSplash = new Promise<void>(resolve => setTimeout(resolve, 950));
    async function bootstrap() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        const user = data.session?.user;
        if (error || !user) {
          await minimumSplash;
          if (active) router.replace("/auth");
          return;
        }
        const profile = await supabase.from("profiles").select("avatar_url,display_name").eq("id", user.id).maybeSingle();
        if (!active) return;
        if (profile.data?.avatar_url) setAvatarUrl(profile.data.avatar_url);
        if (profile.data?.display_name) setFirstName(profile.data.display_name.trim().split(/\s+/)[0] || "there");
        if (!user.user_metadata?.onboarding_completed) {
          await minimumSplash;
          if (active) router.replace("/onboarding");
          return;
        }
        if (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) {
          setFirstName(user.user_metadata.full_name.trim().split(/\s+/)[0]);
        }
        await minimumSplash;
        if (active) setBooting(false);
      } catch {
        await minimumSplash;
        if (active) router.replace("/auth");
      }
    }
    bootstrap();
    return () => { active = false; };
  }, []);

  async function openImages(uris: string[]) {
    if (!uris.length) return;
    try {
      setBusy(true);
      const images: {base64:string;mimeType:string}[] = [];
      for (const uri of uris.slice(0,6)) images.push(await imageToBase64(uri));
      setPendingImages(images);
      router.push("/study");
    } catch { Alert.alert("Couldn’t read the photos", "Try clearer photos of your notes."); }
    finally { setBusy(false); }
  }
  async function openImage(uri: string) { await openImages([uri]); }
  async function library() {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) { Alert.alert("Photos permission needed", "Allow photo access to choose notes."); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes:["images"], quality:0.85, allowsMultipleSelection:true, selectionLimit:6 });
    if (!r.canceled) await openImages(r.assets.map(asset => asset.uri));
  }
  async function capture() {
    try { setBusy(true); const photo = await cameraRef.current?.takePictureAsync({ quality:0.85 }); if (photo?.uri) await openImage(photo.uri); }
    catch { Alert.alert("Couldn't capture the page", "Try again with the page centered and well lit."); }
    finally { setBusy(false); setCamera(false); }
  }
  async function cameraOpen() {
    if (!permission?.granted) { const p = await requestPermission(); if (!p.granted) return; }
    setCamera(true);
  }

  if (booting) return <SafeAreaView style={{flex:1,backgroundColor:c.bg,alignItems:"center",justifyContent:"center",paddingHorizontal:26,overflow:"hidden"}}>
    <View style={{position:"absolute",width:340,height:340,borderRadius:170,backgroundColor:c.accentSoft,top:-150,right:-135,opacity:0.8}}/>
    <View style={{position:"absolute",width:270,height:270,borderRadius:135,backgroundColor:c.accentSoft,bottom:-120,left:-120,opacity:0.65}}/>
    <View style={{width:"100%",maxWidth:350,alignItems:"center"}}>
      <Animated.View style={{transform:[{scale:splashPulse.interpolate({inputRange:[0,1],outputRange:[0.96,1.04]})}],marginBottom:22}}>
        <View style={{padding:10,borderRadius:32,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,shadowColor:c.accent,shadowOpacity:0.22,shadowRadius:28,shadowOffset:{width:0,height:10},elevation:8}}>
          <SnapStudyMark size={76}/>
        </View>
      </Animated.View>
      <Text style={{color:c.text,fontSize:25,fontWeight:"900",letterSpacing:-0.7}}>SnapStudy</Text>
      <Text style={{color:c.muted,fontSize:13,fontWeight:"600",marginTop:7,textAlign:"center"}}>Making space for your next breakthrough.</Text>
      <View style={{width:"100%",marginTop:34,padding:15,borderRadius:22,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,gap:13}}>
        <View style={{flexDirection:"row",alignItems:"center",gap:11}}>
          <View style={{width:38,height:38,borderRadius:13,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"}}><Ionicons name="sparkles" size={19} color={c.accent}/></View>
          <View style={{flex:1,gap:7}}><View style={{height:9,width:"54%",borderRadius:6,backgroundColor:c.border}}/><View style={{height:7,width:"78%",borderRadius:6,backgroundColor:c.input}}/></View>
        </View>
        <View style={{height:1,backgroundColor:c.border}}/>
        <View style={{flexDirection:"row",gap:9}}>
          {[0,1,2].map(i=><View key={i} style={{flex:1,height:47,borderRadius:12,backgroundColor:c.input,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center"}}><View style={{width:22,height:5,borderRadius:5,backgroundColor:c.border}}/><View style={{width:34,height:5,borderRadius:5,backgroundColor:c.border,marginTop:6}}/></View>)}
        </View>
      </View>
      <View style={{flexDirection:"row",alignItems:"center",gap:9,marginTop:25}}>
        <Animated.View style={{width:7,height:7,borderRadius:4,backgroundColor:c.accent,opacity:splashPulse.interpolate({inputRange:[0,1],outputRange:[0.45,1]})}}/>
        <Text style={{color:c.muted,fontSize:11,fontWeight:"800",letterSpacing:0.5}}>Preparing your study space</Text>
      </View>
    </View>
  </SafeAreaView>;

  if (camera) return <View style={s.cameraScreen}><CameraView ref={cameraRef} style={s.cameraView} facing="back" /><View style={s.cameraOverlay}><Pressable style={s.close} onPress={()=>setCamera(false)}><Text style={s.closeText}>×</Text></Pressable><Text style={s.cameraHint}>{t("cameraHint")}</Text><Pressable style={s.capture} onPress={capture} disabled={busy}><View style={s.captureRing}/></Pressable></View></View>;

  return <SafeAreaView style={s.safe}>
    <Animated.ScrollView contentContainerStyle={{paddingHorizontal:20,paddingTop:18,paddingBottom:30,gap:17}} showsVerticalScrollIndicator={false} style={{opacity:entrance,transform:[{translateY:entrance.interpolate({inputRange:[0,1],outputRange:[10,0]})}]}}>
      <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}>
        <View style={{flex:1}}>
          <View style={{flexDirection:"row",alignItems:"center",gap:7}}><SnapStudyMark size={25}/><Text style={{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:1.8}}>SNAPSTUDY</Text></View>
          <Text style={{color:c.text,fontSize:25,fontWeight:"900",letterSpacing:-0.8,marginTop:12}}>{language==="sv"?"Hej, "+firstName+" 👋":"Hey, "+firstName+" 👋"}</Text>
          <Text style={{color:c.muted,fontSize:13,marginTop:4}}>{welcomeLine}</Text>
        </View>
        <Pressable onPress={()=>router.push("/account")} style={{width:46,height:46,borderRadius:16,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{avatarUrl?<Image source={{uri:avatarUrl}} style={{width:"100%",height:"100%"}}/>:<Text style={{color:c.accent,fontSize:17,fontWeight:"900"}}>{firstName[0]?.toUpperCase()??"S"}</Text>}</Pressable>
      </View>
      <Animated.View style={{transform:[{scale:cardScale}]}}><Pressable onPressIn={()=>Animated.spring(cardScale,{toValue:0.985,useNativeDriver:true,speed:28,bounciness:4}).start()} onPressOut={()=>Animated.spring(cardScale,{toValue:1,useNativeDriver:true,speed:22,bounciness:6}).start()}><View style={{backgroundColor:glass,borderRadius:24,borderWidth:1,borderColor:glassEdge,padding:17,overflow:"hidden",shadowColor:mode==="dark"?"#000000":c.accent,shadowOpacity:mode==="dark"?0.24:0.12,shadowRadius:24,shadowOffset:{width:0,height:12},elevation:7}}>
        <BlurView intensity={mode==="dark"?38:52} tint={mode==="dark"?"dark":"light"} style={StyleSheet.absoluteFill}/>
        <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:13}}>
          <View style={{flexDirection:"row",alignItems:"center",gap:7}}><View style={{width:7,height:7,borderRadius:4,backgroundColor:c.accent}}/><Text style={{color:c.accent,fontSize:9,fontWeight:"900",letterSpacing:1.5}}>{language==="sv"?"DAGS ATT PLUGGA":"READY TO STUDY"}</Text></View>
          <Text style={{color:c.muted,fontSize:10,fontWeight:"800"}}>25 min · 1 goal</Text>
        </View>
        <Text style={{color:c.text,fontSize:22,fontWeight:"900",letterSpacing:-0.6,lineHeight:28}}>{language==="sv"?"Små steg. Stora framsteg.":"Small steps. Big progress."}</Text>
        <Text style={{color:c.muted,fontSize:12,lineHeight:18,marginTop:6,marginBottom:16}}>{language==="sv"?"Skanna dina anteckningar och gör dem till aktiv repetition.":"Turn your notes into flashcards, quizzes and focused practice."}</Text>
        <View style={{flexDirection:"row",gap:9}}>
          <Pressable onPress={cameraOpen} disabled={busy} style={{flex:1,minHeight:47,borderRadius:14,backgroundColor:c.accent,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8}}><Ionicons name="camera-outline" size={18} color={c.onAccent}/><Text style={{color:c.onAccent,fontSize:12,fontWeight:"900"}}>{busy?"Preparing…":t("scanNotes")}</Text></Pressable>
          <Pressable onPress={library} disabled={busy} style={{width:48,minHeight:47,borderRadius:14,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center"}}><Ionicons name="images-outline" size={20} color={c.accent}/></Pressable>
        </View>
      </View></Pressable></Animated.View>
      <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <Pressable onPress={()=>router.push("/focus")} style={{flex:1,flexDirection:"row",alignItems:"center",gap:10,padding:13,borderRadius:17,backgroundColor:glass,borderWidth:1,borderColor:glassEdge,shadowColor:mode==="dark"?"#000000":c.accent,shadowOpacity:0.12,shadowRadius:14,shadowOffset:{width:0,height:6},elevation:3}}>
          <View style={{width:38,height:38,borderRadius:13,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"}}><Ionicons name="timer-outline" size={20} color={c.accent}/></View>
          <View style={{flex:1}}><Text style={{color:c.text,fontSize:12,fontWeight:"900"}}>{language==="sv"?"Fokus":"Focus room"}</Text><Text style={{color:c.muted,fontSize:10,fontWeight:"700",marginTop:3}}>Pomodoro · 25 min</Text></View><Ionicons name="chevron-forward" size={15} color={c.muted}/>
        </Pressable>
        <Pressable onPress={()=>router.push("/history")} style={{flex:1,flexDirection:"row",alignItems:"center",gap:10,padding:13,borderRadius:17,backgroundColor:c.surface,borderWidth:1,borderColor:c.border}}>
          <View style={{width:38,height:38,borderRadius:13,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"}}><Ionicons name="albums-outline" size={20} color={c.accent}/></View>
          <View style={{flex:1}}><Text style={{color:c.text,fontSize:12,fontWeight:"900"}}>{language==="sv"?"Studie-set":"Study sets"}</Text><Text style={{color:c.muted,fontSize:10,fontWeight:"700",marginTop:3}}>{language==="sv"?"Repetera":"Keep learning"}</Text></View><Ionicons name="chevron-forward" size={15} color={c.muted}/>
        </Pressable>
      </View>
      <Pressable onPress={()=>router.push("/progress")} style={{borderRadius:20,backgroundColor:glass,borderWidth:1,borderColor:glassEdge,padding:15,shadowColor:c.accent,shadowOpacity:0.12,shadowRadius:18,shadowOffset:{width:0,height:7},elevation:4}}>
        <View style={{flexDirection:"row",alignItems:"center",gap:12}}>
          <View style={{width:44,height:44,borderRadius:15,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"}}><Text style={{color:c.onAccent,fontSize:17,fontWeight:"900"}}>{level.level}</Text></View>
          <View style={{flex:1}}>
            <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}}><Text style={{color:c.text,fontSize:13,fontWeight:"900"}}>{language==="sv"?"Din nivå":"Your level"}</Text><Text style={{color:c.accent,fontSize:11,fontWeight:"900"}}>{(gameState?.totalXp||0).toLocaleString()} XP</Text></View>
            <View style={{height:7,borderRadius:8,backgroundColor:c.border,overflow:"hidden",marginTop:9}}><View style={{height:"100%",width:(level.progress*100)+"%",backgroundColor:c.accent,borderRadius:8}}/></View>
            <Text style={{color:c.muted,fontSize:10,fontWeight:"700",marginTop:6}}>{Math.max(0,level.nextXp-(gameState?.totalXp||0))} XP to level {level.level+1} · {language==="sv"?"Visa uppdrag":"View quests"} →</Text>
          </View>
        </View>
      </Pressable>
      <StudyDashboard />
      <Pressable onPress={()=>router.push("/plus")} style={{borderRadius:18,borderWidth:1,borderColor:c.border,backgroundColor:glass,flexDirection:"row",alignItems:"center",gap:11,padding:13,shadowColor:c.accent,shadowOpacity:0.1,shadowRadius:15,shadowOffset:{width:0,height:6},elevation:3}}>
        <LinearGradient colors={[c.accent,c.accent+"B8"]} style={{width:39,height:39,borderRadius:13,alignItems:"center",justifyContent:"center"}}><Ionicons name="sparkles" size={19} color="#FFFFFF"/></LinearGradient>
        <View style={{flex:1}}><Text style={{color:c.accent,fontSize:9,fontWeight:"900",letterSpacing:1.3}}>SNAPSTUDY PLUS</Text><Text style={{color:c.text,fontSize:12,fontWeight:"900",marginTop:3}}>{language==="sv"?"Mer fokus. Mer framsteg.":"Make every study session count."}</Text></View><Ionicons name="chevron-forward" size={17} color={c.accent}/>
      </Pressable>
      <AdBanner />
    </Animated.ScrollView><BottomNav/>
  </SafeAreaView>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe:{flex:1,backgroundColor:c.bg},container:{paddingHorizontal:20,paddingTop:42,paddingBottom:30},center:{flex:1,alignItems:"center",justifyContent:"center",gap:10},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:24},brandRow:{flexDirection:"row",alignItems:"center",gap:8},brandMark:{width:27,height:27,borderRadius:9,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},eyebrow:{color:c.muted,fontSize:11,fontWeight:"900",letterSpacing:2.2},title:{color:c.text,fontSize:35,fontWeight:"900",letterSpacing:-1.6,marginTop:5},sub:{color:c.muted,fontSize:13,marginTop:6},avatar:{width:45,height:45,borderRadius:16,backgroundColor:c.accent,alignItems:"center",justifyContent:"center",overflow:"hidden"},avatarImage:{width:"100%",height:"100%"},avatarText:{color:c.onAccent,fontSize:17,fontWeight:"900"},
  hero:{borderWidth:1,borderColor:c.border,borderRadius:22,padding:20,marginBottom:24,backgroundColor:c.surface},heroIconBox:{width:48,height:48,borderRadius:15,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:18},heroTitle:{color:c.text,fontSize:23,fontWeight:"800",lineHeight:29,letterSpacing:-0.5},heroSub:{color:c.muted,fontSize:14,lineHeight:21,marginTop:8,marginBottom:20},primary:{minHeight:49,borderRadius:14,backgroundColor:c.text,flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center"},primaryText:{color:c.bg,fontSize:14,fontWeight:"800"},secondary:{minHeight:45,borderRadius:14,borderWidth:1,borderColor:c.border,backgroundColor:"transparent",flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center",marginTop:9},secondaryText:{color:c.text,fontSize:13,fontWeight:"700"},
  quickActions:{flexDirection:"row",gap:12,marginTop:2,marginBottom:22},quickAction:{flex:1,minHeight:112,padding:15,borderRadius:18,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},quickIconBox:{width:38,height:38,borderRadius:13,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:10},quickTitle:{color:c.text,fontSize:13,fontWeight:"900"},quickDesc:{color:c.muted,fontSize:11,lineHeight:16,marginTop:5},sectionRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:11},section:{color:c.text,fontSize:16,fontWeight:"900"},sectionHint:{color:c.subtle,fontSize:11,fontWeight:"800"},grid:{flexDirection:"row",flexWrap:"wrap",gap:9},card:{width:"48.5%",minHeight:122,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:14},cardIcon:{width:31,height:31,borderRadius:10,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:12},icon:{color:c.accent,fontSize:15,fontWeight:"900"},cardTitle:{color:c.text,fontSize:13,fontWeight:"900"},cardDesc:{color:c.muted,fontSize:11,marginTop:4},
plusCard:{marginBottom:20,borderRadius:20,padding:17,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.accent},plusTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},plusBadge:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:1.8},plusArrow:{color:c.accent,fontSize:18,fontWeight:"900"},plusTitle:{color:c.text,fontSize:18,fontWeight:"900",marginTop:9},plusText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:5},plusLink:{color:c.accent,fontSize:12,fontWeight:"900",marginTop:12},creditsCard:{marginTop:2,marginBottom:12,padding:15,borderRadius:18,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,flexDirection:"row",alignItems:"center",gap:12},creditsIcon:{width:43,height:43,borderRadius:14,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},creditsTitle:{color:c.text,fontSize:13,fontWeight:"900"},creditsSub:{color:c.muted,fontSize:11,lineHeight:16,marginTop:4},tip:{marginTop:18,flexDirection:"row",gap:11,borderRadius:17,padding:15,backgroundColor:c.input,borderWidth:1,borderColor:c.border},tipDot:{width:8,height:8,borderRadius:4,backgroundColor:c.accent,marginTop:4},tipTitle:{color:c.text,fontWeight:"800",fontSize:12},tipText:{color:c.muted,fontSize:11,lineHeight:17,marginTop:3},accountLink:{alignItems:"center",paddingVertical:20},accountLinkText:{color:c.accent,fontSize:12,fontWeight:"800"},muted:{color:c.muted,fontSize:12},
  cameraScreen:{flex:1,backgroundColor:c.bg},cameraView:{flex:1},cameraOverlay:{...StyleSheet.absoluteFillObject,justifyContent:"space-between",alignItems:"center",paddingTop:60,paddingBottom:45},close:{position:"absolute",top:50,left:20,width:44,height:44,borderRadius:22,backgroundColor:"#0008",alignItems:"center",justifyContent:"center"},closeText:{color:c.onAccent,fontSize:32,lineHeight:36},cameraHint:{color:c.onAccent,backgroundColor:"#0008",paddingHorizontal:16,paddingVertical:9,borderRadius:20,overflow:"hidden",fontWeight:"700"},capture:{width:76,height:76,borderRadius:38,borderWidth:5,borderColor:c.onAccent,alignItems:"center",justifyContent:"center"},captureRing:{width:58,height:58,borderRadius:29,backgroundColor:c.onAccent}
});