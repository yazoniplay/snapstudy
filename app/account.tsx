import { useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, Switch } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import BottomNav from "../components/BottomNav";
import AdBanner from "../components/AdBanner";

import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage, type AppLanguage } from "../lib/language";
export default function Account() {
  const { colors:c, mode, setMode, accentColor, setAccentColor } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const s = makeStyles(c);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorDraft, setColorDraft] = useState(accentColor);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [handle, setHandle] = useState("");
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const colorPresets = ["#8B5CF6","#EC4899","#EF4444","#F97316","#EAB308","#22C55E","#14B8A6","#06B6D4","#3B82F6","#F8FAFC"];
  useEffect(() => { setColorDraft(accentColor); }, [accentColor]);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) {
        router.replace("/auth");
        return;
      }
      setEmail(user.email ?? "");
      setName((user.user_metadata?.full_name as string) ?? "");
      const profileResult = await supabase.from("profiles").select("username,display_name,avatar_url,leaderboard_opt_in,current_streak,longest_streak").eq("id", user.id).maybeSingle();
      if (profileResult.data) { setHandle(profileResult.data.username || ""); if (profileResult.data.display_name) setName(profileResult.data.display_name); setAvatarUrl(profileResult.data.avatar_url || null); setLeaderboardOptIn(!!profileResult.data.leaderboard_opt_in); setCurrentStreak(profileResult.data.current_streak || 0); setLongestStreak(profileResult.data.longest_streak || 0); }
      const savedAccent = user.user_metadata?.accent_color;
      if (typeof savedAccent === "string" && /^#[0-9A-Fa-f]{6}$/.test(savedAccent)) { setAccentColor(savedAccent); setColorDraft(savedAccent.toUpperCase()); }
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const cleanName = name.trim().slice(0, 60) || "Student";
    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: cleanName } });
    const { error: profileError } = await supabase.from("profiles").update({ display_name: cleanName, ...(cleanHandle.length >= 3 ? { username: cleanHandle } : {}) }).eq("id", user.id);
    setSaving(false);
    if (authError || profileError) Alert.alert(t("couldntSave"), authError?.message || profileError?.message || "Couldn't update profile.");
    else { setName(cleanName); if (cleanHandle.length >= 3) setHandle(cleanHandle); Alert.alert(t("saved"), t("profileUpdated")); }
  }

  async function chooseAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.82 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { Alert.alert(t("imageTooLarge"), t("imageSizeHelp")); return; }
    setAvatarBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("signInAgain"));
      const response = await fetch(asset.uri);
      const body = await response.arrayBuffer();
      const mime = asset.mimeType || "image/jpeg";
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg";
      const path = user.id + "/avatar-" + Date.now() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, body, { contentType: mime, upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = publicData.publicUrl;
      const { error: profileError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (profileError) throw profileError;
      setAvatarUrl(url);
      Alert.alert(t("avatarUpdated"), t("avatarSaved"));
    } catch (e: any) {
      Alert.alert(t("uploadAvatarFailed"), e?.message || t("tryDifferentImage"));
    } finally { setAvatarBusy(false); }
  }

  async function toggleLeaderboard(value: boolean) {
    setLeaderboardOptIn(value);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLeaderboardOptIn(!value); return; }
    const { error } = await supabase.from("profiles").update({ leaderboard_opt_in: value }).eq("id", user.id);
    if (error) { setLeaderboardOptIn(!value); Alert.alert(t("leaderboardUpdateFailed"), error.message); }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Couldn't sign out", error.message);
    else router.replace("/auth");
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.muted}>{t("loadingAccount")}</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        <Pressable onPress={() => router.replace("/")}><Text style={s.back}>{t("back")}</Text></Pressable>
        <Text style={s.eyebrow}>{t("accountEyebrow")}</Text>
        <Text style={s.title}>{t("profile")}</Text>
        <Text style={s.sub}>{t("manageAccount")}</Text>

        <Pressable style={s.avatarWrap} onPress={chooseAvatar} disabled={avatarBusy}><View style={s.avatar}>{avatarUrl ? <Image source={{uri:avatarUrl}} style={s.avatarImage}/> : <Text style={s.avatarText}>{(name || email)[0]?.toUpperCase() ?? "S"}</Text>}</View><Text style={s.avatarEdit}>{avatarBusy ? "Uploading…" : "Change photo ↗"}</Text></Pressable>

        <View style={s.card}>
          <Text style={s.label}>{t("name")}</Text>
          <TextInput value={name} onChangeText={setName} placeholder={t("yourName")} placeholderTextColor={c.subtle} style={s.input} />
          <Text style={s.label}>{t("usernameLabel")}</Text><TextInput value={handle} onChangeText={setHandle} placeholder="your_handle" autoCapitalize="none" autoCorrect={false} maxLength={24} placeholderTextColor={c.subtle} style={s.input} /><Text style={s.label}>{t("email")}</Text>
          <TextInput value={email} editable={false} style={[s.input, s.disabled]} />
          <Pressable style={s.primary} onPress={save} disabled={saving}>
            <Text style={s.primaryText}>{saving ? t("saving") : t("saveChanges")}</Text>
          </Pressable>
        </View>

        <View style={s.card}><Text style={s.cardTitle}>{t("streakLeaderboard")}</Text><Text style={s.cardText}>{t("leaderboardDescription")}</Text><View style={s.privacyRow}><View style={{flex:1}}><Text style={s.privacyTitle}>{leaderboardOptIn ? t("visibleLeaderboard") : t("privateProfile")}</Text><Text style={s.cardText}>{leaderboardOptIn ? t("streakVisible") : t("streakPrivate")}</Text></View><Switch value={leaderboardOptIn} onValueChange={toggleLeaderboard} trackColor={{false:c.border,true:c.accent}} thumbColor={c.surface}/></View><Pressable style={s.secondary} onPress={()=>router.push("/leaderboard")}><Text style={s.secondaryText}>{t("viewLeaderboard")}</Text></Pressable></View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t("studyStreak")}</Text>
          <View style={s.streakStats}><View style={s.streakTile}><Text style={s.streakNumber}>{currentStreak}</Text><Text style={s.cardText}>{t("currentDays")}</Text></View><View style={s.streakTile}><Text style={s.streakNumber}>{longestStreak}</Text><Text style={s.cardText}>{t("personalBest")}</Text></View></View>
          <Text style={s.cardText}>{t("streakHelp")}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>{t("language")}</Text>
          <Text style={s.cardText}>{t("languageSub")}</Text>
          <View style={s.themeRow}>
            {([["en",t("english")],["sv",t("swedish")],["ar",t("arabic")]] as [AppLanguage,string][]).map(([code,label])=><Pressable key={code} style={[s.themeButton,language===code&&s.themeButtonActive]} onPress={()=>{setLanguage(code);supabase.auth.updateUser({data:{language:code}}).catch(()=>{});}}><Text style={[s.themeButtonText,language===code&&s.themeButtonTextActive]}>{label}</Text></Pressable>)}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t("appearance")}</Text>
          <Text style={s.cardText}>{t("appearanceSub")}</Text>
          <View style={s.themeRow}>
            <Pressable style={[s.themeButton,mode==="light"&&s.themeButtonActive]} onPress={()=>{setMode("light");supabase.auth.updateUser({data:{theme:"light"}}).catch(()=>{});}}><Text style={[s.themeButtonText,mode==="light"&&s.themeButtonTextActive]}>{t("light")}</Text></Pressable>
            <Pressable style={[s.themeButton,mode==="dark"&&s.themeButtonActive]} onPress={()=>{setMode("dark");supabase.auth.updateUser({data:{theme:"dark"}}).catch(()=>{});}}><Text style={[s.themeButtonText,mode==="dark"&&s.themeButtonTextActive]}>{t("dark")}</Text></Pressable>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t("accentColor")}</Text>
          <Text style={s.cardText}>{t("accentHelp")}</Text>
          <View style={s.swatchGrid}>
            {colorPresets.map(color => <Pressable accessibilityLabel={`Use accent color ${color}`} key={color} onPress={() => { setColorDraft(color); setAccentColor(color); supabase.auth.updateUser({data:{accent_color:color}}).catch(()=>{}); }} style={[s.swatch,{backgroundColor:color},accentColor.toUpperCase()===color&&s.swatchSelected]} />)}
          </View>
          <View style={s.colorInputRow}>
            <View style={[s.colorPreview,{backgroundColor:/^#[0-9A-Fa-f]{6}$/.test(colorDraft)?colorDraft:c.accent}]} />
            <TextInput value={colorDraft} onChangeText={setColorDraft} autoCapitalize="characters" autoCorrect={false} maxLength={7} placeholder="#8B5CF6" placeholderTextColor={c.subtle} style={s.colorInput} />
          </View>
          <Pressable style={[s.primary,{opacity:/^#[0-9A-Fa-f]{6}$/.test(colorDraft)?1:0.45}]} disabled={!/^#[0-9A-Fa-f]{6}$/.test(colorDraft)} onPress={() => { const next=colorDraft.toUpperCase(); setAccentColor(next); supabase.auth.updateUser({data:{accent_color:next}}).catch(()=>{}); Alert.alert(t("colorUpdated"),t("colorApplied")); }}>
            <Text style={s.primaryText}>{t("applyColor")}</Text>
          </Pressable>
          <Pressable style={s.resetColor} onPress={() => { setColorDraft("#8B5CF6"); setAccentColor("#8B5CF6"); supabase.auth.updateUser({data:{accent_color:"#8B5CF6"}}).catch(()=>{}); }}>
            <Text style={{color:c.muted,fontSize:12,fontWeight:"800"}}>{t("resetColor")}</Text>
          </Pressable>
        </View>

        <AdBanner />

        <View style={[s.card,s.creatorCard]}>
          <View style={s.creatorHeader}>
            <View style={s.creatorMark}><Text style={s.creatorMarkText}>Y</Text></View>
            <View style={{flex:1}}>
              <Text style={s.creatorEyebrow}>{language==="sv"?"SKAPAREN BAKOM SNAPSTUDY":language==="ar"?"مبتكر سناب ستدي":"THE PERSON BEHIND SNAPSTUDY"}</Text>
              <Text style={s.creatorTitle}>YAZONI</Text>
              <Text style={s.creatorRole}>{language==="sv"?"Oberoende utvecklare · Sverige":language==="ar"?"مطوّر مستقل · السويد":"Independent developer · Sweden"}</Text>
            </View>
            <Ionicons name="sparkles" size={21} color={c.accent}/>
          </View>
          <Text style={s.creatorBody}>{language==="sv"?"Jag är en utvecklare i Sverige som gillar att bygga appar, webbplatser och AI-verktyg. Jag fokuserar på genomtänkt design och funktioner som faktiskt hjälper. SnapStudy gör skolanteckningar till sammanfattningar, flashcards och quiz som går att öva med.":language==="ar"?"أنا مطوّر في السويد أحب بناء التطبيقات والمواقع وأدوات الذكاء الاصطناعي. أركّز على التصميم المدروس والميزات المفيدة فعلًا. يحوّل SnapStudy ملاحظات الدراسة إلى ملخصات وبطاقات تعليمية واختبارات للتدرّب.":"I’m a developer in Sweden who enjoys building apps, websites and AI tools. I care about thoughtful design and features that genuinely help. SnapStudy turns class notes into summaries, flashcards and quizzes you can actively practise with."}</Text>
          <View style={s.creatorTags}>
            <View style={s.creatorTag}><Text style={s.creatorTagText}>{language==="sv"?"Appar & produkter":language==="ar"?"تطبيقات ومنتجات":"Apps & products"}</Text></View>
            <View style={s.creatorTag}><Text style={s.creatorTagText}>{language==="sv"?"Webbutveckling":language==="ar"?"تطوير الويب":"Web development"}</Text></View>
            <View style={s.creatorTag}><Text style={s.creatorTagText}>{language==="sv"?"AI-verktyg":language==="ar"?"أدوات الذكاء الاصطناعي":"AI tools"}</Text></View>
          </View>
          <View style={s.creatorDivider}/>
          <Text style={s.creatorLinksTitle}>{language==="sv"?"HITTA MER AV MITT ARBETE":language==="ar"?"اكتشف المزيد من أعمالي":"EXPLORE MORE OF MY WORK"}</Text>
          <Pressable style={s.creatorLinkRow} onPress={()=>Linking.openURL("https://github.com/yazoniplay").catch(()=>Alert.alert("Couldn’t open link","Try again in a moment."))}>
            <View style={s.creatorLinkIcon}><Ionicons name="logo-github" size={19} color={c.text}/></View>
            <View style={{flex:1}}><Text style={s.creatorLinkText}>GitHub</Text><Text style={s.creatorLinkSub}>{language==="sv"?"Mina projekt och kod":language==="ar"?"مشاريعي والشفرة":"Projects, experiments and code"}</Text></View>
            <Ionicons name="arrow-up-right" size={18} color={c.muted}/>
          </Pressable>
          <Pressable style={s.creatorLinkRow} onPress={()=>Linking.openURL("https://www.youtube.com/@yazoniiimc").catch(()=>Alert.alert("Couldn’t open link","Try again in a moment."))}>
            <View style={s.creatorLinkIcon}><Ionicons name="logo-youtube" size={19} color="#FF4545"/></View>
            <View style={{flex:1}}><Text style={s.creatorLinkText}>YouTube</Text><Text style={s.creatorLinkSub}>{language==="sv"?"Videor och projekt":language==="ar"?"فيديوهات ومشاريع":"Videos and projects"}</Text></View>
            <Ionicons name="arrow-up-right" size={18} color={c.muted}/>
          </Pressable>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t("session")}</Text>
          <Text style={s.cardText}>{t("sessionSub")}</Text>
          <Pressable style={s.danger} onPress={signOut}>
            <Text style={s.dangerText}>{t("signOut")}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe:{flex:1,backgroundColor:c.bg},
  container:{padding:20,paddingTop:22,paddingBottom:25},
  center:{flex:1,alignItems:"center",justifyContent:"center"},
  back:{color:c.muted,fontSize:13,fontWeight:"700",marginBottom:25},
  eyebrow:{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:2},
  title:{color:c.text,fontSize:32,fontWeight:"900",letterSpacing:-1,marginTop:7},
  sub:{color:c.muted,fontSize:13,marginTop:6,marginBottom:22},
  avatarWrap:{alignItems:"flex-start",marginBottom:18},avatar:{width:86,height:86,borderRadius:28,backgroundColor:c.accent,alignItems:"center",justifyContent:"center",marginBottom:7,overflow:"hidden"},avatarImage:{width:"100%",height:"100%"},avatarEdit:{color:c.accent,fontSize:12,fontWeight:"900"},
  avatarText:{color:c.onAccent,fontSize:27,fontWeight:"900"},
  card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:20,padding:17,marginBottom:12},
  label:{color:c.text,fontSize:11,fontWeight:"800",marginBottom:6,marginTop:2},
  input:{height:48,borderRadius:13,borderWidth:1,borderColor:c.border,backgroundColor:c.input,paddingHorizontal:14,color:c.text,fontSize:13,marginBottom:12},
  disabled:{opacity:.55},
  primary:{height:48,borderRadius:13,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},
  primaryText:{color:c.onAccent,fontWeight:"900"},
  swatchGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,marginTop:15,marginBottom:12},swatch:{width:30,height:30,borderRadius:11,borderWidth:2,borderColor:"transparent"},swatchSelected:{borderColor:c.text,transform:[{scale:1.1}]},colorInputRow:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:12},colorPreview:{width:32,height:32,borderRadius:11,borderWidth:1,borderColor:c.border},colorInput:{flex:1,height:44,borderRadius:12,borderWidth:1,borderColor:c.border,backgroundColor:c.input,paddingHorizontal:12,color:c.text,fontSize:13,fontWeight:"800"},resetColor:{alignItems:"center",paddingVertical:10,marginTop:4},themeRow:{flexDirection:"row",gap:9,marginTop:13},themeButton:{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:c.border,alignItems:"center",backgroundColor:c.input},themeButtonActive:{backgroundColor:c.accentSoft,borderColor:c.accent},themeButtonText:{color:c.muted,fontWeight:"900",fontSize:12},themeButtonTextActive:{color:c.text},
  streakStats:{flexDirection:"row",gap:10,marginTop:12,marginBottom:6},streakTile:{flex:1,padding:13,borderRadius:14,backgroundColor:c.surfaceAlt,borderWidth:1,borderColor:c.border},streakNumber:{color:c.accent,fontSize:28,fontWeight:"900"},
  secondary:{marginTop:13,borderRadius:12,borderWidth:1,borderColor:c.border,paddingVertical:12,alignItems:"center"},secondaryText:{color:c.accent,fontSize:12,fontWeight:"900"},privacyRow:{flexDirection:"row",alignItems:"center",gap:12,marginTop:14},privacyTitle:{color:c.text,fontSize:12,fontWeight:"900"},
  cardTitle:{color:c.text,fontSize:14,fontWeight:"900"},
  cardText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:5},
  creatorTags:{flexDirection:"row",flexWrap:"wrap",gap:7,marginBottom:15},creatorTag:{paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.border},creatorTagText:{color:c.accent,fontSize:10,fontWeight:"800"},  creatorCard:{padding:18},creatorHeader:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:15},creatorMark:{width:54,height:54,borderRadius:18,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},creatorMarkText:{color:c.onAccent,fontSize:29,fontWeight:"900",letterSpacing:-1},creatorEyebrow:{color:c.muted,fontSize:8,fontWeight:"900",letterSpacing:1.1},creatorTitle:{color:c.text,fontSize:21,fontWeight:"900",letterSpacing:1.2,marginTop:3},creatorRole:{color:c.muted,fontSize:10,fontWeight:"700",marginTop:3},creatorBody:{color:c.text,fontSize:13,lineHeight:20,marginBottom:15},creatorDivider:{height:1,backgroundColor:c.border,marginBottom:15},creatorLinksTitle:{color:c.muted,fontSize:9,fontWeight:"900",letterSpacing:1.1,marginBottom:8},creatorLinkRow:{flexDirection:"row",alignItems:"center",gap:11,minHeight:58,paddingVertical:8,borderBottomWidth:1,borderBottomColor:c.border},creatorLinkIcon:{width:37,height:37,borderRadius:12,backgroundColor:c.input,alignItems:"center",justifyContent:"center"},creatorLinkText:{color:c.text,fontSize:13,fontWeight:"900"},creatorLinkSub:{color:c.muted,fontSize:10,marginTop:3},
  creditsBox:{marginTop:15,marginBottom:8,padding:13,borderRadius:13,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.border},creditsTitle:{color:c.text,fontSize:13,fontWeight:"900",marginBottom:5},creditsText:{color:c.muted,fontSize:12,lineHeight:18},danger:{height:46,borderRadius:13,borderWidth:1,borderColor:c.dangerBorder,alignItems:"center",justifyContent:"center",marginTop:14},
  dangerText:{color:c.danger,fontWeight:"900"},
  muted:{color:c.muted},
});
