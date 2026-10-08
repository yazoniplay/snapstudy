import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || password.length < 6) {
      Alert.alert("Check your details", "Enter a valid email and a password with at least 6 characters.");
      return;
    }

    setLoading(true);
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
    setLoading(false);

    if (result.error) {
      Alert.alert("Couldn't continue", result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      Alert.alert("Check your email", "Your account was created. Confirm your email, then sign in.");
      setMode("signin");
      return;
    }

    router.replace("/");
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.brand}>
          <View style={s.logo}><Text style={s.logoText}>S</Text></View>
          <Text style={s.eyebrow}>SNAPSTUDY</Text>
          <Text style={s.title}>{mode === "signin" ? "Welcome back." : "Start studying smarter."}</Text>
          <Text style={s.sub}>
            {mode === "signin" ? "Your study sessions are waiting." : "Create an account and keep your study progress in one place."}
          </Text>
        </View>

        <View style={s.switcher}>
          <Pressable onPress={() => setMode("signin")} style={[s.switch, mode === "signin" && s.switchActive]}>
            <Text style={[s.switchText, mode === "signin" && s.switchTextActive]}>Sign in</Text>
          </Pressable>
          <Pressable onPress={() => setMode("signup")} style={[s.switch, mode === "signup" && s.switchActive]}>
            <Text style={[s.switchText, mode === "signup" && s.switchTextActive]}>Create account</Text>
          </Pressable>
        </View>

        <View style={s.form}>
          {mode === "signup" && (
            <>
              <Text style={s.label}>Name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#696476" style={s.input} autoCapitalize="words" />
            </>
          )}
          <Text style={s.label}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#696476" style={s.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Text style={s.label}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} placeholder="At least 6 characters" placeholderTextColor="#696476" style={s.input} secureTextEntry autoCapitalize="none" />
          <Pressable style={[s.button, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
            <Text style={s.buttonText}>{loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</Text>
          </Pressable>
          <Text style={s.note}>Your account uses Supabase Auth. Never share your password with anyone.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#070A12"},
  wrap:{flex:1,padding:22,justifyContent:"center"},
  brand:{alignItems:"center",marginBottom:28},
  logo:{width:58,height:58,borderRadius:19,backgroundColor:"#8B5CF6",alignItems:"center",justifyContent:"center",marginBottom:14},
  logoText:{color:"#fff",fontSize:25,fontWeight:"900"},
  eyebrow:{color:"#918BA1",fontSize:10,fontWeight:"900",letterSpacing:2.2},
  title:{color:"#F7F5FF",fontSize:29,fontWeight:"900",letterSpacing:-1,marginTop:8,textAlign:"center"},
  sub:{color:"#858096",fontSize:13,lineHeight:20,textAlign:"center",marginTop:7,maxWidth:330},
  switcher:{flexDirection:"row",backgroundColor:"#0F1320",borderWidth:1,borderColor:"#242A3A",padding:4,borderRadius:15,marginBottom:12},
  switch:{flex:1,paddingVertical:11,alignItems:"center",borderRadius:11},
  switchActive:{backgroundColor:"#8B5CF6"},
  switchText:{color:"#858096",fontWeight:"800",fontSize:12},
  switchTextActive:{color:"#fff"},
  form:{backgroundColor:"#0F1320",borderWidth:1,borderColor:"#242A3A",borderRadius:21,padding:18},
  label:{color:"#C7C2D2",fontSize:11,fontWeight:"800",marginBottom:6,marginTop:4},
  input:{height:48,borderRadius:13,borderWidth:1,borderColor:"#303647",backgroundColor:"#0B0E17",paddingHorizontal:14,color:"#F7F5FF",fontSize:13,marginBottom:11},
  button:{height:49,borderRadius:13,backgroundColor:"#8B5CF6",alignItems:"center",justifyContent:"center",marginTop:4},
  buttonText:{color:"#fff",fontWeight:"900",fontSize:14},
  note:{color:"#686375",fontSize:10,lineHeight:15,textAlign:"center",marginTop:13},
});
