import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import BottomNav from "../components/BottomNav";

import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage, type AppLanguage } from "../lib/language";
export default function Account() {
  const { colors:c, mode, setMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const s = makeStyles(c);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) {
        router.replace("/auth");
        return;
      }
      setEmail(user.email ?? "");
      setName((user.user_metadata?.full_name as string) ?? "");
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
  themeRow:{flexDirection:"row",gap:9,marginTop:13},themeButton:{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:c.border,alignItems:"center",backgroundColor:c.input},themeButtonActive:{backgroundColor:c.accentSoft,borderColor:c.accent},themeButtonText:{color:c.muted,fontWeight:"900",fontSize:12},themeButtonTextActive:{color:c.text},
  cardTitle:{color:c.text,fontSize:14,fontWeight:"900"},
  cardText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:5},
  danger:{height:46,borderRadius:13,borderWidth:1,borderColor:c.dangerBorder,alignItems:"center",justifyContent:"center",marginTop:14},
  dangerText:{color:c.danger,fontWeight:"900"},
  muted:{color:c.muted},
});
