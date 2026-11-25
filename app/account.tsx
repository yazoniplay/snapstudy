import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
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
  const { width: viewportWidth } = useWindowDimensions();
  const wideSettings = viewportWidth >= 1000;
  const [selectedSettings, setSelectedSettings] = useState("Profile");
  const { language, setLanguage, t } = useLanguage();
  const s = makeStyles(c);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorDraft, setColorDraft] = useState(accentColor);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [handle, setHandle] = useState("");
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(30);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [motionEnabled, setMotionEnabled] = useState(true);
  useEffect(() => { AsyncStorage.getItem("snapstudy:motion").then(value=>{if(value==="off")setMotionEnabled(false);}).catch(()=>{}); AsyncStorage.multiGet(["snapstudy:daily-goal","snapstudy:focus-minutes","snapstudy:break-minutes"]).then(values => { const goal=Number(values[0]?.[1]); const focus=Number(values[1]?.[1]); const rest=Number(values[2]?.[1]); if([15,30,45,60,90].includes(goal))setDailyGoal(goal); if([15,20,25,30,45].includes(focus))setFocusMinutes(focus); if([5,10,15].includes(rest))setBreakMinutes(rest); }).catch(()=>{}); }, []);
  function savePreference(key: string, value: number, setter: (value:number)=>void) { setter(value); AsyncStorage.setItem(key,String(value)).catch(()=>{}); supabase.auth.updateUser({data:{[key.replace("snapstudy:","").replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]:value}}).then(()=>{}).catch(()=>{}); }
  const colorPresets = ["#8B5CF6","#EC4899","#EF4444","#F97316","#EAB308","#22C55E","#14B8A6","#06B6D4","#3B82F6","#6366F1","#A855F7","#F43F5E","#84CC16","#0F766E","#F8FAFC","#111827"];
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
      const profileResult = await supabase.from("profiles").select("username,display_name,avatar_url,current_streak,longest_streak").eq("id", user.id).maybeSingle();
      if (profileResult.data) { setHandle(profileResult.data.username || ""); if (profileResult.data.display_name) setName(profileResult.data.display_name); setAvatarUrl(profileResult.data.avatar_url || null); setCurrentStreak(profileResult.data.current_streak || 0); setLongestStreak(profileResult.data.longest_streak || 0); }
      supabase.from("profiles").update({ leaderboard_opt_in: true }).eq("id", user.id).then(() => {});
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


  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Couldn't sign out", error.message);
    else router.replace("/auth");
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.muted}>{t("loadingAccount")}</Text></View></SafeAreaView>;

  const settingsCategories = [
    { title: "Profile", subtitle: "Name, username and photo", icon: "person-outline" as const },
    { title: "Study activity", subtitle: "Streaks and leaderboard", icon: "trophy-outline" as const },
    { title: "Study preferences", subtitle: "Goals and focus timing", icon: "options-outline" as const },
    { title: "Language", subtitle: "App and learning language", icon: "globe-outline" as const },
    { title: "Appearance", subtitle: "Theme, motion and colors", icon: "color-palette-outline" as const },
    { title: "Account", subtitle: "Security and sign out", icon: "shield-checkmark-outline" as const },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, flexDirection: wideSettings ? "row" : "column" }}>
        {wideSettings && <View style={s.sidebar}>
          <View style={s.sidebarHeader}><Text style={s.sidebarTitle}>Settings</Text><Text style={s.sidebarSubtitle}>SnapStudy</Text></View>
          {settingsCategories.map(category => {
            const active = selectedSettings === category.title;
            return <Pressable key={category.title} onPress={() => setSelectedSettings(category.title)} style={[s.sidebarItem, active && s.sidebarItemActive]}>
              <View style={[s.sidebarIcon, active && s.sidebarIconActive]}><Ionicons name={category.icon} size={19} color={active ? c.accent : c.muted} /></View>
              <View style={{ flex: 1 }}><Text style={[s.sidebarItemTitle, active && s.sidebarItemTitleActive]}>{category.title}</Text><Text style={s.sidebarItemSubtitle}>{category.subtitle}</Text></View>
              <Ionicons name="chevron-forward" size={15} color={active ? c.accent : c.subtle} />
            </Pressable>;
          })}
          <Pressable onPress={() => router.replace("/")} style={s.sidebarBack}><Ionicons name="arrow-back-outline" size={17} color={c.muted}/><Text style={s.sidebarBackText}>{t("back")}</Text></Pressable>
        </View>}
        <ScrollView contentContainerStyle={[s.container, wideSettings && s.desktopContent]}>
          {!wideSettings && <Pressable onPress={() => router.replace("/")}><Text style={s.back}>{t("back")}</Text></Pressable>}
          <Text style={s.eyebrow}>{t("accountEyebrow")}</Text>
          <Text style={s.title}>{wideSettings ? selectedSettings : "Settings"}</Text>
          <Text style={s.sub}>{wideSettings ? settingsCategories.find(item => item.title === selectedSettings)?.subtitle : "Personalize your study space and account."}</Text>

        {(!wideSettings || selectedSettings === "Profile") && (<>
        <View style={s.sectionHeading}><View style={s.sectionIcon}><Ionicons name="person-outline" size={18} color={c.accent}/></View><View style={s.sectionCopy}><Text style={s.sectionTitle}>Profile</Text><Text style={s.sectionSub}>Your name, username and photo</Text></View></View>
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


        </>)}
        {(!wideSettings || selectedSettings === "Study activity") && (<>
        <View style={s.card}><View style={{flexDirection:"row",alignItems:"center",gap:8}}><Ionicons name="trophy-outline" size={18} color={c.accent}/><Text style={s.cardTitle}>Streak leaderboard</Text></View><Text style={s.cardText}>You’re automatically included in the SnapStudy community leaderboard. Keep studying daily to climb the rankings.</Text><Pressable style={s.secondary} onPress={()=>router.push("/leaderboard")}><Text style={s.secondaryText}>{t("viewLeaderboard")}</Text></Pressable></View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t("studyStreak")}</Text>
          <View style={s.streakStats}><View style={s.streakTile}><Text style={s.streakNumber}>{currentStreak}</Text><Text style={s.cardText}>{t("currentDays")}</Text></View><View style={s.streakTile}><Text style={s.streakNumber}>{longestStreak}</Text><Text style={s.cardText}>{t("personalBest")}</Text></View></View>
          <Text style={s.cardText}>{t("streakHelp")}</Text>
        </View>
        <View style={s.sectionHeading}><View style={s.sectionIcon}><Ionicons name="person-circle-outline" size={19} color={c.accent}/></View><View style={s.sectionCopy}><Text style={s.sectionTitle}>Study activity</Text><Text style={s.sectionSub}>Your streaks and community progress</Text></View></View>

        </>)}
        {(!wideSettings || selectedSettings === "Study preferences") && (<>
        <View style={s.sectionHeading}><View style={s.sectionIcon}><Ionicons name="options-outline" size={19} color={c.accent}/></View><View style={s.sectionCopy}><Text style={s.sectionTitle}>Study preferences</Text><Text style={s.sectionSub}>Set the pace that works for you</Text></View></View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Daily study goal</Text><Text style={s.cardText}>Choose how many minutes you want to study each day.</Text>
          <View style={s.choiceRow}>{[15,30,45,60,90].map(value=><Pressable key={value} style={[s.choiceChip,dailyGoal===value&&s.choiceChipActive]} onPress={()=>savePreference("snapstudy:daily-goal",value,setDailyGoal)}><Text style={[s.choiceText,dailyGoal===value&&s.choiceTextActive]}>{value}m</Text></Pressable>)}</View>
          <View style={s.preferenceDivider}/><Text style={s.cardTitle}>Focus session</Text><Text style={s.cardText}>Length of a single Pomodoro session.</Text>
          <View style={s.choiceRow}>{[15,20,25,30,45].map(value=><Pressable key={value} style={[s.choiceChip,focusMinutes===value&&s.choiceChipActive]} onPress={()=>savePreference("snapstudy:focus-minutes",value,setFocusMinutes)}><Text style={[s.choiceText,focusMinutes===value&&s.choiceTextActive]}>{value}m</Text></Pressable>)}</View>
          <View style={s.preferenceDivider}/><Text style={s.cardTitle}>Short break</Text><Text style={s.cardText}>Take a breather between focus sessions.</Text>
          <View style={s.choiceRow}>{[5,10,15].map(value=><Pressable key={value} style={[s.choiceChip,breakMinutes===value&&s.choiceChipActive]} onPress={()=>savePreference("snapstudy:break-minutes",value,setBreakMinutes)}><Text style={[s.choiceText,breakMinutes===value&&s.choiceTextActive]}>{value}m</Text></Pressable>)}</View>
        </View>

        </>)}
        {(!wideSettings || selectedSettings === "Language") && (<>
        <View style={s.sectionHeading}><View style={s.sectionIcon}><Ionicons name="globe-outline" size={19} color={c.accent}/></View><View style={s.sectionCopy}><Text style={s.sectionTitle}>Language</Text><Text style={s.sectionSub}>App interface and learning language</Text></View></View>
        <View style={s.card}>
          <Text style={s.cardTitle}>{t("language")}</Text>
          <Text style={s.cardText}>{t("languageSub")}</Text>
          <View style={s.themeRow}>
            {([["en",t("english")],["sv",t("swedish")],["ar",t("arabic")]] as [AppLanguage,string][]).map(([code,label])=><Pressable key={code} style={[s.themeButton,language===code&&s.themeButtonActive]} onPress={()=>{setLanguage(code);supabase.auth.updateUser({data:{language:code}}).catch(()=>{});}}><Text style={[s.themeButtonText,language===code&&s.themeButtonTextActive]}>{label}</Text></Pressable>)}
          </View>
        </View>


        </>)}
        {(!wideSettings || selectedSettings === "Appearance") && (<>
        <View style={s.sectionHeading}><View style={s.sectionIcon}><Ionicons name="color-palette-outline" size={19} color={c.accent}/></View><View style={s.sectionCopy}><Text style={s.sectionTitle}>Appearance & personalization</Text><Text style={s.sectionSub}>Make SnapStudy feel like yours</Text></View></View>
        <View style={s.card}>
          <Text style={s.cardTitle}>{t("appearance")}</Text>
          <Text style={s.cardText}>{t("appearanceSub")}</Text>
          <Pressable style={s.motionRow} onPress={()=>{const next=!motionEnabled;setMotionEnabled(next);AsyncStorage.setItem("snapstudy:motion",next?"on":"off").catch(()=>{});supabase.auth.updateUser({data:{reduceMotion:!next}}).catch(()=>{});}}><View style={s.motionCopy}><Text style={s.cardTitle}>Animations</Text><Text style={s.cardText}>{motionEnabled?"Subtle motion and breathing effects are on.":"Motion effects are reduced."}</Text></View><View style={[s.motionSwitch,motionEnabled&&s.motionSwitchOn]}><View style={[s.motionKnob,motionEnabled&&s.motionKnobOn]}/></View></Pressable>
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


        </>)}
        {(!wideSettings || selectedSettings === "Account") && (<>
        <View style={s.sectionHeading}><View style={s.sectionIcon}><Ionicons name="shield-checkmark-outline" size={19} color={c.accent}/></View><View style={s.sectionCopy}><Text style={s.sectionTitle}>Account & security</Text><Text style={s.sectionSub}>Your sign-in and account controls</Text></View></View>
        <AdBanner />

        <View style={s.card}>
          <Text style={s.cardTitle}>{t("session")}</Text>
          <Text style={s.cardText}>{t("sessionSub")}</Text>
          <Pressable style={s.danger} onPress={signOut}>
            <Text style={s.dangerText}>{t("signOut")}</Text>
          </Pressable>
        </View>

        </>)}
      </ScrollView>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe:{flex:1,backgroundColor:c.bg},
  sidebar:{width:286,backgroundColor:c.surfaceAlt,borderRightWidth:1,borderRightColor:c.border,paddingHorizontal:14,paddingTop:24,paddingBottom:16},
  sidebarHeader:{paddingHorizontal:13,paddingBottom:20,borderBottomWidth:1,borderBottomColor:c.border,marginBottom:12},
  sidebarTitle:{color:c.text,fontSize:25,fontWeight:"900",letterSpacing:-.7},
  sidebarSubtitle:{color:c.muted,fontSize:11,fontWeight:"700",marginTop:4},
  sidebarItem:{flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:10,paddingVertical:11,borderRadius:12,marginBottom:4},
  sidebarItemActive:{backgroundColor:c.accentSoft},
  sidebarIcon:{width:30,height:30,borderRadius:9,backgroundColor:c.input,alignItems:"center",justifyContent:"center"},
  sidebarIconActive:{backgroundColor:c.surface},
  sidebarItemTitle:{color:c.text,fontSize:12,fontWeight:"800"},
  sidebarItemTitleActive:{color:c.accent},
  sidebarItemSubtitle:{color:c.muted,fontSize:10,marginTop:2},
  sidebarBack:{flexDirection:"row",alignItems:"center",gap:8,marginTop:"auto",padding:12,borderTopWidth:1,borderTopColor:c.border},
  sidebarBackText:{color:c.muted,fontSize:12,fontWeight:"800"},
  desktopContent:{paddingHorizontal:34,paddingTop:30,paddingBottom:44,maxWidth:1050,flexGrow:1},

  motionRow:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:12,marginTop:6},motionCopy:{flex:1},motionSwitch:{width:46,height:27,borderRadius:99,backgroundColor:c.border,padding:3,justifyContent:"center"},motionSwitchOn:{backgroundColor:c.accent},motionKnob:{width:21,height:21,borderRadius:11,backgroundColor:"#FFFFFF",alignSelf:"flex-start"},motionKnobOn:{alignSelf:"flex-end"},
  sectionHeading:{flexDirection:"row",alignItems:"center",gap:10,marginTop:25,marginBottom:9,paddingHorizontal:3},sectionIcon:{width:29,height:29,borderRadius:9,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},sectionCopy:{flex:1},sectionTitle:{color:c.text,fontSize:14,fontWeight:"800",letterSpacing:-.2},sectionSub:{color:c.muted,fontSize:11,marginTop:2},choiceRow:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:12},choiceChip:{minWidth:47,paddingHorizontal:12,paddingVertical:10,borderRadius:10,borderWidth:1,borderColor:c.border,backgroundColor:c.surfaceAlt,alignItems:"center"},choiceChipActive:{backgroundColor:c.accentSoft,borderColor:c.accent},choiceText:{color:c.muted,fontSize:12,fontWeight:"800"},choiceTextActive:{color:c.accent},preferenceDivider:{height:1,backgroundColor:c.border,marginVertical:16},
  container:{paddingHorizontal:22,paddingTop:22,paddingBottom:34,width:"100%",maxWidth:760,alignSelf:"center"},
  center:{flex:1,alignItems:"center",justifyContent:"center"},
  back:{color:c.muted,fontSize:13,fontWeight:"700",marginBottom:25},
  eyebrow:{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:2},
  title:{color:c.text,fontSize:32,fontWeight:"900",letterSpacing:-1,marginTop:7},
  sub:{color:c.muted,fontSize:13,marginTop:6,marginBottom:22},
  avatarWrap:{alignItems:"flex-start",marginBottom:18},avatar:{width:86,height:86,borderRadius:28,backgroundColor:c.accent,alignItems:"center",justifyContent:"center",marginBottom:7,overflow:"hidden"},avatarImage:{width:"100%",height:"100%"},avatarEdit:{color:c.accent,fontSize:12,fontWeight:"900"},
  avatarText:{color:c.onAccent,fontSize:27,fontWeight:"900"},
  card:{backgroundColor:c.surface,borderWidth:0,borderColor:"transparent",borderRadius:13,padding:17,marginBottom:7},
  label:{color:c.text,fontSize:11,fontWeight:"800",marginBottom:6,marginTop:2},
  input:{height:46,borderRadius:10,borderWidth:1,borderColor:c.border,backgroundColor:c.input,paddingHorizontal:13,color:c.text,fontSize:13,marginBottom:12},
  disabled:{opacity:.55},
  primary:{height:48,borderRadius:13,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},
  primaryText:{color:c.onAccent,fontWeight:"900"},
  swatchGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,marginTop:15,marginBottom:12},swatch:{width:30,height:30,borderRadius:11,borderWidth:2,borderColor:"transparent"},swatchSelected:{borderColor:c.text,transform:[{scale:1.1}]},colorInputRow:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:12},colorPreview:{width:32,height:32,borderRadius:11,borderWidth:1,borderColor:c.border},colorInput:{flex:1,height:44,borderRadius:12,borderWidth:1,borderColor:c.border,backgroundColor:c.input,paddingHorizontal:12,color:c.text,fontSize:13,fontWeight:"800"},resetColor:{alignItems:"center",paddingVertical:10,marginTop:4},themeRow:{flexDirection:"row",gap:9,marginTop:13},themeButton:{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:c.border,alignItems:"center",backgroundColor:c.input},themeButtonActive:{backgroundColor:c.accentSoft,borderColor:c.accent},themeButtonText:{color:c.muted,fontWeight:"900",fontSize:12},themeButtonTextActive:{color:c.text},
  streakStats:{flexDirection:"row",gap:10,marginTop:12,marginBottom:6},streakTile:{flex:1,padding:13,borderRadius:14,backgroundColor:c.surfaceAlt,borderWidth:1,borderColor:c.border},streakNumber:{color:c.accent,fontSize:28,fontWeight:"900"},
  secondary:{marginTop:13,borderRadius:12,borderWidth:1,borderColor:c.border,paddingVertical:12,alignItems:"center"},secondaryText:{color:c.accent,fontSize:12,fontWeight:"900"},
  cardTitle:{color:c.text,fontSize:14,fontWeight:"900"},
  cardText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:5},
  creditsTitle:{color:c.text,fontSize:19,fontWeight:"900",letterSpacing:-.4,marginBottom:6},creditsIntro:{color:c.muted,fontSize:12,lineHeight:18,marginBottom:16},creditSectionTitle:{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:1.2,marginBottom:7,marginTop:4},creditRow:{flexDirection:"row",alignItems:"center",gap:11,minHeight:59,paddingVertical:8,borderBottomWidth:1,borderBottomColor:c.border},creatorTags:{flexDirection:"row",flexWrap:"wrap",gap:7,marginBottom:15},creatorTag:{paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.border},creatorTagText:{color:c.accent,fontSize:10,fontWeight:"800"},  creatorCard:{padding:18},creatorHeader:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:15},creatorMark:{width:54,height:54,borderRadius:18,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},creatorMarkText:{color:c.onAccent,fontSize:29,fontWeight:"900",letterSpacing:-1},creatorEyebrow:{color:c.muted,fontSize:8,fontWeight:"900",letterSpacing:1.1},creatorTitle:{color:c.text,fontSize:21,fontWeight:"900",letterSpacing:1.2,marginTop:3},creatorRole:{color:c.muted,fontSize:10,fontWeight:"700",marginTop:3},creatorBody:{color:c.text,fontSize:13,lineHeight:20,marginBottom:15},creatorDivider:{height:1,backgroundColor:c.border,marginBottom:15},creatorLinksTitle:{color:c.muted,fontSize:9,fontWeight:"900",letterSpacing:1.1,marginBottom:8},creatorLinkRow:{flexDirection:"row",alignItems:"center",gap:11,minHeight:58,paddingVertical:8,borderBottomWidth:1,borderBottomColor:c.border},creatorLinkIcon:{width:37,height:37,borderRadius:12,backgroundColor:c.input,alignItems:"center",justifyContent:"center"},creatorLinkText:{color:c.text,fontSize:13,fontWeight:"900"},creatorLinkSub:{color:c.muted,fontSize:10,marginTop:3},
  creditsBox:{marginTop:15,marginBottom:8,padding:13,borderRadius:13,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.border},creditsTitle:{color:c.text,fontSize:13,fontWeight:"900",marginBottom:5},creditsText:{color:c.muted,fontSize:12,lineHeight:18},danger:{height:46,borderRadius:13,borderWidth:1,borderColor:c.dangerBorder,alignItems:"center",justifyContent:"center",marginTop:14},
  dangerText:{color:c.danger,fontWeight:"900"},
  muted:{color:c.muted},
});
