import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
import { NO_PLUS_ENTITLEMENT, hasPlusFeature, loadPlusEntitlement, type PlusEntitlement } from "../lib/plus";

export default function Plus() {
  const { colors:c } = useTheme();
  const { t } = useLanguage();
  const [currency,setCurrency] = useState<"SEK"|"USD"|"EUR"|"QAR"|"AED">("SEK");
  const currencyOptions = [{code:"SEK" as const,symbol:"kr",price:"29"},{code:"USD" as const,symbol:"$",price:"2.99"},{code:"EUR" as const,symbol:"€",price:"2.79"},{code:"QAR" as const,symbol:"ر.ق",price:"10.99"},{code:"AED" as const,symbol:"د.إ",price:"10.99"}];
  const selectedPrice = currencyOptions.find(item=>item.code===currency) || currencyOptions[0];
  const s = makeStyles(c);
  const [interested,setInterested] = useState(false);
  const [entitlement,setEntitlement] = useState<PlusEntitlement>(NO_PLUS_ENTITLEMENT);
  const plusActive = hasPlusFeature(entitlement,"extra_scans");
  useEffect(()=>{AsyncStorage.multiGet(["snapstudy:plusInterest","snapstudy:plusCurrency"]).then(v=>{setInterested(v[0]?.[1]==="yes");const c=v[1]?.[1];if(c==="SEK"||c==="USD"||c==="EUR"||c==="QAR"||c==="AED")setCurrency(c);}).catch(()=>{});loadPlusEntitlement().then(setEntitlement).catch(()=>setEntitlement(NO_PLUS_ENTITLEMENT));},[]);
  async function saveInterest(){
    try { await AsyncStorage.setItem("snapstudy:plusInterest","yes"); setInterested(true); Alert.alert(t("savedInterestTitle"),t("savedInterestBody")); }
    catch { Alert.alert(t("saveFailedTitle"),t("saveFailedBody")); }
  }
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
    <Pressable onPress={()=>router.back()}><Text style={s.back}>{t("plusBack")}</Text></Pressable>
    <View style={s.hero}>
      <View style={s.logo}><Text style={s.logoText}>✦</Text></View>
      <Text style={s.eyebrow}>SNAPSTUDY PLUS</Text>
      <Text style={s.title}>{t("plusHeroTitle")}</Text>
      <Text style={s.subtitle}>{t("plusHeroSub")}</Text>
      <Text style={s.currencyLabel}>{t("currencyLabel")}</Text>
      <View style={s.currencyRow}>{currencyOptions.map(item=><Pressable key={item.code} onPress={()=>{setCurrency(item.code);AsyncStorage.setItem("snapstudy:plusCurrency",item.code).catch(()=>{});}} style={[s.currencyOption,currency===item.code&&s.currencyOptionActive]}><Text style={[s.currencyCode,currency===item.code&&s.currencyCodeActive]}>{item.code}</Text></Pressable>)}</View>
      <Text style={s.currencyNote}>{t("currencyNote")}</Text>
      <View style={s.priceRow}><Text style={s.price}>{selectedPrice.symbol} {selectedPrice.price}</Text><Text style={s.per}>{t("perMonth")}</Text></View>
      <View style={s.coming}><Text style={s.comingText}>{t("paymentsOff")}</Text></View>
    </View>
    <View style={s.statusCard}><Text style={s.statusLabel}>{t("plusStatusTitle")}</Text><Text style={s.statusTitle}>{plusActive ? t("plusActiveStatus") : t("freePlanActive")}</Text><Text style={s.statusText}>{plusActive ? t("plusActiveBody") : t("plusNotActive")}</Text></View>
    <Text style={s.sectionTitle}>{t("freeTitle")}</Text>
    <View style={s.featureCard}>
      {[t("free1"),t("free2"),t("free3"),t("free4")].map(x=><View style={s.featureRow} key={x}><Text style={s.check}>✓</Text><Text style={s.featureText}>{x}</Text></View>)}
    </View>
    <Text style={s.sectionTitle}>{t("benefitsTitle")}</Text>
    <View style={s.featureCard}>
      {[t("benefit1"),t("benefit2"),t("benefit3"),t("benefit4")].map(x=><View style={s.featureRow} key={x}><Text style={s.plusCheck}>✦</Text><Text style={s.featureText}>{x}</Text></View>)}
    </View>
    <Text style={s.disclaimer}>{t("plusDisclaimer")}</Text>
    <Pressable style={s.primary} onPress={saveInterest}><Text style={s.primaryText}>{interested?t("interestSaved"):t("interestButton")}</Text></Pressable>
    <Text style={s.small}>{t("interestNote")}</Text>
    <Pressable style={s.secondary} onPress={()=>router.replace("/")}><Text style={s.secondaryText}>{t("freeButton")}</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

const makeStyles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},container:{padding:21,paddingTop:24,paddingBottom:36},back:{color:c.muted,fontSize:14,fontWeight:"700",marginBottom:20},
 hero:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:24,padding:21,marginBottom:24},logo:{width:48,height:48,borderRadius:16,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:17},logoText:{color:c.accent,fontSize:24,fontWeight:"900"},eyebrow:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:2},title:{color:c.text,fontSize:29,fontWeight:"900",letterSpacing:-.8,lineHeight:34,marginTop:9},subtitle:{color:c.muted,fontSize:14,lineHeight:21,marginTop:10},currencyLabel:{color:c.text,fontSize:12,fontWeight:"900",marginTop:19,marginBottom:8},currencyRow:{flexDirection:"row",flexWrap:"wrap",gap:6},currencyOption:{paddingHorizontal:11,paddingVertical:9,borderRadius:10,borderWidth:1,borderColor:c.border,backgroundColor:c.input},currencyOptionActive:{backgroundColor:c.accentSoft,borderColor:c.accent},currencyCode:{color:c.muted,fontSize:11,fontWeight:"900"},currencyCodeActive:{color:c.accent},currencyNote:{color:c.subtle,fontSize:10,lineHeight:15,marginTop:7},priceRow:{flexDirection:"row",alignItems:"baseline",gap:5,marginTop:19},price:{color:c.text,fontSize:29,fontWeight:"900"},per:{color:c.muted,fontSize:12},coming:{alignSelf:"flex-start",marginTop:15,paddingHorizontal:10,paddingVertical:7,borderRadius:9,backgroundColor:c.accentSoft},comingText:{color:c.accent,fontSize:9,fontWeight:"900",letterSpacing:.7},
 statusCard:{backgroundColor:c.surfaceAlt,borderWidth:1,borderColor:c.border,borderRadius:16,padding:15,marginTop:-8,marginBottom:22},statusLabel:{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:1.1,textTransform:"uppercase"},statusTitle:{color:c.text,fontSize:15,fontWeight:"900",marginTop:6},statusText:{color:c.muted,fontSize:11,lineHeight:16,marginTop:5},sectionTitle:{color:c.text,fontSize:17,fontWeight:"900",marginBottom:10,marginTop:2},featureCard:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:16,marginBottom:20},featureRow:{flexDirection:"row",alignItems:"flex-start",gap:11,marginVertical:7},check:{color:c.accent,fontSize:15,fontWeight:"900",width:17},plusCheck:{color:c.accent,fontSize:15,fontWeight:"900",width:17},featureText:{color:c.text,fontSize:13,lineHeight:19,flex:1},disclaimer:{color:c.subtle,fontSize:11,lineHeight:17,marginBottom:16},primary:{height:50,borderRadius:14,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},primaryText:{color:c.onAccent,fontWeight:"900",fontSize:14},small:{color:c.subtle,fontSize:10,lineHeight:15,textAlign:"center",marginTop:9},secondary:{height:47,borderRadius:14,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center",marginTop:14},secondaryText:{color:c.text,fontWeight:"800",fontSize:13}
});
