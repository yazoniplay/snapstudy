import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Alert, Animated, Easing, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { imageToBase64, setPendingImage, setPendingImages } from "../lib/image";
import BottomNav from "../components/BottomNav";
import StudyDashboard from "../components/StudyDashboard";
import { supabase } from "../lib/supabase";

import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
export default function Home() {
  const { colors:c, setMode } = useTheme(); const {t,language}=useLanguage();
  const s = makeStyles(c);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [firstName, setFirstName] = useState("there");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hearts, setHearts] = useState(5);
  const [stamina, setStamina] = useState(100);
  const cameraRef = useRef<CameraView>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(sparkle, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(sparkle, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [entrance, sparkle]);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => { let active = true; const day = new Date().toISOString().slice(0,10); AsyncStorage.getItem("snapstudy:energy:v1").then(raw => { if (!active) return; const saved = raw ? JSON.parse(raw) : null; if (saved?.day === day) { setHearts(typeof saved.hearts === "number" ? saved.hearts : 5); setStamina(typeof saved.stamina === "number" ? saved.stamina : 100); } else { const fresh = { day, hearts: 5, stamina: 100 }; setHearts(5); setStamina(100); AsyncStorage.setItem("snapstudy:energy:v1", JSON.stringify(fresh)).catch(()=>{}); } }).catch(()=>{}); return () => { active = false; }; }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      const user = data.session?.user;
      if (user) { const profile = await supabase.from("profiles").select("avatar_url,display_name").eq("id",user.id).maybeSingle(); if (profile.data?.avatar_url) setAvatarUrl(profile.data.avatar_url); if (profile.data?.display_name) setFirstName(profile.data.display_name.trim().split(/\s+/)[0] || "there"); }
      if (error || !user) router.replace("/auth");
      else if (!user.user_metadata?.onboarding_completed) router.replace("/onboarding");
      else if (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) setFirstName(user.user_metadata.full_name.trim().split(/\s+/)[0]);
      else if (user.user_metadata?.theme === "light" || user.user_metadata?.theme === "dark") setMode(user.user_metadata.theme);
    }).catch(() => { if (active) router.replace("/auth"); });
    return () => { active = false; };
  }, []);

  async function openImages(uris: string[]) {
    if (!uris.length) return;
    try {
      setBusy(true);
      const images: {base64:string;mimeType:string}[] = [];
      for (const uri of uris.slice(0,6)) images.push(await imageToBase64(uri));
      setPendingImages(images);
      const day = new Date().toISOString().slice(0,10);
      const next = { day, hearts, stamina: Math.max(0, stamina - 10) };
      setStamina(next.stamina);
      await AsyncStorage.setItem("snapstudy:energy:v1", JSON.stringify(next));
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

  if (camera) return <View style={s.cameraScreen}><CameraView ref={cameraRef} style={s.cameraView} facing="back" /><View style={s.cameraOverlay}><Pressable style={s.close} onPress={()=>setCamera(false)}><Text style={s.closeText}>×</Text></Pressable><Text style={s.cameraHint}>{t("cameraHint")}</Text><Pressable style={s.capture} onPress={capture} disabled={busy}><View style={s.captureRing}/></Pressable></View></View>;

  return <SafeAreaView style={s.safe}>
    <Animated.ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false} style={{opacity:entrance, transform:[{translateY:entrance.interpolate({inputRange:[0,1],outputRange:[18,0]})}]}}>
      <View style={s.header}><View><View style={s.brandRow}><View style={s.brandMark}><Ionicons name="sparkles" size={16} color="#FFFFFF"/></View><Text style={s.eyebrow}>SNAPSTUDY</Text></View><Text style={s.title}>{t("studySmarter")}</Text><Text style={s.sub}>{language==="sv"?"Hej":language==="ar"?"مرحبًا":"Hey"} {firstName} — {t("ready").toLowerCase()}</Text></View><Pressable style={s.avatar} onPress={()=>router.push("/account")}>{avatarUrl ? <Image source={{uri:avatarUrl}} style={s.avatarImage}/> : <Text style={s.avatarText}>{firstName[0]?.toUpperCase() ?? "S"}</Text>}</Pressable></View>

      <View style={s.energyCard}><View style={s.energyTop}><View style={s.energyLabel}><Ionicons name="heart" size={17} color="#F06A9B"/><Text style={s.energyTitle}>HEARTS</Text></View><View style={s.heartsRow}>{Array.from({length:5},(_,i)=><Ionicons key={i} name={i<hearts?"heart":"heart-outline"} size={17} color={i<hearts?"#F06A9B":c.subtle}/>)}</View></View><View style={s.energyDivider}/><View style={s.energyTop}><View style={s.energyLabel}><Ionicons name="flash" size={17} color="#9B7BFF"/><Text style={s.energyTitle}>STAMINA</Text></View><Text style={s.energyValue}>{stamina}%</Text></View><View style={s.staminaTrack}><View style={[s.staminaFill,{width:stamina+"%"}]}/></View><Text style={s.energyHint}>Your study energy refreshes daily ✨</Text></View>

      <LinearGradient colors={["#6D4AFF","#9B5DE5","#E879C7"]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.hero}><View style={s.heroTop}><Animated.View style={[s.spark,{transform:[{scale:sparkle.interpolate({inputRange:[0,1],outputRange:[1,1.1]})},{rotate:sparkle.interpolate({inputRange:[0,1],outputRange:["0deg","12deg"]})}]}]}><Text style={s.sparkText}>✦</Text></Animated.View><View style={s.aiBadge}><Text style={s.aiText}>AI READY</Text></View></View><Text style={s.heroTitle}>{t("turnNotes")}</Text><Text style={s.heroSub}>{t("scanSub")}</Text><Pressable style={s.primary} onPress={cameraOpen} disabled={busy}><Text style={s.primaryText}>{busy ? (language==="sv"?"Förbereder…":language==="ar"?"جارٍ التحضير…":"Preparing…") : t("scanNotes")}</Text></Pressable><Pressable style={s.secondary} onPress={library} disabled={busy}><Text style={s.secondaryText}>{t("choosePhotos")}</Text></Pressable></LinearGradient>

      <StudyDashboard />

      <View style={s.quickActions}><Pressable style={s.quickAction} onPress={()=>router.push("/weak-topics")}><View style={s.quickIconBox}><Ionicons name="analytics-outline" size={21} color={c.accent}/></View><Text style={s.quickTitle}>{t("weakTopics")}</Text><Text style={s.quickDesc}>{t("weakTopicsSub")}</Text></Pressable><Pressable style={s.quickAction} onPress={()=>router.push("/planner")}><View style={s.quickIconBox}><Ionicons name="calendar-outline" size={21} color={c.accent}/></View><Text style={s.quickTitle}>{t("examPlanner")}</Text><Text style={s.quickDesc}>{t("examPlannerSub")}</Text></Pressable></View>

      <View style={s.tip}><View style={s.tipDot}/><View style={{flex:1}}><Text style={s.tipTitle}>{t("betterScans")}</Text><Text style={s.tipText}>{t("scanTip")}</Text></View></View>
      <Pressable style={s.accountLink} onPress={()=>router.push("/account")}><Text style={s.accountLinkText}>{t("settings")}</Text></Pressable>
    </Animated.ScrollView>
    <BottomNav />
  </SafeAreaView>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe:{flex:1,backgroundColor:c.bg},container:{paddingHorizontal:18,paddingTop:16,paddingBottom:18},center:{flex:1,alignItems:"center",justifyContent:"center",gap:10},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18},brandRow:{flexDirection:"row",alignItems:"center",gap:8},brandMark:{width:27,height:27,borderRadius:9,backgroundColor:"#8B6CF6",alignItems:"center",justifyContent:"center"},eyebrow:{color:c.muted,fontSize:11,fontWeight:"900",letterSpacing:2.2},title:{color:c.text,fontSize:35,fontWeight:"900",letterSpacing:-1.6,marginTop:5},sub:{color:c.muted,fontSize:13,marginTop:6},avatar:{width:45,height:45,borderRadius:16,backgroundColor:c.accent,alignItems:"center",justifyContent:"center",overflow:"hidden"},avatarImage:{width:"100%",height:"100%"},avatarText:{color:c.onAccent,fontSize:17,fontWeight:"900"},
  energyCard:{borderRadius:22,padding:15,marginBottom:16,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},energyTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},energyLabel:{flexDirection:"row",alignItems:"center",gap:7},energyTitle:{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:1.3},heartsRow:{flexDirection:"row",gap:4},energyDivider:{height:1,backgroundColor:c.border,marginVertical:12},energyValue:{color:c.text,fontSize:12,fontWeight:"900"},staminaTrack:{height:7,borderRadius:99,backgroundColor:c.border,overflow:"hidden",marginTop:9},staminaFill:{height:"100%",borderRadius:99,backgroundColor:"#9B7BFF"},energyHint:{color:c.subtle,fontSize:10,marginTop:8},hero:{borderWidth:1,borderColor:"rgba(255,255,255,0.38)",borderRadius:26,padding:19,marginBottom:18,overflow:"hidden"},heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:16},spark:{width:47,height:47,borderRadius:15,backgroundColor:"rgba(255,255,255,0.2)",borderWidth:1,borderColor:"rgba(255,255,255,0.28)",alignItems:"center",justifyContent:"center"},sparkText:{color:"#FFFFFF",fontSize:22},aiBadge:{borderWidth:1,borderColor:"rgba(255,255,255,0.4)",backgroundColor:"rgba(255,255,255,0.14)",paddingHorizontal:9,paddingVertical:6,borderRadius:999},aiText:{color:"#FFFFFF",fontSize:9,fontWeight:"900",letterSpacing:1},heroTitle:{color:"#FFFFFF",fontSize:22,fontWeight:"900",lineHeight:27},heroSub:{color:"rgba(255,255,255,0.84)",fontSize:13,lineHeight:20,marginTop:7,marginBottom:18},primary:{height:49,borderRadius:15,backgroundColor:"#FFFFFF",alignItems:"center",justifyContent:"center"},primaryText:{color:"#7044D8",fontSize:14,fontWeight:"900"},secondary:{height:46,borderRadius:15,borderWidth:1,borderColor:"rgba(255,255,255,0.48)",backgroundColor:"rgba(255,255,255,0.13)",alignItems:"center",justifyContent:"center",marginTop:9},secondaryText:{color:"#FFFFFF",fontSize:13,fontWeight:"800"},
  quickActions:{flexDirection:"row",gap:10,marginBottom:16},quickAction:{flex:1,minHeight:104,padding:13,borderRadius:16,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},quickIconBox:{width:38,height:38,borderRadius:13,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:10},quickTitle:{color:c.text,fontSize:13,fontWeight:"900"},quickDesc:{color:c.muted,fontSize:11,lineHeight:16,marginTop:5},sectionRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:11},section:{color:c.text,fontSize:16,fontWeight:"900"},sectionHint:{color:c.subtle,fontSize:11,fontWeight:"800"},grid:{flexDirection:"row",flexWrap:"wrap",gap:9},card:{width:"48.5%",minHeight:122,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:14},cardIcon:{width:31,height:31,borderRadius:10,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:12},icon:{color:c.accent,fontSize:15,fontWeight:"900"},cardTitle:{color:c.text,fontSize:13,fontWeight:"900"},cardDesc:{color:c.muted,fontSize:11,marginTop:4},
plusCard:{marginBottom:20,borderRadius:20,padding:17,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.accent},plusTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},plusBadge:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:1.8},plusArrow:{color:c.accent,fontSize:18,fontWeight:"900"},plusTitle:{color:c.text,fontSize:18,fontWeight:"900",marginTop:9},plusText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:5},plusLink:{color:c.accent,fontSize:12,fontWeight:"900",marginTop:12},tip:{marginTop:12,flexDirection:"row",gap:11,borderRadius:17,padding:15,backgroundColor:c.input,borderWidth:1,borderColor:c.border},tipDot:{width:8,height:8,borderRadius:4,backgroundColor:c.accent,marginTop:4},tipTitle:{color:c.text,fontWeight:"800",fontSize:12},tipText:{color:c.muted,fontSize:11,lineHeight:17,marginTop:3},accountLink:{alignItems:"center",paddingVertical:20},accountLinkText:{color:c.accent,fontSize:12,fontWeight:"800"},muted:{color:c.muted,fontSize:12},
  cameraScreen:{flex:1,backgroundColor:c.bg},cameraView:{flex:1},cameraOverlay:{...StyleSheet.absoluteFillObject,justifyContent:"space-between",alignItems:"center",paddingTop:60,paddingBottom:45},close:{position:"absolute",top:50,left:20,width:44,height:44,borderRadius:22,backgroundColor:"#0008",alignItems:"center",justifyContent:"center"},closeText:{color:c.onAccent,fontSize:32,lineHeight:36},cameraHint:{color:c.onAccent,backgroundColor:"#0008",paddingHorizontal:16,paddingVertical:9,borderRadius:20,overflow:"hidden",fontWeight:"700"},capture:{width:76,height:76,borderRadius:38,borderWidth:5,borderColor:c.onAccent,alignItems:"center",justifyContent:"center"},captureRing:{width:58,height:58,borderRadius:29,backgroundColor:c.onAccent}
});