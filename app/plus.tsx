import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
import { NO_PLUS_ENTITLEMENT, hasPlusFeature, loadPlusEntitlement, type PlusEntitlement } from "../lib/plus";
import { supabase } from "../lib/supabase";

export default function Plus() {
  const { colors:c } = useTheme();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ plus?: string }>();
  const s = makeStyles(c);
  const [entitlement,setEntitlement] = useState<PlusEntitlement>(NO_PLUS_ENTITLEMENT);
  const [checkoutBusy,setCheckoutBusy] = useState(false);
  const [checkoutError,setCheckoutError] = useState("");
  const plusActive = hasPlusFeature(entitlement,"extra_scans");

  useEffect(() => {
    let mounted = true;
    const refresh = () => loadPlusEntitlement().then(value => { if (mounted) setEntitlement(value); }).catch(() => {
      if (mounted) setEntitlement(NO_PLUS_ENTITLEMENT);
    });
    refresh();
    if (params.plus === "success") {
      const timer = setTimeout(refresh, 2500);
      return () => { mounted = false; clearTimeout(timer); };
    }
    return () => { mounted = false; };
  }, [params.plus]);

  async function startCheckout() {
    setCheckoutError("");
    if (Platform.OS !== "web") {
      Alert.alert("In-app purchases aren't ready yet", "Website payments are being connected first. Apple App Store and Google Play billing need their own setup.");
      return;
    }
    setCheckoutBusy(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setCheckoutError("Sign in to SnapStudy before subscribing.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-plus-checkout", { body: {} });
      if (error || !data?.url) {
        setCheckoutError(data?.error || error?.message || "Checkout couldn't start. Payments may not be configured yet.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setCheckoutError("Checkout couldn't start. Please try again.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
    <Pressable onPress={()=>router.back()}><Text style={s.back}>{t("plusBack")}</Text></Pressable>
    <View style={s.hero}>
      <View style={s.logo}><Text style={s.logoText}>✦</Text></View>
      <Text style={s.eyebrow}>SNAPSTUDY PLUS</Text>
      <Text style={s.title}>{t("plusHeroTitle")}</Text>
      <Text style={s.subtitle}>{t("plusHeroSub")}</Text>
      <View style={s.priceRow}><Text style={s.price}>29 kr</Text><Text style={s.per}>/ month</Text></View>
      <Text style={s.priceNote}>Monthly subscription · Swedish kronor (SEK)</Text>
      {params.plus === "success" ? <View style={s.notice}><Text style={s.noticeText}>Checkout complete. Your Plus access will appear after the payment confirmation is verified.</Text></View> : null}
      {params.plus === "cancelled" ? <View style={s.notice}><Text style={s.noticeText}>Checkout was cancelled. You haven't been charged.</Text></View> : null}
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
    <Text style={s.disclaimer}>Website subscriptions are processed by Stripe. Premium access is granted only after the server verifies the subscription. In-app purchases for iOS and Android are not enabled yet.</Text>
    {Platform.OS === "web" ? <Pressable style={[s.primary,checkoutBusy&&s.primaryDisabled]} disabled={checkoutBusy} onPress={startCheckout}><Text style={s.primaryText}>{checkoutBusy ? "Opening secure checkout…" : "Subscribe · 29 kr/month"}</Text></Pressable> : <View style={s.nativeNotice}><Text style={s.nativeNoticeText}>In-app purchases are coming soon</Text></View>}
    {checkoutError ? <Text accessibilityRole="alert" style={s.error}>{checkoutError}</Text> : null}
    <Text style={s.small}>Recurring monthly payment. Manage or cancel through the payment provider.</Text>
    <Pressable style={s.secondary} onPress={()=>router.replace("/")}><Text style={s.secondaryText}>{t("freeButton")}</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

const makeStyles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},container:{padding:21,paddingTop:24,paddingBottom:36},back:{color:c.muted,fontSize:14,fontWeight:"700",marginBottom:20},
 hero:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:24,padding:21,marginBottom:24},logo:{width:48,height:48,borderRadius:16,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:17},logoText:{color:c.accent,fontSize:24,fontWeight:"900"},eyebrow:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:2},title:{color:c.text,fontSize:29,fontWeight:"900",letterSpacing:-.8,lineHeight:34,marginTop:9},subtitle:{color:c.muted,fontSize:14,lineHeight:21,marginTop:10},priceRow:{flexDirection:"row",alignItems:"baseline",gap:5,marginTop:19},price:{color:c.text,fontSize:29,fontWeight:"900"},per:{color:c.muted,fontSize:12},priceNote:{color:c.subtle,fontSize:11,marginTop:5},notice:{marginTop:14,padding:12,borderRadius:12,backgroundColor:c.accentSoft},noticeText:{color:c.text,fontSize:12,lineHeight:18},
 statusCard:{backgroundColor:c.surfaceAlt,borderWidth:1,borderColor:c.border,borderRadius:16,padding:15,marginTop:-8,marginBottom:22},statusLabel:{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:1.1,textTransform:"uppercase"},statusTitle:{color:c.text,fontSize:15,fontWeight:"900",marginTop:6},statusText:{color:c.muted,fontSize:11,lineHeight:16,marginTop:5},sectionTitle:{color:c.text,fontSize:17,fontWeight:"900",marginBottom:10,marginTop:2},featureCard:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:16,marginBottom:20},featureRow:{flexDirection:"row",alignItems:"flex-start",gap:11,marginVertical:7},check:{color:c.accent,fontSize:15,fontWeight:"900",width:17},plusCheck:{color:c.accent,fontSize:15,fontWeight:"900",width:17},featureText:{color:c.text,fontSize:13,lineHeight:19,flex:1},disclaimer:{color:c.subtle,fontSize:11,lineHeight:17,marginBottom:16},primary:{height:50,borderRadius:14,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},primaryDisabled:{opacity:.65},primaryText:{color:c.onAccent,fontWeight:"900",fontSize:14},error:{color:"#e45b62",fontSize:12,lineHeight:18,marginTop:10},nativeNotice:{padding:14,borderRadius:14,borderWidth:1,borderColor:c.border,alignItems:"center"},nativeNoticeText:{color:c.muted,fontWeight:"800",fontSize:13},small:{color:c.subtle,fontSize:10,lineHeight:15,textAlign:"center",marginTop:9},secondary:{height:47,borderRadius:14,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center",marginTop:14},secondaryText:{color:c.text,fontWeight:"800",fontSize:13}
});
