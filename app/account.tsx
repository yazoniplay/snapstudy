import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import BottomNav from "../components/BottomNav";

export default function Account() {
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
    if (error) Alert.alert("Couldn't save", error.message);
    else Alert.alert("Saved", "Your profile was updated.");
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Couldn't sign out", error.message);
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.muted}>Loading account…</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        <Pressable onPress={() => router.replace("/")}><Text style={s.back}>‹  Back to dashboard</Text></Pressable>
        <Text style={s.eyebrow}>ACCOUNT</Text>
        <Text style={s.title}>Your profile</Text>
        <Text style={s.sub}>Manage your SnapStudy account.</Text>

        <View style={s.avatar}><Text style={s.avatarText}>{(name || email)[0]?.toUpperCase() ?? "S"}</Text></View>

        <View style={s.card}>
          <Text style={s.label}>Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#696476" style={s.input} />
          <Text style={s.label}>Email</Text>
          <TextInput value={email} editable={false} style={[s.input, s.disabled]} />
          <Pressable style={s.primary} onPress={save} disabled={saving}>
            <Text style={s.primaryText}>{saving ? "Saving…" : "Save changes"}</Text>
          </Pressable>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Session</Text>
          <Text style={s.cardText}>You are signed in and your account session is stored securely on this device.</Text>
          <Pressable style={s.danger} onPress={signOut}>
            <Text style={s.dangerText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#070A12"},
  container:{padding:20,paddingTop:22,paddingBottom:25},
  center:{flex:1,alignItems:"center",justifyContent:"center"},
  back:{color:"#9691A4",fontSize:13,fontWeight:"700",marginBottom:25},
  eyebrow:{color:"#918BA1",fontSize:10,fontWeight:"900",letterSpacing:2},
  title:{color:"#F7F5FF",fontSize:32,fontWeight:"900",letterSpacing:-1,marginTop:7},
  sub:{color:"#858096",fontSize:13,marginTop:6,marginBottom:22},
  avatar:{width:76,height:76,borderRadius:26,backgroundColor:"#8B5CF6",alignItems:"center",justifyContent:"center",marginBottom:18},
  avatarText:{color:"#fff",fontSize:27,fontWeight:"900"},
  card:{backgroundColor:"#0F1320",borderWidth:1,borderColor:"#242A3A",borderRadius:20,padding:17,marginBottom:12},
  label:{color:"#C7C2D2",fontSize:11,fontWeight:"800",marginBottom:6,marginTop:2},
  input:{height:48,borderRadius:13,borderWidth:1,borderColor:"#303647",backgroundColor:"#0B0E17",paddingHorizontal:14,color:"#F7F5FF",fontSize:13,marginBottom:12},
  disabled:{opacity:.55},
  primary:{height:48,borderRadius:13,backgroundColor:"#8B5CF6",alignItems:"center",justifyContent:"center"},
  primaryText:{color:"#fff",fontWeight:"900"},
  cardTitle:{color:"#F4F1FF",fontSize:14,fontWeight:"900"},
  cardText:{color:"#858096",fontSize:12,lineHeight:18,marginTop:5},
  danger:{height:46,borderRadius:13,borderWidth:1,borderColor:"#3A2D3A",alignItems:"center",justifyContent:"center",marginTop:14},
  dangerText:{color:"#E2A7B4",fontWeight:"900"},
  muted:{color:"#858096"},
});
