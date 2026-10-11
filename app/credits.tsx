import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import BottomNav from "../components/BottomNav";
import SnapStudyMark from "../components/SnapStudyMark";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";

export default function Credits() {
  const { colors: c } = useTheme();
  const { language } = useLanguage();
  const s = makeStyles(c);
  const sv = language === "sv";
  const ar = language === "ar";
  const copy = {
    title: sv ? "Krediter och attribution" : ar ? "الشكر ونسب الفضل" : "Credits and attribution",
    subtitle: sv ? "Lite om människorna och idéerna bakom SnapStudy." : ar ? "نبذة عن الأشخاص والأفكار وراء سناب ستدي." : "A little about the people and ideas behind SnapStudy.",
    introTitle: sv ? "Lär dig på ditt sätt." : ar ? "تعلّم بطريقتك." : "Learn in your own way.",
    intro: sv ? "SnapStudy är byggt för att göra studier mer fokuserade, aktiva och lättare att komma tillbaka till." : ar ? "صُمّم سناب ستدي ليجعل الدراسة أكثر تركيزًا وتفاعلًا وأسهل في المتابعة." : "SnapStudy is designed to make studying more focused, active, and easier to return to.",
    product: sv ? "PRODUKT OCH DESIGN" : ar ? "المنتج والتصميم" : "PRODUCT & DESIGN",
    productBody: sv ? "SnapStudy · Produktidé, visuell identitet och användarupplevelse." : ar ? "سناب ستدي · فكرة المنتج والهوية البصرية وتجربة الاستخدام." : "SnapStudy · Product concept, visual identity, and user experience.",
    learning: sv ? "LÄRANDE OCH INNEHÅLL" : ar ? "التعلّم والمحتوى" : "LEARNING & CONTENT",
    learningBody: sv ? "Studieverktygen skapas utifrån anteckningarna du väljer. Jämför alltid viktiga fakta med ditt kursmaterial." : ar ? "تُعدّ أدوات الدراسة من الملاحظات التي تختارها. قارن دائمًا المعلومات المهمة بموادك الدراسية." : "Study tools are prepared from the notes you choose. Always compare important facts with your class materials.",
    sponsored: sv ? "SPONSRAT INNEHÅLL" : ar ? "المحتوى المدعوم" : "SPONSORED CONTENT",
    sponsoredBody: sv ? "Sponsrat innehåll märks tydligt och hålls separat från dina studiefrågor och svar." : ar ? "يُوضَع المحتوى المدعوم بعلامة واضحة ويظل منفصلًا عن أسئلة الدراسة وإجاباتها." : "Sponsored content is clearly labeled and kept separate from your study questions and answers.",
    thanks: sv ? "TACK" : ar ? "شكرًا" : "ACKNOWLEDGEMENTS",
    thanksBody: sv ? "Till elever, lärare och kreatörer som delar idéer och hjälper till att göra digitalt lärande mer användbart." : ar ? "إلى الطلاب والمعلمين والمبدعين الذين يشاركون الأفكار ويساعدون في جعل التعلّم الرقمي أكثر فائدة." : "To students, teachers, and creators who share ideas and help make digital learning more useful.",
    creator: sv ? "BAKOM SNAPSTUDY" : ar ? "وراء سناب ستدي" : "BEHIND SNAPSTUDY",
    creatorRole: sv ? "Oberoende utvecklare · Sverige" : ar ? "مطوّر مستقل · السويد" : "Independent developer · Sweden",
    creatorBody: sv ? "Jag är YAZONI. Jag bygger digitala produkter med fokus på genomtänkt design och funktioner som faktiskt hjälper." : ar ? "أنا YAZONI. أبني منتجات رقمية تركّز على التصميم المدروس والميزات المفيدة فعلًا." : "I'm YAZONI. I build digital products with a focus on thoughtful design and features that genuinely help.",
    work: sv ? "Fler projekt" : ar ? "المزيد من المشاريع" : "Explore more work",
    back: sv ? "Tillbaka" : ar ? "رجوع" : "Back",
  };
  const sections = [
    { icon: "color-palette-outline" as const, title: copy.product, body: copy.productBody, tint: "#9A7BFF" },
    { icon: "book-outline" as const, title: copy.learning, body: copy.learningBody, tint: "#48BFA0" },
    { icon: "megaphone-outline" as const, title: copy.sponsored, body: copy.sponsoredBody, tint: "#E6A44C" },
    { icon: "heart-outline" as const, title: copy.thanks, body: copy.thanksBody, tint: "#E77FAF" },
  ];
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        <Pressable style={s.backRow} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name={ar ? "arrow-forward" : "arrow-back"} size={18} color={c.text} />
          <Text style={s.backText}>{copy.back}</Text>
        </Pressable>
        <View style={s.hero}>
          <View pointerEvents="none" style={s.glowA} />
          <View pointerEvents="none" style={s.glowB} />
          <View style={s.mark}><SnapStudyMark size={44} /></View>
          <Text style={s.eyebrow}>SNAPSTUDY · ABOUT</Text>
          <Text style={s.title}>{copy.title}</Text>
          <Text style={s.subtitle}>{copy.subtitle}</Text>
        </View>
        <View style={s.introCard}>
          <View style={s.introIcon}><Ionicons name="sparkles" size={21} color={c.accent} /></View>
          <Text style={s.introTitle}>{copy.introTitle}</Text>
          <Text style={s.body}>{copy.intro}</Text>
        </View>
        <Text style={s.sectionLabel}>{sv ? "CREDITS" : ar ? "الشكر والتقدير" : "CREDITS"}</Text>
        {sections.map(item => (
          <View key={item.title} style={s.creditCard}>
            <View style={[s.iconBox, { backgroundColor: item.tint + "20" }]}>
              <Ionicons name={item.icon} size={20} color={item.tint} />
            </View>
            <View style={s.copyWrap}>
              <Text style={s.cardLabel}>{item.title}</Text>
              <Text style={s.cardBody}>{item.body}</Text>
            </View>
          </View>
        ))}
        <View style={s.creatorCard}>
          <View style={s.creatorTop}>
            <View style={s.creatorMark}><Text style={s.creatorMarkText}>Y</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.creatorLabel}>{copy.creator}</Text>
              <Text style={s.creatorName}>YAZONI</Text>
              <Text style={s.creatorRole}>{copy.creatorRole}</Text>
            </View>
            <Ionicons name="sparkles" size={22} color={c.accent} />
          </View>
          <Text style={s.cardBody}>{copy.creatorBody}</Text>
          <View style={s.divider} />
          <Pressable style={s.linkRow} onPress={() => Linking.openURL("https://github.com/yazoniplay").catch(() => {})}>
            <View style={s.linkIcon}><Ionicons name="logo-github" size={19} color={c.text} /></View>
            <View style={{ flex: 1 }}><Text style={s.linkTitle}>GitHub</Text><Text style={s.linkSub}>{sv ? "Projekt och kod" : ar ? "المشاريع والشفرة" : "Projects and code"}</Text></View>
            <Ionicons name="arrow-up-right" size={18} color={c.muted} />
          </Pressable>
          <Pressable style={s.linkRow} onPress={() => Linking.openURL("https://www.youtube.com/@yazoniiimc").catch(() => {})}>
            <View style={s.linkIcon}><Ionicons name="logo-youtube" size={19} color="#F06464" /></View>
            <View style={{ flex: 1 }}><Text style={s.linkTitle}>YouTube</Text><Text style={s.linkSub}>{sv ? "Videor och projekt" : ar ? "الفيديوهات والمشاريع" : "Videos and projects"}</Text></View>
            <Ionicons name="arrow-up-right" size={18} color={c.muted} />
          </Pressable>
        </View>
        <Text style={s.footer}>SNAPSTUDY · {sv ? "BYGGT FÖR ATT HJÄLPA DIG LÄRA" : ar ? "مصمم لمساعدتك على التعلّم" : "BUILT TO HELP YOU LEARN"}</Text>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  container: { padding: 20, paddingTop: 16, paddingBottom: 110 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, marginBottom: 14 },
  backText: { color: c.text, fontSize: 13, fontWeight: "800" },
  hero: { borderRadius: 26, padding: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: "hidden", marginBottom: 14 },
  glowA: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: c.accent, opacity: 0.12, top: -75, right: -55 },
  glowB: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "#F08AB8", opacity: 0.1, bottom: -70, left: -45 },
  mark: { width: 62, height: 62, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 17 },
  eyebrow: { color: c.accent, fontSize: 9, fontWeight: "900", letterSpacing: 2.1 },
  title: { color: c.text, fontSize: 29, fontWeight: "900", letterSpacing: -0.9, marginTop: 8 },
  subtitle: { color: c.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  introCard: { padding: 19, borderRadius: 21, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginBottom: 23 },
  introIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  introTitle: { color: c.text, fontSize: 19, fontWeight: "900", letterSpacing: -0.4 },
  body: { color: c.muted, fontSize: 13, lineHeight: 21, marginTop: 7 },
  sectionLabel: { color: c.muted, fontSize: 10, fontWeight: "900", letterSpacing: 2, marginBottom: 11, marginLeft: 3 },
  creditCard: { flexDirection: "row", gap: 13, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginBottom: 10 },
  iconBox: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  copyWrap: { flex: 1, gap: 6 },
  cardLabel: { color: c.text, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  cardBody: { color: c.muted, fontSize: 12, lineHeight: 19 },
  creatorCard: { padding: 18, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginTop: 12 },
  creatorTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  creatorMark: { width: 52, height: 52, borderRadius: 17, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  creatorMarkText: { color: c.onAccent, fontSize: 28, fontWeight: "900" },
  creatorLabel: { color: c.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  creatorName: { color: c.text, fontSize: 19, fontWeight: "900", letterSpacing: 1.4, marginTop: 3 },
  creatorRole: { color: c.muted, fontSize: 10, fontWeight: "700", marginTop: 3 },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
  linkRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 11, borderTopWidth: 1, borderTopColor: c.border },
  linkIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.input, alignItems: "center", justifyContent: "center" },
  linkTitle: { color: c.text, fontSize: 13, fontWeight: "900" },
  linkSub: { color: c.muted, fontSize: 10, marginTop: 3 },
  footer: { color: c.subtle, fontSize: 8, fontWeight: "900", letterSpacing: 1.6, textAlign: "center", marginTop: 23 },
});
