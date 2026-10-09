import {useEffect,useMemo,useRef,useState} from "react";
import {ActivityIndicator,Animated,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {router, useLocalSearchParams} from "expo-router";
import {takePendingImage} from "../lib/image";
import {analyzeNotes, translateStudyResult} from "../lib/api";
import type {StudyResult} from "../lib/api";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
import { supabase } from "../lib/supabase";

type Mode="summary"|"flashcards"|"quiz"|"test"|"concepts"|"plan"|"teach"|"focus";
const MODES:Mode[]=["summary","flashcards","quiz","test","concepts","plan","teach","focus"];

export default function Study(){
 const { colors:c } = useTheme(); const {t,language}=useLanguage(); const s=makeStyles(c,language);
 const { id } = useLocalSearchParams<{id?: string}>();
 const [image]=useState(()=>takePendingImage());
 const [data,setData]=useState<StudyResult|null>(null),[error,setError]=useState(""),[mode,setMode]=useState<Mode>("summary");
 const [card,setCard]=useState(0),[showAnswer,setShowAnswer]=useState(false),[quizIndex,setQuizIndex]=useState(0),[score,setScore]=useState(0),[selected,setSelected]=useState<number|null>(null),[testIndex,setTestIndex]=useState(0),[showTestAnswer,setShowTestAnswer]=useState(false);
 const [reviewSchedule,setReviewSchedule]=useState<Record<string,{dueAt:number;intervalDays:number;repetitions:number;lastRating:string}>>({});
 const [dueOnly,setDueOnly]=useState(false);
 const [teachText,setTeachText]=useState("");
 const [focusSeconds,setFocusSeconds]=useState(1500),[focusRunning,setFocusRunning]=useState(false);
 const modeMotion=useRef(new Animated.Value(1)).current;
 const flashMotion=useRef(new Animated.Value(1)).current;
 useEffect(()=>{modeMotion.setValue(0);Animated.spring(modeMotion,{toValue:1,friction:10,tension:75,useNativeDriver:true}).start();},[mode,modeMotion]);
 useEffect(()=>{flashMotion.setValue(0);Animated.spring(flashMotion,{toValue:1,friction:9,tension:95,useNativeDriver:true}).start();},[card,showAnswer,flashMotion]);
 useEffect(()=>{if(!focusRunning)return;const timer=setInterval(()=>setFocusSeconds(v=>Math.max(0,v-1)),1000);return()=>clearInterval(timer);},[focusRunning]);
 useEffect(()=>{if(focusSeconds===0)setFocusRunning(false);},[focusSeconds]);
 useEffect(()=>{
  let active=true;
  async function load(){
   setData(null);
   setError("");
   try{
    if(id){
      const translatedKey = "snapstudy:session:"+id+":lang:"+language;
      const cachedTranslation = await AsyncStorage.getItem(translatedKey);
      if(cachedTranslation){if(active)setData(JSON.parse(cachedTranslation) as StudyResult);return;}
      const saved = await AsyncStorage.getItem("snapstudy:session:"+id);
      if(!saved) throw new Error("This saved study session could not be found on this device.");
      const original = JSON.parse(saved) as StudyResult;
      const sourceLanguage = await AsyncStorage.getItem("snapstudy:session-language:"+id);
      if(sourceLanguage === language || (!sourceLanguage && language === "en")){
        if(active)setData(original);
      }else{
        const translated = await translateStudyResult(original,language);
        await AsyncStorage.setItem(translatedKey,JSON.stringify(translated));
        if(active)setData(translated);
      }
      return;
    }
    if(image.base64){
      const x=await analyzeNotes(image,language);
      if(!active) return;
      setData(x);
      try{
       const createdAt=Date.now();
       const last=JSON.stringify({topic:x.topic,summary:x.summary,createdAt,result:x});
       await AsyncStorage.setItem("snapstudy:last",last);
       const raw=await AsyncStorage.getItem("snapstudy:sessions");
       const sessions=raw?JSON.parse(raw):[];
       const sessionId=String(createdAt);
       sessions.unshift({id:sessionId,topic:x.topic,summary:x.summary,createdAt});
       await AsyncStorage.setItem("snapstudy:sessions",JSON.stringify(sessions.slice(0,50)));
       await AsyncStorage.setItem("snapstudy:session:"+sessionId,JSON.stringify(x));
       await AsyncStorage.setItem("snapstudy:session-language:"+sessionId,language);
      }catch{}
    }else{
      throw new Error("No scan was found. Go back and scan your notes again.");
    }
   }catch(e:any){if(active)setError(e?.message||"Something went wrong.");}
  }
  load();
  return()=>{active=false};
 },[image,id,language]);
 const quizDone=!!data&&quizIndex>=data.quiz.length; const currentQuiz=data?.quiz[quizIndex];
 const keyConcepts=useMemo(()=>data?.flashcards.slice(0,8)||[],[data]);
 const cardKey=(question:string)=>String(data?.topic||"topic")+"::"+question;
 const visibleCardIndices=useMemo(()=>{if(!data)return [];const all=data.flashcards.map((_,i)=>i);return dueOnly?all.filter(i=>{const entry=reviewSchedule[cardKey(data.flashcards[i].question)];return !entry||entry.dueAt<=Date.now()}):all;},[data,dueOnly,reviewSchedule]);
 const activeCardIndex=visibleCardIndices.length?visibleCardIndices[Math.min(card,visibleCardIndices.length-1)]:0;
 const activeCard=data?.flashcards[activeCardIndex];
 useEffect(()=>{if(!data)return;AsyncStorage.getItem("snapstudy:reviewSchedule").then(raw=>{if(raw){try{setReviewSchedule(JSON.parse(raw));}catch{}}}).catch(()=>{});},[data?.topic]);
 async function rateCard(rating:"again"|"hard"|"good"|"easy"){
  if(!activeCard)return;
  const key=cardKey(activeCard.question),old=reviewSchedule[key];
  const intervals={again:0,hard:old?Math.max(1,Math.floor(old.intervalDays*1.2)):1,good:old?(old.repetitions===0?1:old.repetitions===1?3:old.repetitions===2?7:14):1,easy:old?(old.repetitions===0?4:old.repetitions===1?7:old.repetitions===2?14:30):4};
  const intervalDays=intervals[rating];
  const dueAt=Date.now()+(rating==="again"?10*60*1000:intervalDays*24*60*60*1000);
  const next={...reviewSchedule,[key]:{dueAt,intervalDays,repetitions:rating==="again"?0:(old?.repetitions||0)+1,lastRating:rating}};
  setReviewSchedule(next);
  await AsyncStorage.setItem("snapstudy:reviewSchedule",JSON.stringify(next)).catch(()=>{});
  if(visibleCardIndices.length>1){setCard((card+1)%visibleCardIndices.length);setShowAnswer(false);}else if(dueOnly){setShowAnswer(false);}
 }
 const dueCount=data?data.flashcards.filter(x=>{const entry=reviewSchedule[cardKey(x.question)];return !entry||entry.dueAt<=Date.now()}).length:0;
 const planSteps=[t("planStep1"),t("planStep2"),t("planStep3"),t("planStep4")];
 const clock=String(Math.floor(focusSeconds/60)).padStart(2,"0")+":"+String(focusSeconds%60).padStart(2,"0");
 useEffect(()=>{if(data){supabase.auth.getUser().then(({data:{user}})=>{if(user)supabase.from("study_activity").insert({user_id:user.id}).then(({error})=>{if(error&&error.code!=="23505")console.warn("Study streak was not saved:",error.message);});});}},[data]);
 const modeLabel=(m:Mode)=>m==="test"?t("practiceTest"):m==="concepts"?t("keyConcepts"):m==="plan"?t("studyPlan"):m==="teach"?t("teachBack"):m==="focus"?t("focusTimer"):m==="summary"?t("summary"):m==="flashcards"?t("flashcards"):m==="quiz"?t("quiz"):m;
 if(error)return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.title}>{t("couldntAnalyze")}</Text><Text style={s.error}>{error}</Text><Text style={s.muted}>{t("checkConnection")}</Text><Pressable style={s.button} onPress={()=>router.replace("/history")}><Text style={s.buttonText}>{t("backHome")}</Text></Pressable></View></SafeAreaView>;
 if(!data)return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={c.accent}/><Text style={s.loading}>{t("buildingSession")}</Text><Text style={s.muted}>{t("readingNotes")}</Text></View></SafeAreaView>;
 return <SafeAreaView style={[s.safe,{direction:language==="ar"?"rtl":"ltr"}]}><Animated.ScrollView style={{opacity:modeMotion,transform:[{translateY:modeMotion.interpolate({inputRange:[0,1],outputRange:[8,0]})}]}} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
  <Pressable onPress={()=>router.replace("/")}><Text style={s.back}>{t("newScan")}</Text></Pressable>
  <Pressable style={s.goPlus} onPress={()=>router.push("/plus")}><Text style={s.goPlusText}>✦  {t("plusBanner")}</Text><Text style={s.goPlusArrow}>↗</Text></Pressable>
  <Text style={s.eyebrow}>{t("studySession")}</Text><Text style={s.title}>{data.topic}</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{MODES.map(m=><Pressable key={m} onPress={()=>setMode(m)} style={[s.tab,mode===m&&s.tabActive]}><Text style={[s.tabText,mode===m&&s.tabTextActive]}>{modeLabel(m)}</Text></Pressable>)}</ScrollView>
  {mode==="summary"&&<><View style={s.hero}><Text style={s.heading}>{t("summary")}</Text><Text style={s.body}>{data.summary}</Text></View><View style={s.stats}><Stat n={data.flashcards.length} label={t("flashcards")}/><Stat n={data.quiz.length} label="Quiz"/><Stat n={data.practiceTest.length} label={t("practiceTest")}/></View><Pressable style={s.plusCard} onPress={()=>router.push("/plus")}><Text style={s.plusEyebrow}>SNAPSTUDY PLUS</Text><Text style={s.plusTitle}>{t("plusTitle")}</Text><Text style={s.plusText}>{t("plusDescription")}</Text><Text style={s.plusLink}>{t("plusLink")}</Text></Pressable></>}
  {mode==="concepts"&&<View style={s.sectionStack}><Text style={s.heading}>{t("keyConcepts")}</Text><Text style={s.mutedLeft}>{t("keyConceptHint")}</Text>{keyConcepts.map((item,i)=><View style={s.conceptCard} key={i}><Text style={s.conceptNumber}>{String(i+1).padStart(2,"0")}</Text><View style={{flex:1}}><Text style={s.conceptQuestion}>{item.question}</Text><Text style={s.body}>{item.answer}</Text></View></View>)}</View>}
  {mode==="plan"&&<View style={s.sectionStack}><Text style={s.heading}>{t("studyPlan")}</Text><Text style={s.mutedLeft}>{language==="sv"?"Ett enkelt upplägg för att repetera det viktigaste.":language==="ar"?"خطة بسيطة لمراجعة أهم المعلومات.":"A simple sequence to review the most important material."}</Text>{planSteps.map((step,i)=><View style={s.planRow} key={step}><View style={s.planNumber}><Text style={s.planNumberText}>{i+1}</Text></View><Text style={s.planText}>{step}</Text></View>)}<Pressable style={s.primaryBtn} onPress={()=>{setMode("focus");setFocusRunning(true);}}><Text style={s.primaryText}>{t("startFocus")}</Text></Pressable></View>}
  {mode==="teach"&&<View style={s.sectionStack}><Text style={s.heading}>{t("teachBack")}</Text><Text style={s.mutedLeft}>{t("teachBackTip")}</Text><TextInput multiline value={teachText} onChangeText={setTeachText} placeholder={t("writeExplanation")} placeholderTextColor={c.subtle} style={s.teachInput}/><Text style={s.mutedLeft}>{language==="sv"?"Jämför din förklaring med sammanfattningen när du är klar.":language==="ar"?"قارن شرحك بالملخص عند الانتهاء.":"When you're done, compare your explanation with the summary."}</Text><Pressable style={s.secondaryBtn} onPress={()=>setMode("summary")}><Text style={s.btnText}>{language==="sv"?"Visa sammanfattningen":language==="ar"?"عرض الملخص":"Review summary"}</Text></Pressable></View>}
  {mode==="focus"&&<View style={s.sectionStack}><Text style={s.heading}>{t("focusTimer")}</Text><Text style={s.mutedLeft}>{t("focusReady")}</Text><View style={s.timerCard}><Text style={s.clock}>{clock}</Text><Text style={s.timerCaption}>{focusSeconds===0?t("focusDone"):t("minutes")}</Text><View style={s.row}><Pressable style={s.secondaryBtn} onPress={()=>setFocusRunning(v=>!v)}><Text style={s.btnText}>{focusRunning?t("pause"):focusSeconds===0?t("resume"):t("startFocus")}</Text></Pressable><Pressable style={s.primaryBtn} onPress={()=>{setFocusRunning(false);setFocusSeconds(1500);}}><Text style={s.primaryText}>{t("reset")}</Text></Pressable></View></View></View>}
  {mode==="flashcards"&&<View><View style={s.reviewHeader}><Text style={s.progress}>{dueOnly?t("dueCards")+" · "+visibleCardIndices.length:t("card")+" "+Math.min(card+1,data.flashcards.length)+" "+t("of")+" "+data.flashcards.length}</Text><Pressable style={[s.dueToggle,dueOnly&&s.dueToggleActive]} onPress={()=>{setDueOnly(v=>!v);setCard(0);setShowAnswer(false)}}><Text style={[s.dueToggleText,dueOnly&&s.dueToggleTextActive]}>{dueOnly?t("showAllCards"):t("reviewDue")+" · "+dueCount}</Text></Pressable></View>{visibleCardIndices.length===0?<View style={s.hero}><Text style={s.heading}>{t("allCaughtUp")}</Text><Text style={s.body}>{t("noCardsDue")}</Text><Pressable style={s.primaryBtn} onPress={()=>{setDueOnly(false);setCard(0)}}><Text style={s.primaryText}>{t("studyAllCards")}</Text></Pressable></View>:<><Animated.View style={{opacity:flashMotion,transform:[{scale:flashMotion.interpolate({inputRange:[0,1],outputRange:[0.97,1]})},{rotateY:flashMotion.interpolate({inputRange:[0,1],outputRange:["-6deg","0deg"]})}]}}><Pressable style={s.flashcard} onPress={()=>setShowAnswer(!showAnswer)}><Text style={s.flashLabel}>{showAnswer?t("answer").toLocaleUpperCase():t("question").toLocaleUpperCase()}</Text><Text style={[s.flashText,{writingDirection:language==="ar"?"rtl":"auto"}]}>{showAnswer?activeCard?.answer:activeCard?.question}</Text><Text style={s.tap}>{t("tapReveal")}</Text></Pressable></Animated.View>{showAnswer&&<View style={s.ratingWrap}><Text style={s.ratingTitle}>{t("howRemembered")}</Text><View style={s.ratingRow}><Pressable style={[s.ratingButton,s.ratingAgain]} onPress={()=>rateCard("again")}><Text style={s.ratingText}>{t("again")}</Text><Text style={s.ratingSub}>10 {t("minutesShort")}</Text></Pressable><Pressable style={s.ratingButton} onPress={()=>rateCard("hard")}><Text style={s.ratingText}>{t("hard")}</Text><Text style={s.ratingSub}>1+ {t("daysShort")}</Text></Pressable><Pressable style={s.ratingButton} onPress={()=>rateCard("good")}><Text style={s.ratingText}>{t("good")}</Text><Text style={s.ratingSub}>1–14 {t("daysShort")}</Text></Pressable><Pressable style={[s.ratingButton,s.ratingEasy]} onPress={()=>rateCard("easy")}><Text style={s.ratingText}>{t("easy")}</Text><Text style={s.ratingSub}>4+ {t("daysShort")}</Text></Pressable></View></View>}<View style={s.row}><Pressable style={s.secondaryBtn} onPress={()=>{setCard(Math.max(0,card-1));setShowAnswer(false)}}><Text style={s.btnText}>{t("previous")}</Text></Pressable><Pressable style={s.primaryBtn} onPress={()=>{setCard((card+1)%visibleCardIndices.length);setShowAnswer(false)}}><Text style={s.primaryText}>{t("next")}</Text></Pressable></View></>}</View>}
  {mode==="quiz"&&<View>{quizDone?<View style={s.hero}><Text style={s.heading}>{t("quizComplete")}</Text><Text style={s.bigScore}>{score}/{data.quiz.length}</Text><Text style={s.body}>{t("score")}: {Math.round(score/data.quiz.length*100)}%</Text><Pressable style={s.primaryBtn} onPress={()=>{setQuizIndex(0);setScore(0);setSelected(null)}}><Text style={s.primaryText}>{t("retakeQuiz")}</Text></Pressable><Pressable style={s.secondaryBtn} onPress={()=>router.push("/plus")}><Text style={s.btnText}>{t("seePlus")}</Text></Pressable></View>:<><Text style={s.progress}>{t("questionProgress")} {quizIndex+1} {t("of")} {data.quiz.length}</Text><View style={s.card}><Text style={s.q}>{currentQuiz?.question}</Text>{currentQuiz?.options.map((o,i)=>{const picked=selected===i;const locked=selected!==null;return <Pressable key={i} disabled={locked} onPress={()=>{setSelected(i);if(i===currentQuiz.answer)setScore(v=>v+1)}} style={[s.optionBtn,picked&&s.picked]}><Text style={s.optionText}>{String.fromCharCode(65+i)}. {o}</Text></Pressable>})}{selected!==null&&<><Text style={s.feedback}>{selected===currentQuiz?.answer?t("correct"):t("notQuite")}</Text><Text style={s.explain}>{currentQuiz?.explanation}</Text><Pressable style={s.primaryBtn} onPress={()=>{setQuizIndex(v=>v+1);setSelected(null)}}><Text style={s.primaryText}>{quizIndex===data.quiz.length-1?t("finish"):t("next")}</Text></Pressable></>}</View></>}</View>}
  {mode==="test"&&<View><Text style={s.progress}>{t("questionProgress")} {testIndex+1} {t("of")} {data.practiceTest.length}</Text><View style={s.card}><Text style={s.q}>{data.practiceTest[testIndex].question}</Text>{showTestAnswer&&<View style={s.answerBox}><Text style={s.flashLabel}>{t("answer").toUpperCase()}</Text><Text style={s.body}>{data.practiceTest[testIndex].answer}</Text></View>}<Pressable style={s.secondaryBtn} onPress={()=>setShowTestAnswer(!showTestAnswer)}><Text style={s.btnText}>{showTestAnswer?t("hideAnswer"):t("tapReveal")}</Text></Pressable><Pressable style={s.primaryBtn} onPress={()=>{setTestIndex(v=>v===data.practiceTest.length-1?0:v+1);setShowTestAnswer(false)}}><Text style={s.primaryText}>{testIndex===data.practiceTest.length-1?t("restartTest"):t("next")}</Text></Pressable></View></View>}
 </Animated.ScrollView></SafeAreaView>
}
function Stat({n,label}:{n:number;label:string}){const {colors:c}=useTheme();const s=makeStyles(c);return <View style={s.stat}><Text style={s.statN}>{n}</Text><Text style={s.statL}>{label}</Text></View>}
const makeStyles = (c: ThemeColors, language:"en"|"sv"|"ar"="en") => StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},goPlus:{alignSelf:"flex-end",flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:13,paddingVertical:8,borderRadius:999,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.accent,marginBottom:14},goPlusText:{color:c.accent,fontSize:11,fontWeight:"900"},goPlusArrow:{color:c.accent,fontSize:13,fontWeight:"900"},container:{padding:22,paddingTop:25,paddingBottom:55},center:{flex:1,alignItems:"center",justifyContent:"center",padding:30},back:{color:c.muted,fontSize:15,marginBottom:24},eyebrow:{color:c.muted,fontSize:11,fontWeight:"800",letterSpacing:1.8},title:{color:c.text,fontSize:31,fontWeight:"800",marginTop:7,marginBottom:16,writingDirection:language==="ar"?"rtl":"auto"},loading:{color:c.text,fontSize:17,fontWeight:"700",marginTop:18},muted:{color:c.subtle,textAlign:"center",lineHeight:20,marginTop:7},mutedLeft:{color:c.muted,fontSize:13,lineHeight:20,marginTop:5,marginBottom:12},error:{color:c.text,textAlign:"center",lineHeight:21,marginVertical:15},button:{backgroundColor:c.accent,paddingHorizontal:22,paddingVertical:13,borderRadius:12,marginTop:20},buttonText:{color:c.onAccent,fontWeight:"800"},tabs:{gap:7,paddingBottom:15},tab:{paddingHorizontal:13,paddingVertical:10,alignItems:"center",borderRadius:12,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},tabActive:{backgroundColor:c.accent,borderColor:c.accent},tabText:{color:c.subtle,fontSize:12,fontWeight:"800"},tabTextActive:{color:c.onAccent},hero:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:20,padding:18},heading:{color:c.text,fontSize:20,fontWeight:"800",marginBottom:10},body:{color:c.muted,fontSize:14,lineHeight:22,writingDirection:language==="ar"?"rtl":"auto"},stats:{flexDirection:"row",gap:9,marginTop:12},stat:{flex:1,backgroundColor:c.surface,borderRadius:16,borderWidth:1,borderColor:c.border,padding:14},statN:{color:c.text,fontSize:22,fontWeight:"900"},statL:{color:c.subtle,fontSize:11,marginTop:3},progress:{color:c.subtle,fontSize:12,fontWeight:"700",marginBottom:10,writingDirection:language==="ar"?"rtl":"auto"},flashcard:{minHeight:300,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:24,padding:25,justifyContent:"center",alignItems:"center"},flashLabel:{color:c.subtle,fontSize:11,fontWeight:"900",letterSpacing:1.5},flashText:{color:c.text,fontSize:25,fontWeight:"800",textAlign:"center",lineHeight:33,marginTop:18,writingDirection:language==="ar"?"rtl":"auto"},tap:{color:c.subtle,fontSize:12,marginTop:28},row:{flexDirection:"row",gap:10,marginTop:12},primaryBtn:{backgroundColor:c.accent,paddingVertical:14,paddingHorizontal:14,borderRadius:12,alignItems:"center",justifyContent:"center",marginTop:12,flex:1},secondaryBtn:{borderWidth:1,borderColor:c.border,paddingVertical:13,paddingHorizontal:14,borderRadius:12,alignItems:"center",justifyContent:"center",marginTop:12,flex:1},primaryText:{color:c.onAccent,fontWeight:"800",textAlign:"center"},btnText:{color:c.text,fontWeight:"800",textAlign:"center"},card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:17},q:{color:c.text,fontSize:16,fontWeight:"800",lineHeight:23,marginBottom:12,writingDirection:language==="ar"?"rtl":"auto"},optionBtn:{borderWidth:1,borderColor:c.border,borderRadius:12,padding:13,marginTop:8},picked:{borderColor:c.accent,backgroundColor:c.accentSoft},optionText:{color:c.muted,fontSize:13,lineHeight:19,writingDirection:language==="ar"?"rtl":"auto"},feedback:{color:c.text,fontSize:16,fontWeight:"800",marginTop:15},explain:{color:c.muted,fontSize:13,lineHeight:19,marginTop:5,writingDirection:language==="ar"?"rtl":"auto"},bigScore:{color:c.text,fontSize:52,fontWeight:"900",marginVertical:8},answerBox:{marginTop:10,padding:14,borderRadius:13,backgroundColor:c.input},sectionStack:{gap:8},conceptCard:{flexDirection:"row",gap:12,alignItems:"flex-start",padding:15,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,borderRadius:16,marginBottom:9},conceptNumber:{color:c.accent,fontSize:12,fontWeight:"900",paddingTop:2},conceptQuestion:{color:c.text,fontSize:14,fontWeight:"800",lineHeight:20,marginBottom:6,writingDirection:language==="ar"?"rtl":"auto"},planRow:{flexDirection:"row",alignItems:"center",gap:12,marginTop:8,padding:14,borderRadius:15,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},planNumber:{width:32,height:32,borderRadius:11,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},planNumberText:{color:c.accent,fontWeight:"900"},planText:{color:c.text,fontSize:13,lineHeight:20,flex:1,writingDirection:language==="ar"?"rtl":"auto"},teachInput:{minHeight:160,borderWidth:1,borderColor:c.border,borderRadius:15,padding:14,color:c.text,textAlignVertical:"top",marginTop:8,marginBottom:8,backgroundColor:c.surface},timerCard:{marginTop:8,padding:20,borderRadius:22,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},clock:{color:c.text,fontSize:58,fontWeight:"900",textAlign:"center",fontVariant:["tabular-nums"],marginVertical:20},timerCaption:{color:c.muted,fontSize:13,textAlign:"center"},reviewHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:10},dueToggle:{paddingHorizontal:11,paddingVertical:8,borderRadius:11,borderWidth:1,borderColor:c.border},dueToggleActive:{backgroundColor:c.accentSoft,borderColor:c.accent},dueToggleText:{color:c.muted,fontSize:10,fontWeight:"900"},dueToggleTextActive:{color:c.accent},ratingWrap:{marginTop:12,marginBottom:6,padding:13,borderRadius:16,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},ratingTitle:{color:c.text,fontSize:12,fontWeight:"900",marginBottom:10},ratingRow:{flexDirection:"row",gap:6},ratingButton:{flex:1,minHeight:48,borderRadius:11,backgroundColor:c.surfaceAlt,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center",paddingVertical:7},ratingAgain:{backgroundColor:"#FDECEC",borderColor:"#F2C2C2"},ratingEasy:{backgroundColor:c.accentSoft,borderColor:c.accent},ratingText:{color:c.text,fontSize:11,fontWeight:"900"},ratingSub:{color:c.muted,fontSize:8,marginTop:3},plusCard:{marginTop:16,borderRadius:19,padding:17,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.accent},plusEyebrow:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:1.5},plusTitle:{color:c.text,fontSize:17,fontWeight:"900",marginTop:8},plusText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:5},plusLink:{color:c.accent,fontWeight:"900",fontSize:13,marginTop:12}
});
