import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { imageToBase64, setPendingImage } from "../lib/image";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [recent, setRecent] = useState<Array<{id:string;title:string;subject:string|null;created_at:string}>>([]);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user) router.replace("/auth");
      else {
        setEmail(data.user.email ?? "");
        const { data: sessions } = await supabase.from("study_sessions").select("id,title,subject,created_at").order("created_at", { ascending: false }).limit(5);
        if (sessions) setRecent(sessions);
      }
      setCheckingAuth(false);
    });
    return () => { mounted = false; };
  }, []);

  async function openImage(uri: string) {
    try {
      setBusy(true);
      const image = await imageToBase64(uri);
      setPendingImage(image.base64, image.mimeType);
      router.push("/study");
    } catch {
      Alert.alert("Couldn't read the photo", "Try a clearer photo of your notes.");
    } finally {
      setBusy(false);
    }
  }

  async function library() {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) {
      Alert.alert("Photos permission needed", "Allow photo access to choose notes.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true });
    if (!r.canceled) await openImage(r.assets[0].uri);
  }

  async function capture() {
    try {
      setBusy(true);
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) await openImage(photo.uri);
    } catch {
      Alert.alert("Couldn't capture the page", "Try again with the page centered and well lit.");
    } finally {
      setBusy(false);
      setCamera(false);
    }
  }

  async function cameraOpen() {
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) return;
    }
    setCamera(true);
  }

  if (checkingAuth) {
    return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color="#A78BFA" /><Text style={s.muted}>Loading SnapStudy…</Text></View></SafeAreaView>;
  }

  if (camera) {
    return (
      <View style={s.cameraScreen}>
        <CameraView ref={cameraRef} style={s.cameraView} facing="back" />
        <View style={s.cameraOverlay}>
          <Pressable style={s.close} onPress={() => setCamera(false)}><Text style={s.closeText}>×</Text></Pressable>
          <Text style={s.cameraHint}>Frame your notes</Text>
          <Pressable style={s.capture} onPress={capture} disabled={busy}><View style={s.captureRing} /></Pressable>
        </View>
      </View>
    );
  }

  const firstName = email.split("@")[0] || "there";
  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>SNAPSTUDY</Text>
            <Text style={s.title}>Study smarter.</Text>
            <Text style={s.sub}>Hey {firstName} — ready to learn?</Text>
          </View>
          <Pressable style={s.avatar} onPress={() => router.push("/account")}><Text style={s.avatarText}>{firstName[0]?.toUpperCase() ?? "S"}</Text></Pressable>
        </View>

        <View style={s.hero}>
          <View style={s.heroTop}>
            <View style={s.spark}><Text style={s.sparkText}>✦</Text></View>
            <View style={s.aiBadge}><Text style={s.aiText}>AI READY</Text></View>
          </View>
          <Text style={s.heroTitle}>Turn notes into a study session</Text>
          <Text style={s.heroSub}>Snap a page and get a summary, flashcards, quiz and practice test in seconds.</Text>
          <Pressable style={s.primary} onPress={cameraOpen} disabled={busy}><Text style={s.primaryText}>{busy ? "Preparing…" : "📷  Scan notes"}</Text></Pressable>
          <Pressable style={s.secondary} onPress={library} disabled={busy}><Text style={s.secondaryText}>Choose from photos</Text></Pressable>
        </View>

        <View style={s.sectionRow}><Text style={s.section}>Your toolkit</Text><Text style={s.sectionHint}>4 modes</Text></View>
        <View style={s.grid}>
          {[["◉","Flashcards","Recall faster"],["✓","Smart quiz","Instant feedback"],["▣","Practice test","Exam mode"],["≡","Summary","Key ideas"]].map(([icon,name,desc]) => (
            <View style={s.card} key={name}>
              <View style={s.cardIcon}><Text style={s.icon}>{icon}</Text></View>
              <Text style={s.cardTitle}>{name}</Text>
              <Text style={s.cardDesc}>{desc}</Text>
            </View>
          ))}
        </View>

        {recent.length > 0 && <View style={s.recentBox}>
          <View style={s.sectionRow}><Text style={s.section}>Recent sessions</Text><Pressable onPress={() => router.push("/history")}><Text style={s.sectionHint}>View all →</Text></Pressable></View>
          {recent.map(item => <Pressable key={item.id} style={s.recentRow} onPress={() => router.push({pathname:"/study",params:{id:item.id}})}><View style={s.recentIcon}><Text style={s.icon}>↗</Text></View><View style={{flex:1}}><Text style={s.recentTitle} numberOfLines={1}>{item.title}</Text><Text style={s.recentMeta}>{item.subject || "Study"} · {formatDate(item.created_at)}</Text></View></View>)}
        </View>}

        <View style={s.tip}>
          <View style={s.tipDot} />
          <View style={{flex:1}}><Text style={s.tipTitle}>Better scans = better answers</Text><Text style={s.tipText}>Use good lighting and keep the whole page inside the frame.</Text></View>
        </View>

        <Pressable style={s.accountLink} onPress={() => router.push("/account")}><Text style={s.accountLinkText}>Account & settings  →</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#070A12"},container:{padding:20,paddingTop:22,paddingBottom:45},center:{flex:1,alignItems:"center",justifyContent:"center",gap:10},
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:24},eyebrow:{color:"#8F89A0",fontSize:11,fontWeight:"900",letterSpacing:2.2},title:{color:"#F7F5FF",fontSize:35,fontWeight:"900",letterSpacing:-1.6,marginTop:5},sub:{color:"#9691A4",fontSize:13,marginTop:6},
  avatar:{width:45,height:45,borderRadius:16,backgroundColor:"#8B5CF6",alignItems:"center",justifyContent:"center"},avatarText:{color:"#fff",fontSize:17,fontWeight:"900"},
  hero:{backgroundColor:"#101522",borderWidth:1,borderColor:"#242B3D",borderRadius:25,padding:19,marginBottom:25},heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:16},
  spark:{width:47,height:47,borderRadius:15,backgroundColor:"#1B1730",alignItems:"center",justifyContent:"center"},sparkText:{color:"#B49AFF",fontSize:22},aiBadge:{borderWidth:1,borderColor:"#35304C",paddingHorizontal:9,paddingVertical:6,borderRadius:999},aiText:{color:"#AFA3D2",fontSize:9,fontWeight:"900",letterSpacing:1},
  heroTitle:{color:"#F7F5FF",fontSize:22,fontWeight:"900",lineHeight:27},heroSub:{color:"#9691A4",fontSize:13,lineHeight:20,marginTop:7,marginBottom:18},
  primary:{height:49,borderRadius:14,backgroundColor:"#8B5CF6",alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontSize:14,fontWeight:"900"},secondary:{height:46,borderRadius:14,borderWidth:1,borderColor:"#353B4D",alignItems:"center",justifyContent:"center",marginTop:9},secondaryText:{color:"#F1EEFA",fontSize:13,fontWeight:"800"},
  sectionRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:11},section:{color:"#F0EDF8",fontSize:16,fontWeight:"900"},sectionHint:{color:"#716B80",fontSize:11,fontWeight:"800"},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:9},card:{width:"48.5%",minHeight:122,backgroundColor:"#0F1320",borderWidth:1,borderColor:"#242A3A",borderRadius:18,padding:14},cardIcon:{width:31,height:31,borderRadius:10,backgroundColor:"#171B29",alignItems:"center",justifyContent:"center",marginBottom:12},icon:{color:"#C6B7FF",fontSize:15,fontWeight:"900"},cardTitle:{color:"#F4F1FF",fontSize:13,fontWeight:"900"},cardDesc:{color:"#7F7A8E",fontSize:11,marginTop:4},
  recentBox:{marginTop:18,},recentRow:{flexDirection:"row",alignItems:"center",gap:11,backgroundColor:"#0F1320",borderWidth:1,borderColor:"#242A3A",borderRadius:16,padding:12,marginBottom:7},recentIcon:{width:34,height:34,borderRadius:11,backgroundColor:"#171B29",alignItems:"center",justifyContent:"center"},recentTitle:{color:"#F4F1FF",fontSize:12,fontWeight:"900"},recentMeta:{color:"#747083",fontSize:10,marginTop:3},tip:{marginTop:12,flexDirection:"row",gap:11,borderRadius:17,padding:15,backgroundColor:"#0B0E17",borderWidth:1,borderColor:"#202638"},tipDot:{width:8,height:8,borderRadius:4,backgroundColor:"#8B5CF6",marginTop:4},tipTitle:{color:"#ECE9F5",fontWeight:"800",fontSize:12},tipText:{color:"#7F7A8E",fontSize:11,lineHeight:17,marginTop:3},
  accountLink:{alignItems:"center",paddingVertical:20},accountLinkText:{color:"#9E8AE0",fontSize:12,fontWeight:"800"},muted:{color:"#858096",fontSize:12},
  cameraScreen:{flex:1,backgroundColor:"#000"},cameraView:{flex:1},cameraOverlay:{...StyleSheet.absoluteFillObject,justifyContent:"space-between",alignItems:"center",paddingTop:60,paddingBottom:45},close:{position:"absolute",top:50,left:20,width:44,height:44,borderRadius:22,backgroundColor:"#0008",alignItems:"center",justifyContent:"center"},closeText:{color:"#fff",fontSize:32,lineHeight:36},cameraHint:{color:"#fff",backgroundColor:"#0008",paddingHorizontal:16,paddingVertical:9,borderRadius:20,overflow:"hidden",fontWeight:"700"},capture:{width:76,height:76,borderRadius:38,borderWidth:5,borderColor:"#fff",alignItems:"center",justifyContent:"center"},captureRing:{width:58,height:58,borderRadius:29,backgroundColor:"#fff"}
});
