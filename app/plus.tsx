import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
import { NO_PLUS_ENTITLEMENT, hasPlusFeature, loadPlusEntitlement, loadPlusTrialStatus, startPlusTrial, type PlusEntitlement, type PlusTrialStatus } from "../lib/plus";
import { supabase } from "../lib/supabase";

export default function Plus() {
  const { colors:c } = useTheme();
  const { t, language } = useLanguage();
  const params = useLocalSearchParams<{ plus?: string }>();
  const s = makeStyles(c);
  const [entitlement,setEntitlement] = useState<PlusEntitlement>(NO_PLUS_ENTITLEMENT);
  const [checkoutBusy,setCheckoutBusy] = useState(false);
  const [checkoutError,setCheckoutError] = useState("");
  const [trialStatus,setTrialStatus] = useState<PlusTrialStatus>({used:false,active:false,startedAt:null,expiresAt:null});
  const [trialBusy,setTrialBusy] = useState(false);
  const plusActive = hasPlusFeature(entitlement,"extra_scans");

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const [value, trial] = await Promise.all([loadPlusEntitlement(), loadPlusTrialStatus()]);
      if (mounted) { setEntitlement(value); setTrialStatus(trial); }
    };
    void refresh();
    if (params.plus === "success") {
      const timer = setTimeout(() => { void refresh(); }, 2500);
      return () => { mounted = false; clearTimeout(timer); };
    }
    return () => { mounted = false; };
  }, [params.plus]);

  async function beginTrial() {
    setCheckoutError("");
    setTrialBusy(true);
    try {
      const trial = await startPlusTrial();
      setTrialStatus(trial);
      setEntitlement(await loadPlusEntitlement());
    } catch (error: any) {
      setCheckoutError(error?.message || "Could not start the trial. Please try again.");
    } finally {
      setTrialBusy(false);
    }
  }

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
      <LinearGradient colors={trialStatus.active ? ["#4FBD9A", "#63C9D2"] : ["#7957F5", "#A36DF5", "#E58EC3"]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.trialCard}>
        <View style={s.trialTop}>
          <View style={s.trialIcon}><Ionicons name={trialStatus.active ? "checkmark-circle" : "sparkles"} size={22} color="#FFFFFF" /></View>
          <View style={{flex:1}}>
            <Text style={s.trialTitle}>{trialStatus.active ? (language==="sv" ? "Din 2-dagars Pro-testperiod är aktiv" : language==="ar" ? "الفترة التجريبية لمدة يومين نشطة" : "Your 2-day Pro trial is active") : trialStatus.used ? (language==="sv" ? "Testperioden har redan använts" : language==="ar" ? "تم استخدام الفترة التجريبية" : "Your trial has already been used") : (language==="sv" ? "Pro gratis i 2 dagar" : language==="ar" ? "جرّب برو مجانًا لمدة يومين" : "Try Pro free for 2 days")}</Text>
            <Text style={s.trialBody}>{trialStatus.active ? (language==="sv" ? "Inga betalningar. Pro-förhandsvisningen avslutas automatiskt." : language==="ar" ? "لا توجد مدفوعات. تنتهي التجربة تلقائيًا." : "No payment or card required. Preview access expires automatically.") : trialStatus.used ? (language==="sv" ? "Den här enhetens testperiod kan inte startas igen." : language==="ar" ? "لا يمكن بدء التجربة مرة أخرى على هذا الجهاز." : "The free preview can only be started once on this device.") : (language==="sv" ? "48 timmar med Pro-funktioner. Inget kort och ingen automatisk debitering." : language==="ar" ? "48 ساعة من ميزات برو. بدون بطاقة أو رسوم تلقائية." : "48 hours of Pro preview. No card and no automatic charge.")}</Text>
          </View>
        </View>
        {trialStatus.active && trialStatus.expiresAt ? <Text style={s.trialExpiry}>{language==="sv" ? "Slutar " : language==="ar" ? "تنتهي " : "Ends "}{new Date(trialStatus.expiresAt).toLocaleString()}</Text> : null}
        {!trialStatus.used ? <Pressable style={s.trialButton} disabled={trialBusy} onPress={beginTrial}><Text style={s.trialButtonText}>{trialBusy ? (language==="sv" ? "Startar…" : language==="ar" ? "جارٍ البدء…" : "Starting…") : (language==="sv" ? "Starta gratis testperiod →" : language==="ar" ? "ابدأ التجربة المجانية ←" : "Start my free trial →")}</Text></Pressable> : null}
      </LinearGradient>
      {params.plus === "success" ? <View style={s.notice}><Text style={s.noticeText}>Checkout complete. Your Plus access will appear after the payment confirmation is verified.</Text></View> : null}
      {params.plus === "cancelled" ? <View style={s.notice}><Text style={s.noticeText}>Checkout was cancelled. You haven't been charged.</Text></View> : null}
    </View>
    <View style={s.statusCard}><Text style={s.statusLabel}>{t("plusStatusTitle")}</Text><Text style={s.statusTitle}>{trialStatus.active ? (language==="sv" ? "Gratis Pro-testperiod aktiv" : language==="ar" ? "الفترة التجريبية المجانية نشطة" : "Free Pro trial active") : plusActive ? t("plusActiveStatus") : t("freePlanActive")}</Text><Text style={s.statusText}>{trialStatus.active ? (language==="sv" ? "Du har Pro-förhandsvisning i 48 timmar. Den avslutas automatiskt utan debitering." : language==="ar" ? "لديك تجربة برو لمدة 48 ساعة وتنتهي تلقائيًا دون رسوم." : "Your 48-hour Pro preview is active. It expires automatically with no charge.") : plusActive ? t("plusActiveBody") : t("plusNotActive")}</Text></View>
    <Text style={s.sectionTitle}>{t("freeTitle")}</Text>
    <View style={s.featureCard}>
      {[t("free1"),t("free2"),t("free3"),t("free4")].map(x=><View style={s.featureRow} key={x}><Text style={s.check}>✓</Text><Text style={s.featureText}>{x}</Text></View>)}
    </View>
    <Text style={s.sectionTitle}>{t("benefitsTitle")}</Text>
    <View style={s.featureCard}>
      {[t("benefit1"),t("benefit2"),t("benefit3"),t("benefit4")].map(x=><View style={s.featureRow} key={x}><Text style={s.plusCheck}>✦</Text><Text style={s.featureText}>{x}</Text></View>)}
    </View>
    <Text style={s.sectionTitle}>More ways to study with Pro</Text>
    <View style={s.proGrid}>
      {[
        {icon:"sparkles" as const,title:"AI study coach",body:"Step-by-step explanations and follow-up practice.",status:"Planned"},
        {icon:"school-outline" as const,title:"Exam prep packs",body:"Revision plans, practice sets and exam-day checklists.",status:"Planned"},
        {icon:"repeat-outline" as const,title:"Smart review",body:"Bring back difficult cards and revisit weak topics.",status:"In app"},
        {icon:"time-outline" as const,title:"Focus sessions",body:"Timed study blocks with progress and breaks.",status:"In app"},
        {icon:"cloud-download-outline" as const,title:"Export study packs",body:"Save your summaries and flashcards for offline use.",status:trialStatus.active ? "Trial unlocked" : "Pro feature"},
        {icon:"color-palette-outline" as const,title:"Personal themes",body:"Make the study space feel like yours.",status:"In app"},
        {icon:"albums-outline" as const,title:"Longer study history",body:"Keep more of your generated sessions together.",status:trialStatus.active ? "Trial unlocked" : "Pro feature"},
        {icon:"eye-off-outline" as const,title:"Ad-free sessions",body:"No banner ads while trial access is active.",status:trialStatus.active ? "Trial unlocked" : "Trial feature"},
      ].map(feature=><View key={feature.title} style={s.proFeature}><View style={s.proFeatureTop}><View style={s.proFeatureIcon}><Ionicons name={feature.icon} size={19} color={c.accent}/></View><Text style={s.proFeatureStatus}>{feature.status}</Text></View><Text style={s.proFeatureTitle}>{feature.title}</Text><Text style={s.proFeatureBody}>{feature.body}</Text></View>)}
    </View>
    <Text style={s.disclaimer}>The 2-day trial is a no-payment preview stored on this device. It does not automatically convert into a paid subscription. Paid web subscriptions are separate and require server-verified billing. Google Play and Apple in-app purchases are not enabled yet.</Text>
    {Platform.OS === "web" ? <Pressable style={[s.primary,checkoutBusy&&s.primaryDisabled]} disabled={checkoutBusy} onPress={startCheckout}><Text style={s.primaryText}>{checkoutBusy ? "Opening secure checkout…" : "Subscribe · 29 kr/month"}</Text></Pressable> : <View style={s.nativeNotice}><Text style={s.nativeNoticeText}>In-app purchases are coming soon</Text></View>}
    {checkoutError ? <Text accessibilityRole="alert" style={s.error}>{checkoutError}</Text> : null}
    <Text style={s.small}>Recurring monthly payment. Manage or cancel through the payment provider.</Text>
    <Pressable style={s.secondary} onPress={()=>router.replace("/")}><Text style={s.secondaryText}>{t("freeButton")}</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

const makeStyles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},container:{padding:21,paddingTop:24,paddingBottom:36},back:{color:c.muted,fontSize:14,fontWeight:"700",marginBottom:20},trialCard:{borderRadius:19,padding:15,marginTop:17},trialTop:{flexDirection:"row",alignItems:"flex-start",gap:11},trialIcon:{width:40,height:40,borderRadius:14,backgroundColor:"rgba(255,255,255,0.2)",alignItems:"center",justifyContent:"center"},trialTitle:{color:"#FFFFFF",fontSize:15,fontWeight:"900",lineHeight:20},trialBody:{color:"rgba(255,255,255,0.92)",fontSize:11,lineHeight:16,marginTop:4},trialExpiry:{color:"#FFFFFF",fontSize:11,fontWeight:"800",marginTop:12},trialButton:{backgroundColor:"#FFFFFF",borderRadius:12,paddingVertical:12,alignItems:"center",marginTop:14},trialButtonText:{color:"#6946DA",fontSize:13,fontWeight:"900"},proGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,marginBottom:18},proFeature:{width:"48%",minHeight:144,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:17,padding:13},proFeatureTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:5},proFeatureIcon:{width:34,height:34,borderRadius:11,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},proFeatureStatus:{color:c.muted,fontSize:8,fontWeight:"900",textTransform:"uppercase",flexShrink:1},proFeatureTitle:{color:c.text,fontSize:13,fontWeight:"900",marginTop:12},proFeatureBody:{color:c.muted,fontSize:11,lineHeight:16,marginTop:5},
 hero:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:24,padding:21,marginBottom:24},logo:{width:48,height:48,borderRadius:16,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:17},logoText:{color:c.accent,fontSize:24,fontWeight:"900"},eyebrow:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:2},title:{color:c.text,fontSize:29,fontWeight:"900",letterSpacing:-.8,lineHeight:34,marginTop:9},subtitle:{color:c.muted,fontSize:14,lineHeight:21,marginTop:10},priceRow:{flexDirection:"row",alignItems:"baseline",gap:5,marginTop:19},price:{color:c.text,fontSize:29,fontWeight:"900"},per:{color:c.muted,fontSize:12},priceNote:{color:c.subtle,fontSize:11,marginTop:5},notice:{marginTop:14,padding:12,borderRadius:12,backgroundColor:c.accentSoft},noticeText:{color:c.text,fontSize:12,lineHeight:18},
 statusCard:{backgroundColor:c.surfaceAlt,borderWidth:1,borderColor:c.border,borderRadius:16,padding:15,marginTop:-8,marginBottom:22},statusLabel:{color:c.muted,fontSize:10,fontWeight:"900",letterSpacing:1.1,textTransform:"uppercase"},statusTitle:{color:c.text,fontSize:15,fontWeight:"900",marginTop:6},statusText:{color:c.muted,fontSize:11,lineHeight:16,marginTop:5},sectionTitle:{color:c.text,fontSize:17,fontWeight:"900",marginBottom:10,marginTop:2},featureCard:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:16,marginBottom:20},featureRow:{flexDirection:"row",alignItems:"flex-start",gap:11,marginVertical:7},check:{color:c.accent,fontSize:15,fontWeight:"900",width:17},plusCheck:{color:c.accent,fontSize:15,fontWeight:"900",width:17},featureText:{color:c.text,fontSize:13,lineHeight:19,flex:1},disclaimer:{color:c.subtle,fontSize:11,lineHeight:17,marginBottom:16},primary:{height:50,borderRadius:14,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},primaryDisabled:{opacity:.65},primaryText:{color:c.onAccent,fontWeight:"900",fontSize:14},error:{color:"#e45b62",fontSize:12,lineHeight:18,marginTop:10},nativeNotice:{padding:14,borderRadius:14,borderWidth:1,borderColor:c.border,alignItems:"center"},nativeNoticeText:{color:c.muted,fontWeight:"800",fontSize:13},small:{color:c.subtle,fontSize:10,lineHeight:15,textAlign:"center",marginTop:9},secondary:{height:47,borderRadius:14,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center",marginTop:14},secondaryText:{color:c.text,fontWeight:"800",fontSize:13}
});
