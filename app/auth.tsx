import { useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeColors } from "../lib/theme";

export default function Auth() {
  const { colors:c, setMode: setThemeMode } = useTheme();
  const s = makeStyles(c);
  const [mode,setMode] = useState<"signup"|"login">("signup");
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");

  async function submit() {
    setMessage("");
    if (!email.trim() || !password) { setMessage("Add your email and password to continue."); return; }
    if (mode==="signup" && !name.trim()) { setMessage("What should we call you?"); return; }
    if (password.length < 6) { setMessage("Use a password with at least 6 characters."); return; }
    setBusy(true);
    try {
      if (mode==="signup") {
        const {data,error} = await supabase.auth.signUp({
          email:email.trim().toLowerCase(), password,
          options:{data:{full_name:name.trim()}},
        });
        if(error) throw error;
        if(data.session) router.replace("/onboarding");
        else setMessage("Check your email to confirm your account, then come back and log in.");
      } else {
        const {data,error} = await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
        if(error) throw error;
        const savedTheme = data.user.user_metadata?.theme;
        if (savedTheme === "light" || savedTheme === "dark") setThemeMode(savedTheme);
        router.replace(data.user.user_metadata?.onboarding_completed ? "/" : "/onboarding");
      }
    } catch(e:any) {
      setMessage(e?.message || "Couldn't connect. Try again in a moment.");
    } finally { setBusy(false); }
  }

  return <SafeAreaView style={s.safe}><View style={s.wrap}>
    <View style={s.logo}><Text style={s.logoText}>✦</Text></View>
    <Text style={s.eyebrow}>SNAPSTUDY</Text>
    <Text style={s.title}>{mode==="signup" ? "Your study era starts here." : "Welcome back."}</Text>
    <Text style={s.sub}>{mode==="signup" ? "Make an account to keep your study progress and preferences." : "Log in to pick up where you left off."}</Text>
    <View style={s.switch}><Pressable onPress={()=>{setMode("signup");setMessage("");}} style={[s.switchItem,mode==="signup"&&s.switchActive]}><Text style={[s.switchText,mode==="signup"&&s.switchTextActive]}>Create account</Text></Pressable><Pressable onPress={()=>{setMode("login");setMessage("");}} style={[s.switchItem,mode==="login"&&s.switchActive]}><Text style={[s.switchText,mode==="login"&&s.switchTextActive]}>Log in</Text></Pressable></View>
    {mode==="signup"&&<><Text style={s.label}>YOUR NAME</Text><TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={c.subtle} autoCapitalize="words" style={s.input}/></>}
    <Text style={s.label}>EMAIL</Text><TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={c.subtle} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={s.input}/>
    <Text style={s.label}>PASSWORD</Text><TextInput value={password} onChangeText={setPassword} placeholder="At least 6 characters" placeholderTextColor={c.subtle} secureTextEntry autoComplete={mode==="signup"?"new-password":"current-password"} style={s.input}/>
    {!!message&&<Text style={s.message}>{message}</Text>}
    <Pressable style={[s.primary,busy&&{opacity:.7}]} onPress={submit} disabled={busy}>{busy?<ActivityIndicator color={c.onAccent}/>:<Text style={s.primaryText}>{mode==="signup"?"Create my account":"Log in"}</Text>}</Pressable>
    <Text style={s.foot}>Your account keeps your preferences and progress together.</Text>
  </View></SafeAreaView>;
}

const makeStyles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},wrap:{flex:1,justifyContent:"center",padding:24,maxWidth:520,width:"100%",alignSelf:"center"},
 logo:{width:58,height:58,borderRadius:19,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:22,borderWidth:1,borderColor:c.border},
 logoText:{color:c.accent,fontSize:30},eyebrow:{color:c.muted,fontSize:11,fontWeight:"900",letterSpacing:2.3},
 title:{color:c.text,fontSize:31,fontWeight:"900",letterSpacing:-1,marginTop:9},sub:{color:c.muted,fontSize:14,lineHeight:21,marginTop:8,marginBottom:22},
 switch:{flexDirection:"row",padding:4,borderRadius:14,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,marginBottom:20},
 switchItem:{flex:1,paddingVertical:12,alignItems:"center",borderRadius:10},switchActive:{backgroundColor:c.accentSoft},
 switchText:{color:c.muted,fontSize:12,fontWeight:"800"},switchTextActive:{color:c.accent},
 label:{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:1.2,marginBottom:7,marginTop:4},
 input:{height:50,borderRadius:13,borderWidth:1,borderColor:c.border,backgroundColor:c.input,paddingHorizontal:14,color:c.text,fontSize:14,marginBottom:12},
 message:{color:c.danger,fontSize:12,lineHeight:18,marginBottom:12},
 primary:{height:52,borderRadius:14,backgroundColor:c.accent,alignItems:"center",justifyContent:"center",marginTop:4},
 primaryText:{color:c.onAccent,fontWeight:"900",fontSize:14},foot:{color:c.subtle,fontSize:11,lineHeight:17,textAlign:"center",marginTop:20}
});
