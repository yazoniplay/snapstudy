import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useTheme, type ThemeColors } from "../lib/theme";

export default function Plus() {
  const { colors:c } = useTheme();
  const s = makeStyles(c);
  const [interested,setInterested] = useState(false);
  useEffect(()=>{AsyncStorage.getItem("snapstudy:plusInterest").then(v=>setInterested(v==="yes")).catch(()=>{});},[]);
  async function saveInterest(){
    try { await AsyncStorage.setItem("snapstudy:plusInterest","yes"); setInterested(true); Alert.alert("Saved","Your interest is saved on this device. No payment has been taken."); }
    catch { Alert.alert("Not saved","Please try again."); }
  }
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
    <Pressable onPress={()=>router.back()}><Text style={s.back}>‹  Back</Text></Pressable>
    <View style={s.hero}>
      <View style={s.logo}><Text style={s.logoText}>✦</Text></View>
      <Text style={s.eyebrow}>SNAPSTUDY PLUS</Text>
      <Text style={s.title}>Make every study session count.</Text>
      <Text style={s.subtitle}>More room to practise. Less friction. Your notes stay the starting point.</Text>
      <View style={s.priceRow}><Text style={s.price}>29 kr</Text><Text style={s.per}>/ month · proposed price</Text></View>
      <View style={s.coming}><Text style={s.comingText}>COMING LATER · PAYMENTS AREN'T ACTIVE</Text></View>
    </View>
    <Text style={s.sectionTitle}>Free, and always useful</Text>
    <View style={s.featureCard}>
      {["Scan notes and get a summary","Flashcards, quizzes and practice tests","Key concepts, study plans and focus timer","Light/dark mode, languages and accent colors"].map(x=><View style={s.featureRow} key={x}><Text style={s.check}>✓</Text><Text style={s.featureText}>{x}</Text></View>)}
    </View>
    <Text style={s.sectionTitle}>Planned Plus benefits</Text>
    <View style={s.featureCard}>
      {["Higher daily AI scan limits","More saved study sessions and practice","An ad-free experience","Extra personalization options"].map(x=><View style={s.featureRow} key={x}><Text style={s.plusCheck}>✦</Text><Text style={s.featureText}>{x}</Text></View>)}
    </View>
    <Text style={s.disclaimer}>These benefits and the price are ideas, not active subscription terms. Payments, usage limits and premium access will be built and tested before launch.</Text>
    <Pressable style={s.primary} onPress={saveInterest}><Text style={s.primaryText}>{interested?"You're on the interest list ✓":"I'm interested"}</Text></Pressable>
    <Text style={s.small}>This only saves your interest on this device. It does not start a subscription or send a notification.</Text>
    <Pressable style={s.secondary} onPress={()=>router.replace("/")}><Text style={s.secondaryText}>Keep studying for free</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

const makeStyles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},container:{padding:21,paddingTop:24,paddingBottom:36},back:{color:c.muted,fontSize:14,fontWeight:"700",marginBottom:20},
 hero:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:24,padding:21,marginBottom:24},logo:{width:48,height:48,borderRadius:16,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:17},logoText:{color:c.accent,fontSize:24,fontWeight:"900"},eyebrow:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:2},title:{color:c.text,fontSize:29,fontWeight:"900",letterSpacing:-.8,lineHeight:34,marginTop:9},subtitle:{color:c.muted,fontSize:14,lineHeight:21,marginTop:10},priceRow:{flexDirection:"row",alignItems:"baseline",gap:5,marginTop:19},price:{color:c.text,fontSize:29,fontWeight:"900"},per:{color:c.muted,fontSize:12},coming:{alignSelf:"flex-start",marginTop:15,paddingHorizontal:10,paddingVertical:7,borderRadius:9,backgroundColor:c.accentSoft},comingText:{color:c.accent,fontSize:9,fontWeight:"900",letterSpacing:.7},
 sectionTitle:{color:c.text,fontSize:17,fontWeight:"900",marginBottom:10,marginTop:2},featureCard:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:16,marginBottom:20},featureRow:{flexDirection:"row",alignItems:"flex-start",gap:11,marginVertical:7},check:{color:c.accent,fontSize:15,fontWeight:"900",width:17},plusCheck:{color:c.accent,fontSize:15,fontWeight:"900",width:17},featureText:{color:c.text,fontSize:13,lineHeight:19,flex:1},disclaimer:{color:c.subtle,fontSize:11,lineHeight:17,marginBottom:16},primary:{height:50,borderRadius:14,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},primaryText:{color:c.onAccent,fontWeight:"900",fontSize:14},small:{color:c.subtle,fontSize:10,lineHeight:15,textAlign:"center",marginTop:9},secondary:{height:47,borderRadius:14,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center",marginTop:14},secondaryText:{color:c.text,fontWeight:"800",fontSize:13}
});
