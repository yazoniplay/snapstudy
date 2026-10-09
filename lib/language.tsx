import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppLanguage = "en" | "sv" | "ar";
const dictionaries = {
 en: {
  home:"Home",history:"History",account:"Account",language:"App language",languageSub:"Choose English, Swedish or Arabic. Your choice is remembered.",english:"English",swedish:"Swedish",arabic:"Arabic",
  studySmarter:"Study smarter.",ready:"Ready to learn?",dayStreak:"day streak",sessions:"sessions",questions:"questions",
  turnNotes:"Turn notes into a study session",scanSub:"Scan a page for a summary, key concepts, an explanation, a study plan and practice.",
  scanNotes:"📷  Scan notes",choosePhotos:"Choose from photos",yourToolkit:"Your toolkit",recentSessions:"Recent sessions",historyTitle:"Study history",historySub:"Pick up where you left off.",libraryLabel:"YOUR LIBRARY",emptyHistory:"Nothing here yet",emptyHistorySub:"Scan your first page and your study session will show up here.",startStudying:"Start studying",viewAll:"View all →",
  flashcards:"Flashcards",recallFaster:"Recall faster",smartQuiz:"Smart quiz",instantFeedback:"Instant feedback",practiceTest:"Practice test",examMode:"Exam mode",summary:"Summary",keyIdeas:"Key ideas",
  betterScans:"Better scans = better answers",scanTip:"Use good lighting and keep the whole page inside the frame.",settings:"Account & settings →",
  back:"‹  Back",profile:"Your profile",manageAccount:"Manage your SnapStudy account.",name:"Name",yourName:"Your name",email:"Email",saveChanges:"Save changes",saving:"Saving…",appearance:"Appearance",appearanceSub:"Choose the look you prefer. This setting is saved on this device.",light:"☀ Light",dark:"☾ Dark",session:"Session",sessionSub:"You are signed in and your account session is stored securely on this device.",signOut:"Sign out",loading:"Loading…",saved:"Saved",profileUpdated:"Your profile was updated.",couldntSave:"Couldn't save",
  newScan:"‹  New scan",studySession:"STUDY SESSION",explain:"Explain simply",keyConcepts:"Key concepts",studyPlan:"Study plan",teachBack:"Teach it back",focusTimer:"Focus timer",tapReveal:"Tap to reveal answer",question:"Question",answer:"Answer",previous:"Previous",next:"Next",startFocus:"Start 25-minute focus",pause:"Pause",resume:"Resume",reset:"Reset",minutes:"minutes",writeExplanation:"Write an explanation in your own words…",teachBackTip:"Try explaining the topic without looking at your notes.",planStep1:"Read the summary once",planStep2:"Explain the key concepts aloud",planStep3:"Test yourself with flashcards",planStep4:"Finish by teaching it back",simpleExplanation:"In plain language",keyConceptHint:"These are the main ideas pulled from your generated flashcards.",focusDone:"Focus session complete 🎉",focusReady:"Put distractions away and work on this topic.",cameraHint:"Frame your notes"
 },
 sv: {
  home:"Hem",history:"Historik",account:"Konto",language:"Appspråk",languageSub:"Välj engelska, svenska eller arabiska. Ditt val sparas.",english:"Engelska",swedish:"Svenska",arabic:"Arabiska",
  studySmarter:"Plugga smartare.",ready:"Redo att lära dig?",dayStreak:"dagars svit",sessions:"pass",questions:"frågor",
  turnNotes:"Gör anteckningar till ett pluggpass",scanSub:"Skanna en sida och få en sammanfattning, nyckelbegrepp, en förklaring, en studieplan och övningar.",
  scanNotes:"📷  Skanna anteckningar",choosePhotos:"Välj från bilder",yourToolkit:"Dina verktyg",recentSessions:"Senaste passen",historyTitle:"Studiehistorik",historySub:"Fortsätt där du slutade.",libraryLabel:"DITT BIBLIOTEK",emptyHistory:"Inget här ännu",emptyHistorySub:"Skanna din första sida så visas ditt pluggpass här.",startStudying:"Börja plugga",viewAll:"Visa alla →",
  flashcards:"Flashcards",recallFaster:"Träna minnet",smartQuiz:"Snabbquiz",instantFeedback:"Direkt feedback",practiceTest:"Övningsprov",examMode:"Provläge",summary:"Sammanfattning",keyIdeas:"Viktigaste idéerna",
  betterScans:"Bättre bilder = bättre svar",scanTip:"Ha bra belysning och se till att hela sidan syns.",settings:"Konto och inställningar →",
  back:"‹  Tillbaka",profile:"Din profil",manageAccount:"Hantera ditt SnapStudy-konto.",name:"Namn",yourName:"Ditt namn",email:"E-post",saveChanges:"Spara ändringar",saving:"Sparar…",appearance:"Utseende",appearanceSub:"Välj utseende. Inställningen sparas på den här enheten.",light:"☀ Ljust",dark:"☾ Mörkt",session:"Session",sessionSub:"Du är inloggad och din session sparas säkert på den här enheten.",signOut:"Logga ut",loading:"Laddar…",saved:"Sparat",profileUpdated:"Din profil har uppdaterats.",couldntSave:"Kunde inte spara",
  newScan:"‹  Ny skanning",studySession:"PLUGGPASS",explain:"Förklara enkelt",keyConcepts:"Nyckelbegrepp",studyPlan:"Studieplan",teachBack:"Förklara själv",focusTimer:"Fokustimer",tapReveal:"Tryck för att visa svaret",question:"Fråga",answer:"Svar",previous:"Föregående",next:"Nästa",startFocus:"Starta 25 min fokus",pause:"Pausa",resume:"Fortsätt",reset:"Börja om",minutes:"minuter",writeExplanation:"Förklara med egna ord…",teachBackTip:"Försök förklara ämnet utan att titta på anteckningarna.",planStep1:"Läs sammanfattningen en gång",planStep2:"Förklara nyckelbegreppen högt",planStep3:"Testa dig med flashcards",planStep4:"Avsluta med att förklara själv",simpleExplanation:"Förklarat enkelt",keyConceptHint:"Här är huvudidéerna från dina skapade flashcards.",focusDone:"Fokuspassets klart 🎉",focusReady:"Lägg undan distraktioner och fokusera på ämnet.",cameraHint:"Rama in anteckningarna"
 },
 ar: {
  home:"الرئيسية",history:"السجل",account:"الحساب",language:"لغة التطبيق",languageSub:"اختر الإنجليزية أو السويدية أو العربية. سيتم حفظ اختيارك.",english:"الإنجليزية",swedish:"السويدية",arabic:"العربية",
  studySmarter:"ذاكر بذكاء.",ready:"هل أنت مستعد للتعلّم؟",dayStreak:"أيام متتالية",sessions:"جلسات",questions:"أسئلة",
  turnNotes:"حوّل ملاحظاتك إلى جلسة دراسة",scanSub:"امسح صفحة للحصول على ملخص ومفاهيم أساسية وشرح وخطة دراسة وتمارين.",
  scanNotes:"📷  امسح الملاحظات",choosePhotos:"اختر من الصور",yourToolkit:"أدواتك",recentSessions:"الجلسات الأخيرة",historyTitle:"سجل الدراسة",historySub:"تابع من حيث توقفت.",libraryLabel:"مكتبتك",emptyHistory:"لا يوجد شيء هنا بعد",emptyHistorySub:"امسح صفحتك الأولى لتظهر جلسة الدراسة هنا.",startStudying:"ابدأ الدراسة",viewAll:"عرض الكل ←",
  flashcards:"بطاقات تعليمية",recallFaster:"تقوية التذكّر",smartQuiz:"اختبار سريع",instantFeedback:"ملاحظات فورية",practiceTest:"اختبار تدريبي",examMode:"وضع الامتحان",summary:"الملخص",keyIdeas:"أهم الأفكار",
  betterScans:"صور أوضح = إجابات أفضل",scanTip:"استخدم إضاءة جيدة وتأكد من ظهور الصفحة كاملة.",settings:"الحساب والإعدادات ←",
  back:"‹  رجوع",profile:"ملفك الشخصي",manageAccount:"إدارة حساب SnapStudy.",name:"الاسم",yourName:"اسمك",email:"البريد الإلكتروني",saveChanges:"حفظ التغييرات",saving:"جارٍ الحفظ…",appearance:"المظهر",appearanceSub:"اختر المظهر الذي تفضله. يُحفظ هذا الإعداد على الجهاز.",light:"☀ فاتح",dark:"☾ داكن",session:"الجلسة",sessionSub:"أنت مسجّل الدخول وتُحفظ جلستك بأمان على هذا الجهاز.",signOut:"تسجيل الخروج",loading:"جارٍ التحميل…",saved:"تم الحفظ",profileUpdated:"تم تحديث ملفك الشخصي.",couldntSave:"تعذر الحفظ",
  newScan:"‹  مسح جديد",studySession:"جلسة دراسة",explain:"شرح مبسّط",keyConcepts:"المفاهيم الأساسية",studyPlan:"خطة الدراسة",teachBack:"اشرح بنفسك",focusTimer:"مؤقّت التركيز",tapReveal:"اضغط لإظهار الإجابة",question:"السؤال",answer:"الإجابة",previous:"السابق",next:"التالي",startFocus:"ابدأ تركيزًا لمدة 25 دقيقة",pause:"إيقاف مؤقت",resume:"متابعة",reset:"إعادة",minutes:"دقائق",writeExplanation:"اكتب شرحًا بأسلوبك…",teachBackTip:"حاول شرح الموضوع دون النظر إلى ملاحظاتك.",planStep1:"اقرأ الملخص مرة واحدة",planStep2:"اشرح المفاهيم الأساسية بصوت عالٍ",planStep3:"اختبر نفسك بالبطاقات",planStep4:"اختم بشرح الموضوع بنفسك",simpleExplanation:"شرح بلغة بسيطة",keyConceptHint:"هذه أهم الأفكار المستخلصة من البطاقات التي تم إنشاؤها.",focusDone:"اكتملت جلسة التركيز 🎉",focusReady:"أبعد المشتتات وركّز على هذا الموضوع.",cameraHint:"ضع الملاحظات داخل الإطار"
 }
} as const;
type TranslationKey = keyof typeof dictionaries.en;
type LanguageContextValue = { language: AppLanguage; setLanguage: (language: AppLanguage) => void; t: (key: TranslationKey) => string };
const Context = createContext<LanguageContextValue>({language:"en",setLanguage:()=>{},t:(key)=>dictionaries.en[key]});
export function LanguageProvider({children}:{children:React.ReactNode}) {
 const [language,setLanguageState]=useState<AppLanguage>("en");
 useEffect(()=>{AsyncStorage.getItem("snapstudy:language").then(value=>{if(value==="en"||value==="sv"||value==="ar")setLanguageState(value)}).catch(()=>{});},[]);
 const setLanguage=(next:AppLanguage)=>{setLanguageState(next);AsyncStorage.setItem("snapstudy:language",next).catch(()=>{});};
 const value=useMemo(()=>({language,setLanguage,t:(key:TranslationKey)=>dictionaries[language][key]||dictionaries.en[key]}),[language]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLanguage(){return useContext(Context);}
