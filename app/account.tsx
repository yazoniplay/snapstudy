import { useEffect, useState } from "react";
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, Switch } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import BottomNav from "../components/BottomNav";

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
      const profileResult = await supabase.from("profiles").select("username,display_name,avatar_url,leaderboard_opt_in").eq("id", user.id).maybeSingle();
      if (profileResult.data) { setHandle(profileResult.data.username || ""); if (profileResult.data.display_name) setName(profileResult.data.display_name); setAvatarUrl(profileResult.data.avatar_url || null); setLeaderboardOptIn(!!profileResult.data.leaderboard_opt_in); }
      const savedAccent = user.user_metadata?.accent_color;
      if (typeof savedAccent === "string" && /^#[0-9A-Fa-f]{6}$/.test(savedAccent)) { setAccentColor(savedAccent); setColorDraft(savedAccent.toUpperCase()); }
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setSaving(false);
    if (error) Alert.alert(t("couldntSave"), error.message);
    else Alert.alert(t("saved"), t("profileUpdated"));
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Couldn't sign out", error.message);
    else router.replace("/auth");
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.muted}>Loading account…</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        <Pressable onPress={() => router.replace("/")}><Text style={s.back}>{t("back")}</Text></Pressable>
        <Text style={s.eyebrow}>ACCOUNT</Text>
        <Text style={s.title}>{t("profile")}</Text>
        <Text style={s.sub}>{t("manageAccount")}</Text>

        <View style={s.avatar}><Text style={s.avatarText}>{(name || email)[0]?.toUpperCase() ?? "S"}</Text></View>

        <View style={s.card}>
          <Text style={s.label}>{t("name")}</Text>
          <TextInput value={name} onChangeText={setName} placeholder={t("yourName")} placeholderTextColor={c.subtle} style={s.input} />
          <Text style={s.label}>{t("email")}</Text>
          <TextInput value={email} editable={false} style={[s.input, s.disabled]} />
          <Pressable style={s.primary} onPress={save} disabled={saving}>
            <Text style={s.primaryText}>{saving ? t("saving") : t("saveChanges")}</Text>
          </Pressable>
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
          <Text style={s.cardTitle}>Accent color</Text>
          <Text style={s.cardText}>Make SnapStudy yours. Pick a color or enter any HEX color.</Text>
          <View style={s.swatchGrid}>
            {colorPresets.map(color => <Pressable accessibilityLabel={`Use accent color ${color}`} key={color} onPress={() => { setColorDraft(color); setAccentColor(color); supabase.auth.updateUser({data:{accent_color:color}}).catch(()=>{}); }} style={[s.swatch,{backgroundColor:color},accentColor.toUpperCase()===color&&s.swatchSelected]} />)}
          </View>
          <View style={s.colorInputRow}>
            <View style={[s.colorPreview,{backgroundColor:/^#[0-9A-Fa-f]{6}$/.test(colorDraft)?colorDraft:c.accent}]} />
            <TextInput value={colorDraft} onChangeText={setColorDraft} autoCapitalize="characters" autoCorrect={false} maxLength={7} placeholder="#8B5CF6" placeholderTextColor={c.subtle} style={s.colorInput} />
          </View>
          <Pressable style={[s.primary,{opacity:/^#[0-9A-Fa-f]{6}$/.test(colorDraft)?1:0.45}]} disabled={!/^#[0-9A-Fa-f]{6}$/.test(colorDraft)} onPress={() => { const next=colorDraft.toUpperCase(); setAccentColor(next); supabase.auth.updateUser({data:{accent_color:next}}).catch(()=>{}); Alert.alert("Color updated","Your accent color has been applied."); }}>
            <Text style={s.primaryText}>Apply custom color</Text>
          </Pressable>
          <Pressable style={s.resetColor} onPress={() => { setColorDraft("#8B5CF6"); setAccentColor("#8B5CF6"); supabase.auth.updateUser({data:{accent_color:"#8B5CF6"}}).catch(()=>{}); }}>
            <Text style={{color:c.muted,fontSize:12,fontWeight:"800"}}>Reset to default purple</Text>
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
  avatar:{width:76,height:76,borderRadius:26,backgroundColor:c.accent,alignItems:"center",justifyContent:"center",marginBottom:18},
  avatarText:{color:c.onAccent,fontSize:27,fontWeight:"900"},
  card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:20,padding:17,marginBottom:12},
  label:{color:c.text,fontSize:11,fontWeight:"800",marginBottom:6,marginTop:2},
  input:{height:48,borderRadius:13,borderWidth:1,borderColor:c.border,backgroundColor:c.input,paddingHorizontal:14,color:c.text,fontSize:13,marginBottom:12},
  disabled:{opacity:.55},
  primary:{height:48,borderRadius:13,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},
  primaryText:{color:c.onAccent,fontWeight:"900"},
  swatchGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,marginTop:15,marginBottom:12},swatch:{width:30,height:30,borderRadius:11,borderWidth:2,borderColor:"transparent"},swatchSelected:{borderColor:c.text,transform:[{scale:1.1}]},colorInputRow:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:12},colorPreview:{width:32,height:32,borderRadius:11,borderWidth:1,borderColor:c.border},colorInput:{flex:1,height:44,borderRadius:12,borderWidth:1,borderColor:c.border,backgroundColor:c.input,paddingHorizontal:12,color:c.text,fontSize:13,fontWeight:"800"},resetColor:{alignItems:"center",paddingVertical:10,marginTop:4},themeRow:{flexDirection:"row",gap:9,marginTop:13},themeButton:{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:c.border,alignItems:"center",backgroundColor:c.input},themeButtonActive:{backgroundColor:c.accentSoft,borderColor:c.accent},themeButtonText:{color:c.muted,fontWeight:"900",fontSize:12},themeButtonTextActive:{color:c.text},
  cardTitle:{color:c.text,fontSize:14,fontWeight:"900"},
  cardText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:5},
  danger:{height:46,borderRadius:13,borderWidth:1,borderColor:c.dangerBorder,alignItems:"center",justifyContent:"center",marginTop:14},
  dangerText:{color:c.danger,fontWeight:"900"},
  muted:{color:c.muted},
});
