import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../components/LocalizedText";
import { useEffect, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Animated, Image, Modal, Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { imageToBase64, setPendingImages } from "../lib/image";
import SnapStudyHomeDashboard from "../components/SnapStudyHomeDashboard";
import LoadingScreen from "../components/LoadingScreen";
import { getLevel, loadGamification, type GamificationState } from "../lib/gamification";
import { supabase } from "../lib/supabase";

import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
export default function Home() {
  const { colors:c } = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const desktopLayout = viewportWidth >= 1100;
  const {t,language}=useLanguage();
  const s = makeStyles(c);
  const [busy, setBusy] = useState(false);
  const [pastedNotes,setPastedNotes]=useState("");
  const [notesModal,setNotesModal]=useState(false);
  const [booting, setBooting] = useState(true);
  const [camera, setCamera] = useState(false);
  const [firstName, setFirstName] = useState("there");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GamificationState | null>(null);
  const [welcomeLine,setWelcomeLine] = useState("What would you like to learn today?");
  const cameraRef = useRef<CameraView>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [entrance]);
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

  async function makeStudyFromText(){
    const notes=pastedNotes.trim();
    if(notes.length<20){Alert.alert(language==="sv"?"Lägg till anteckningar":"Add your notes",language==="sv"?"Klistra in några rader först.":"Paste at least a few lines first.");return;}
    try{setBusy(true);const storage=await import("@react-native-async-storage/async-storage");await storage.default.setItem("snapstudy:pending-notes",notes);setNotesModal(false);router.push("/study?notes=1");}
    catch{Alert.alert("Couldn’t save notes","Please try again.");}
    finally{setBusy(false);}
  }

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

  if (booting) return <LoadingScreen />;

  if (camera) return <View style={s.cameraScreen}><CameraView ref={cameraRef} style={s.cameraView} facing="back" /><View style={s.cameraOverlay}><Pressable style={s.close} onPress={()=>setCamera(false)}><Text style={s.closeText}>×</Text></Pressable><Text style={s.cameraHint}>{t("cameraHint")}</Text><Pressable style={s.capture} onPress={capture} disabled={busy}><View style={s.captureRing}/></Pressable></View></View>;

  return <SafeAreaView style={s.safe}>
    <Animated.ScrollView contentContainerStyle={{paddingHorizontal:desktopLayout?36:24,paddingTop:24,paddingBottom:34,gap:18,width:"100%",maxWidth:desktopLayout?1280:940,alignSelf:"center"}} showsVerticalScrollIndicator={false} style={{opacity:entrance,transform:[{translateY:entrance.interpolate({inputRange:[0,1],outputRange:[10,0]})}]}}>
      <SnapStudyHomeDashboard name={firstName} avatarUrl={avatarUrl} welcomeLine={welcomeLine} gameState={gameState} onScan={cameraOpen} onNotes={()=>setNotesModal(true)} busy={busy} />

    </Animated.ScrollView>    <Modal visible={notesModal} transparent animationType="fade" onRequestClose={()=>setNotesModal(false)}>
      <View style={{flex:1,backgroundColor:"rgba(5,8,18,0.72)",justifyContent:"center",padding:22}}>
        <View style={{backgroundColor:c.surface,borderColor:c.border,borderWidth:1,borderRadius:24,padding:20,gap:13}}>
          <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}><Text style={{color:c.text,fontSize:19,fontWeight:"900"}}>{language==="sv"?"Skapa med text":"Create from text"}</Text><Pressable onPress={()=>setNotesModal(false)}><Ionicons name="close" size={24} color={c.muted}/></Pressable></View>
          <Text style={{color:c.muted,fontSize:12}}>{language==="sv"?"Klistra in dina anteckningar så skapar SnapStudy ett studiepaket.":"Paste your notes and SnapStudy will turn them into a study set."}</Text>
          <TextInput value={pastedNotes} onChangeText={setPastedNotes} multiline textAlignVertical="top" placeholder={language==="sv"?"Klistra in anteckningar här…":"Paste notes here…"} placeholderTextColor={c.subtle} style={{minHeight:150,maxHeight:260,padding:14,borderRadius:15,borderWidth:1,borderColor:c.border,backgroundColor:c.input,color:c.text,fontSize:13,lineHeight:20}}/>
          <Pressable onPress={makeStudyFromText} disabled={busy||pastedNotes.trim().length<20} style={{minHeight:48,borderRadius:14,backgroundColor:pastedNotes.trim().length>=20?c.accent:c.border,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:8}}><Ionicons name="sparkles" size={17} color={pastedNotes.trim().length>=20?c.onAccent:c.muted}/><Text style={{color:pastedNotes.trim().length>=20?c.onAccent:c.muted,fontSize:12,fontWeight:"900"}}>{busy?(language==="sv"?"Förbereder…":"Preparing…"):(language==="sv"?"Skapa studiepaket":"Create study set")}</Text></Pressable>
        </View>
      </View>
    </Modal>

  </SafeAreaView>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe:{flex:1,backgroundColor:c.bg},container:{paddingHorizontal:20,paddingTop:42,paddingBottom:30},center:{flex:1,alignItems:"center",justifyContent:"center",gap:10},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:24},brandRow:{flexDirection:"row",alignItems:"center",gap:8},brandMark:{width:27,height:27,borderRadius:9,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},eyebrow:{color:c.muted,fontSize:11,fontWeight:"900",letterSpacing:2.2},title:{color:c.text,fontSize:35,fontWeight:"900",letterSpacing:-1.6,marginTop:5},sub:{color:c.muted,fontSize:13,marginTop:6},avatar:{width:45,height:45,borderRadius:16,backgroundColor:c.accent,alignItems:"center",justifyContent:"center",overflow:"hidden"},avatarImage:{width:"100%",height:"100%"},avatarText:{color:c.onAccent,fontSize:17,fontWeight:"900"},
  hero:{borderWidth:1,borderColor:c.border,borderRadius:22,padding:20,marginBottom:24,backgroundColor:c.surface},heroIconBox:{width:48,height:48,borderRadius:15,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:18},heroTitle:{color:c.text,fontSize:23,fontWeight:"800",lineHeight:29,letterSpacing:-0.5},heroSub:{color:c.muted,fontSize:14,lineHeight:21,marginTop:8,marginBottom:20},primary:{minHeight:49,borderRadius:14,backgroundColor:c.text,flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center"},primaryText:{color:c.bg,fontSize:14,fontWeight:"800"},secondary:{minHeight:45,borderRadius:14,borderWidth:1,borderColor:c.border,backgroundColor:"transparent",flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center",marginTop:9},secondaryText:{color:c.text,fontSize:13,fontWeight:"700"},
  quickActions:{flexDirection:"row",gap:12,marginTop:2,marginBottom:22},quickAction:{flex:1,minHeight:112,padding:15,borderRadius:18,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},quickIconBox:{width:38,height:38,borderRadius:13,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:10},quickTitle:{color:c.text,fontSize:13,fontWeight:"900"},quickDesc:{color:c.muted,fontSize:11,lineHeight:16,marginTop:5},sectionRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:11},section:{color:c.text,fontSize:16,fontWeight:"900"},sectionHint:{color:c.subtle,fontSize:11,fontWeight:"800"},grid:{flexDirection:"row",flexWrap:"wrap",gap:9},card:{width:"48.5%",minHeight:122,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:14},cardIcon:{width:31,height:31,borderRadius:10,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:12},icon:{color:c.accent,fontSize:15,fontWeight:"900"},cardTitle:{color:c.text,fontSize:13,fontWeight:"900"},cardDesc:{color:c.muted,fontSize:11,marginTop:4},
plusCard:{marginBottom:20,borderRadius:20,padding:17,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.accent},plusTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},plusBadge:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:1.8},plusArrow:{color:c.accent,fontSize:18,fontWeight:"900"},plusTitle:{color:c.text,fontSize:18,fontWeight:"900",marginTop:9},plusText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:5},plusLink:{color:c.accent,fontSize:12,fontWeight:"900",marginTop:12},creditsCard:{marginTop:2,marginBottom:12,padding:15,borderRadius:18,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,flexDirection:"row",alignItems:"center",gap:12},creditsIcon:{width:43,height:43,borderRadius:14,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},creditsTitle:{color:c.text,fontSize:13,fontWeight:"900"},creditsSub:{color:c.muted,fontSize:11,lineHeight:16,marginTop:4},tip:{marginTop:18,flexDirection:"row",gap:11,borderRadius:17,padding:15,backgroundColor:c.input,borderWidth:1,borderColor:c.border},tipDot:{width:8,height:8,borderRadius:4,backgroundColor:c.accent,marginTop:4},tipTitle:{color:c.text,fontWeight:"800",fontSize:12},tipText:{color:c.muted,fontSize:11,lineHeight:17,marginTop:3},accountLink:{alignItems:"center",paddingVertical:20},accountLinkText:{color:c.accent,fontSize:12,fontWeight:"800"},muted:{color:c.muted,fontSize:12},
  cameraScreen:{flex:1,backgroundColor:c.bg},cameraView:{flex:1},cameraOverlay:{...StyleSheet.absoluteFillObject,justifyContent:"space-between",alignItems:"center",paddingTop:60,paddingBottom:45},close:{position:"absolute",top:50,left:20,width:44,height:44,borderRadius:22,backgroundColor:"#0008",alignItems:"center",justifyContent:"center"},closeText:{color:c.onAccent,fontSize:32,lineHeight:36},cameraHint:{color:c.onAccent,backgroundColor:"#0008",paddingHorizontal:16,paddingVertical:9,borderRadius:20,overflow:"hidden",fontWeight:"700"},capture:{width:76,height:76,borderRadius:38,borderWidth:5,borderColor:c.onAccent,alignItems:"center",justifyContent:"center"},captureRing:{width:58,height:58,borderRadius:29,backgroundColor:c.onAccent}
});