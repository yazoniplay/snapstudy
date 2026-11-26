import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../components/LocalizedText";
import {useEffect,useMemo,useRef,useState} from "react";
import {Animated,Easing,Pressable,SafeAreaView,ScrollView,Share,StyleSheet,View} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadStudyData, saveStudyData } from "../lib/cloud-study-data";
import {router, useLocalSearchParams} from "expo-router";
import {takePendingImages} from "../lib/image";
import {analyzeNotes, analyzeNotesText, translateStudyResult} from "../lib/api";
import type {StudyResult} from "../lib/api";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
import { supabase } from "../lib/supabase";
import { awardXP, getLevel, loadGamification } from "../lib/gamification";
import AdBanner from "../components/AdBanner";
import MarkdownText from "../components/MarkdownText";
import { hasPlusFeature, loadPlusEntitlement, NO_PLUS_ENTITLEMENT, type PlusEntitlement } from "../lib/plus";

type Mode="summary"|"flashcards"|"quiz"|"test"|"concepts"|"written"|"cloze"|"matching"|"speed"|"plan"|"teach"|"focus";
const MODES:Mode[]=["summary","flashcards","quiz","test","concepts","written","cloze","matching","speed","plan","teach","focus"];

export default function Study(){
 const { colors:c } = useTheme(); const {t,language}=useLanguage(); const s=makeStyles(c,language);
 const { id, mode: initialMode, due: dueParam, weak: weakParam, notes: notesParam } = useLocalSearchParams<{id?: string; mode?: string; due?: string; weak?: string; notes?: string}>();
 const [images]=useState(()=>takePendingImages());
 const [hearts,setHearts]=useState(5),[stamina,setStamina]=useState(100);
 const [motionEnabled,setMotionEnabled]=useState(true);
 useEffect(()=>{AsyncStorage.getItem("snapstudy:motion").then(value=>{if(value==="off")setMotionEnabled(false);}).catch(()=>{});},[]);
 const [plusAccess,setPlusAccess]=useState<PlusEntitlement>(NO_PLUS_ENTITLEMENT);
 const [data,setData]=useState<StudyResult|null>(null),[error,setError]=useState(""),[mode,setMode]=useState<Mode>(()=>MODES.includes(initialMode as Mode)?initialMode as Mode:"summary");
 const [card,setCard]=useState(0),[showAnswer,setShowAnswer]=useState(false),[quizIndex,setQuizIndex]=useState(0),[score,setScore]=useState(0),[selected,setSelected]=useState<number|null>(null),[testIndex,setTestIndex]=useState(0),[showTestAnswer,setShowTestAnswer]=useState(false);
 const [reviewSchedule,setReviewSchedule]=useState<Record<string,{dueAt:number;intervalDays:number;repetitions:number;lastRating:string}>>({});
 const [dueOnly,setDueOnly]=useState(dueParam==="1");
 const [teachText,setTeachText]=useState("");
 const [writtenIndex,setWrittenIndex]=useState(0),[writtenText,setWrittenText]=useState(""),[writtenReveal,setWrittenReveal]=useState(false);
 const [clozeIndex,setClozeIndex]=useState(0),[clozeText,setClozeText]=useState(""),[clozeReveal,setClozeReveal]=useState(false);
 const [matchSelected,setMatchSelected]=useState<number|null>(null),[matchFirst,setMatchFirst]=useState<number|null>(null),[matchSolved,setMatchSolved]=useState<number[]>([]),[matchWrong,setMatchWrong]=useState<number[]>([]);
 const matchMotion=useRef(new Animated.Value(1)).current;const matchAwarded=useRef(false);
 const [speedSeconds,setSpeedSeconds]=useState(60),[speedRunning,setSpeedRunning]=useState(false),[speedIndex,setSpeedIndex]=useState(0),[speedScore,setSpeedScore]=useState(0),[speedAnswered,setSpeedAnswered]=useState(false);const speedAwarded=useRef(false);
 const [focusSeconds,setFocusSeconds]=useState(1500),[focusRunning,setFocusRunning]=useState(false);
 const [gameXP,setGameXP]=useState(0);
 const focusAwarded=useRef(false); const focusRunId=useRef("focus-"+Date.now());
 const modeMotion=useRef(new Animated.Value(1)).current;
 const flashMotion=useRef(new Animated.Value(1)).current;
 const questionMotion=useRef(new Animated.Value(1)).current;
 const feedbackMotion=useRef(new Animated.Value(0)).current;
 const revealMotion=useRef(new Animated.Value(0)).current;
 const loadingPulse=useRef(new Animated.Value(0)).current;
 useEffect(()=>{modeMotion.setValue(motionEnabled?0:1);if(motionEnabled)Animated.spring(modeMotion,{toValue:1,friction:8,tension:100,useNativeDriver:true}).start();},[mode,modeMotion,motionEnabled]);
 useEffect(()=>{matchMotion.setValue(motionEnabled?0:1);if(motionEnabled)Animated.spring(matchMotion,{toValue:1,friction:7,tension:130,useNativeDriver:true}).start();},[matchSelected,matchSolved,matchMotion,motionEnabled]);
 useEffect(()=>{flashMotion.setValue(motionEnabled?0:1);if(motionEnabled)Animated.spring(flashMotion,{toValue:1,friction:7,tension:130,useNativeDriver:true}).start();},[card,showAnswer,flashMotion,motionEnabled]);
 useEffect(()=>{questionMotion.setValue(motionEnabled?0:1);if(motionEnabled)Animated.spring(questionMotion,{toValue:1,friction:8,tension:110,useNativeDriver:true}).start();},[quizIndex,testIndex,questionMotion,motionEnabled]);
 useEffect(()=>{feedbackMotion.setValue(motionEnabled?0:1);if(motionEnabled&&selected!==null)Animated.spring(feedbackMotion,{toValue:1,friction:7,tension:120,useNativeDriver:true}).start();},[selected,feedbackMotion,motionEnabled]);
 useEffect(()=>{revealMotion.setValue(motionEnabled?0:1);if(motionEnabled&&showTestAnswer)Animated.spring(revealMotion,{toValue:1,friction:7,tension:115,useNativeDriver:true}).start();},[showTestAnswer,revealMotion,motionEnabled]);
 useEffect(()=>{if(!motionEnabled){loadingPulse.setValue(0);return;}const pulse=Animated.loop(Animated.sequence([Animated.timing(loadingPulse,{toValue:1,duration:900,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),Animated.timing(loadingPulse,{toValue:0,duration:900,easing:Easing.inOut(Easing.ease),useNativeDriver:true})]));pulse.start();return()=>pulse.stop();},[loadingPulse,motionEnabled]);
 useEffect(()=>{let active=true;loadPlusEntitlement().then(value=>{if(active)setPlusAccess(value)}).catch(()=>{});return()=>{active=false};},[]);
 useEffect(()=>{let active=true;const day=new Date().toISOString().slice(0,10);AsyncStorage.getItem("snapstudy:energy:v1").then(raw=>{if(!active)return;const saved=raw?JSON.parse(raw):null;if(saved?.day===day){setHearts(typeof saved.hearts==="number"?saved.hearts:5);setStamina(typeof saved.stamina==="number"?saved.stamina:100);}}).catch(()=>{});return()=>{active=false};},[]);
 useEffect(()=>{if(!focusRunning)return;const timer=setInterval(()=>setFocusSeconds(v=>Math.max(0,v-1)),1000);return()=>clearInterval(timer);},[focusRunning]);
 useEffect(()=>{if(mode!=="speed"||!speedRunning)return;const timer=setInterval(()=>setSpeedSeconds(v=>{if(v<=1){setSpeedRunning(false);return 0;}return v-1;}),1000);return()=>clearInterval(timer);},[mode,speedRunning]);
 useEffect(()=>{if(mode!=="speed"||speedSeconds!==0||speedAwarded.current)return;speedAwarded.current=true;const today=new Date().toISOString().slice(0,10);awardXP("speed:"+today+":"+data?.topic,Math.min(30,speedScore),"speed","Speed round completed",{quizzesCompleted:1,tasksCompleted:1}).then(value=>setGameXP(value.totalXp)).catch(()=>{});},[mode,speedSeconds,speedScore,data?.topic]);

 useEffect(()=>{if(focusSeconds===0){setFocusRunning(false);if(!focusAwarded.current){focusAwarded.current=true;awardXP(focusRunId.current,40,"focus","25-minute focus session",{focusSessions:1,focusMinutes:25}).then(next=>setGameXP(next.totalXp)).catch(e=>console.warn("Could not award focus XP",e));}}},[focusSeconds]);
 useEffect(()=>{
  let active=true;
  async function load(){
   setData(null);
   setError("");
   try{
    if(weakParam==="1"){
      const weakItems=await loadStudyData<any[]>("weakTopics",[]);
      const activeWeak=Array.isArray(weakItems)?weakItems.filter((item:any)=>!item.mastered):[];
      if(!activeWeak.length) throw new Error(language==="sv"?"Inga svaga ämnen att repetera ännu. Gör ett quiz först.":language==="ar"?"لا توجد موضوعات تحتاج إلى مراجعة بعد. أكمل اختبارًا أولًا.":"No weak topics to review yet. Complete a quiz first.");
      const focused:StudyResult={
        topic:language==="sv"?"Riktad repetition":language==="ar"?"مراجعة مركزة":"Focused review",
        summary:language==="sv"?"Träna på frågorna du tidigare svarat fel på.":language==="ar"?"تدرّب على الأسئلة التي أخطأت فيها سابقًا.":"Practice questions you previously missed.",
        flashcards:activeWeak.map((item:any)=>({question:item.question,answer:item.options?.[item.answer]||""})),
        quiz:activeWeak.map((item:any)=>({question:item.question,options:item.options,answer:item.answer,explanation:item.explanation,topic:item.topic})),
        practiceTest:activeWeak.map((item:any)=>({question:item.question,answer:item.options?.[item.answer]||""}))
      };
      if(active)setData(focused);
      return;
    }
    if(id){
      const translatedKey = "snapstudy:session:"+id+":lang:"+language;
      const cachedTranslation = await AsyncStorage.getItem(translatedKey);
      if(cachedTranslation){if(active)setData(JSON.parse(cachedTranslation) as StudyResult);return;}
      const saved = await AsyncStorage.getItem("snapstudy:session:"+id);
      let original: StudyResult;
      let remoteLanguage: string | null = null;
      if(saved) {
        original = JSON.parse(saved) as StudyResult;
      } else if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        const { data: cloudSession, error: cloudError } = await supabase.from("study_sessions").select("result").eq("id", id).maybeSingle();
        if(cloudError) throw cloudError;
        if(cloudSession?.result) {
          original = cloudSession.result as StudyResult;
          remoteLanguage = (cloudSession.result as any)._language || "en";
          await AsyncStorage.setItem("snapstudy:session:"+id, JSON.stringify(original));
        } else {
          const cloudCopy = await loadStudyData<StudyResult | null>("session:"+id, null);
          if(!cloudCopy) throw new Error("This saved study session could not be found.");
          original = cloudCopy;
        }
      } else {
        const cloudCopy = await loadStudyData<StudyResult | null>("session:"+id, null);
        if(!cloudCopy) throw new Error("This saved study session could not be found on this device.");
        original = cloudCopy;
        remoteLanguage = (cloudCopy as any)._language || "en";
      }
      const sourceLanguage = await AsyncStorage.getItem("snapstudy:session-language:"+id) || remoteLanguage;
      if(sourceLanguage === language || (!sourceLanguage && language === "en")){
        if(active)setData(original);
      }else{
        const translated = await translateStudyResult(original,language);
        await AsyncStorage.setItem(translatedKey,JSON.stringify(translated));
        if(active)setData(translated);
      }
      return;
    }
    if(images.some(item=>item.base64)||notesParam==="1"){
      let x:StudyResult;
      const savedContentLanguage=await AsyncStorage.getItem("snapstudy:content-language");
      const generationLanguage=(savedContentLanguage&&["en","sv","ar","es","fr","de","pt","hi","zh","ja","tr"].includes(savedContentLanguage))?savedContentLanguage:language;
      if(notesParam==="1"){
        const pasted=await AsyncStorage.getItem("snapstudy:pending-notes");
        if(!pasted?.trim())throw new Error("Your pasted notes were empty. Go back and paste them again.");
        x=await analyzeNotesText(pasted,generationLanguage);
        await AsyncStorage.removeItem("snapstudy:pending-notes");
      }else{x=await analyzeNotes(images,generationLanguage);}
      if(!active) return;
      setData(x);
      try{
       const createdAt=Date.now();
       const last=JSON.stringify({topic:x.topic,summary:x.summary,createdAt,result:x});
       await AsyncStorage.setItem("snapstudy:last",last);
       let sessionId=String(createdAt);
       const {data:authData}=await supabase.auth.getUser();
       if(authData.user){
         const {data:cloudSession,error:cloudSaveError}=await supabase.from("study_sessions").insert({user_id:authData.user.id,title:x.topic,subject:x.topic,result:{...x,_language:language}}).select("id").single();
         if(!cloudSaveError&&cloudSession?.id) sessionId=cloudSession.id;
         else console.warn("Study session cloud save failed:",cloudSaveError?.message);
       }
       const sessions=await loadStudyData<any[]>("sessions",[]);
       sessions.unshift({id:sessionId,topic:x.topic,summary:x.summary,createdAt});
       const entitlement=await loadPlusEntitlement();
       const historyLimit=hasPlusFeature(entitlement,"extended_history")?200:50;
       await saveStudyData("sessions",sessions.slice(0,historyLimit));
       await AsyncStorage.setItem("snapstudy:session:"+sessionId,JSON.stringify(x));
       await saveStudyData("session:"+sessionId,{...x,_language:language});
       await AsyncStorage.setItem("snapstudy:session-language:"+sessionId,language);
       await awardXP("study-set:"+sessionId,35,"study","Study set created",{studySetsCreated:1}).then(value=>setGameXP(value.totalXp)).catch(e=>console.warn("Study set XP award failed",e));
      }catch{}
    }else{
      throw new Error("No scan was found. Go back and scan your notes again.");
    }
   }catch(e:any){if(active)setError(e?.message||"Something went wrong.");}
  }
  load();
  return()=>{active=false};
 },[images,id,language,weakParam,notesParam]);
 const quizDone=!!data&&quizIndex>=data.quiz.length; const currentQuiz=data?.quiz[quizIndex];
 const speedQuiz=data?.quiz.length?data.quiz[speedIndex%data.quiz.length]:undefined;
 const keyConcepts=useMemo(()=>data?.flashcards.slice(0,8)||[],[data]);
 const cardKey=(question:string)=>String(data?.topic||"topic")+"::"+question;
 const matchTiles=useMemo(()=>{if(!data)return [];const pairs=data.flashcards.slice(0,Math.min(8,data.flashcards.length));return pairs.flatMap((item,index)=>[{id:index*2,pair:index,text:item.question,side:"q" as const},{id:index*2+1,pair:index,text:item.answer,side:"a" as const}]).sort(()=>Math.random()-0.5);},[data?.topic]);
 useEffect(()=>{setMatchSelected(null);setMatchFirst(null);setMatchSolved([]);setMatchWrong([]);matchAwarded.current=false;},[data?.topic]);
 useEffect(()=>{if(matchSelected===null)return;const tile=matchTiles.find(x=>x.id===matchSelected);if(!tile)return;if(matchFirst===null){setMatchFirst(matchSelected);setMatchSelected(null);return;}if(matchFirst===matchSelected){setMatchSelected(null);setMatchFirst(null);return;}const first=matchTiles.find(x=>x.id===matchFirst);if(first&&first.pair===tile.pair&&first.side!==tile.side){setMatchSolved(old=>old.includes(tile.pair)?old:[...old,tile.pair]);setMatchWrong([]);}else{setMatchWrong([matchFirst,matchSelected]);}const timer=setTimeout(()=>{setMatchSelected(null);setMatchFirst(null);setMatchWrong([]);},650);return()=>clearTimeout(timer);},[matchSelected,matchFirst,matchTiles]);
 useEffect(()=>{if(!matchTiles.length||matchSolved.length!==matchTiles.length/2||matchAwarded.current)return;matchAwarded.current=true;const today=new Date().toISOString().slice(0,10);awardXP("match:"+today+":"+data?.topic,20,"matching","Matching game completed",{tasksCompleted:1}).then(value=>setGameXP(value.totalXp)).catch(()=>{});},[matchSolved,matchTiles,data?.topic]);

 const visibleCardIndices=useMemo(()=>{if(!data)return [];const all=data.flashcards.map((_,i)=>i);return dueOnly?all.filter(i=>{const entry=reviewSchedule[cardKey(data.flashcards[i].question)];return !entry||entry.dueAt<=Date.now()}):all;},[data,dueOnly,reviewSchedule]);
 const activeCardIndex=visibleCardIndices.length?visibleCardIndices[Math.min(card,visibleCardIndices.length-1)]:0;
 const activeCard=data?.flashcards[activeCardIndex];
 useEffect(()=>{if(!data)return;let active=true;loadStudyData<typeof reviewSchedule>("reviewSchedule",{}).then(value=>{if(active)setReviewSchedule(value||{});}).catch(()=>{});loadGamification().then(value=>{if(active)setGameXP(value.totalXp);}).catch(()=>{});return()=>{active=false};},[data?.topic]);
 async function rateCard(rating:"again"|"hard"|"good"|"easy"){
  if(!activeCard)return;
  const key=cardKey(activeCard.question),old=reviewSchedule[key];
  const intervals={again:0,hard:old?Math.max(1,Math.floor(old.intervalDays*1.2)):1,good:old?(old.repetitions===0?1:old.repetitions===1?3:old.repetitions===2?7:14):1,easy:old?(old.repetitions===0?4:old.repetitions===1?7:old.repetitions===2?14:30):4};
  const intervalDays=intervals[rating];
  const dueAt=Date.now()+(rating==="again"?10*60*1000:intervalDays*24*60*60*1000);
  const next={...reviewSchedule,[key]:{dueAt,intervalDays,repetitions:rating==="again"?0:(old?.repetitions||0)+1,lastRating:rating}};
  setReviewSchedule(next);
  await saveStudyData("reviewSchedule",next).catch(()=>{});
  const today=new Date().toISOString().slice(0,10);
  await awardXP("card:"+today+":"+key,5,"card","Flashcard reviewed",{cardsReviewed:1}).then(value=>setGameXP(value.totalXp)).catch(e=>console.warn("Could not award flashcard XP",e));
  if(visibleCardIndices.length>1){setCard((card+1)%visibleCardIndices.length);setShowAnswer(false);}else if(dueOnly){setShowAnswer(false);}
 }
 const dueCount=data?data.flashcards.filter(x=>{const entry=reviewSchedule[cardKey(x.question)];return !entry||entry.dueAt<=Date.now()}).length:0;
 async function exportStudyPack(){
  const entitlement=await loadPlusEntitlement();
  setPlusAccess(entitlement);
  if(!hasPlusFeature(entitlement,"export")){router.push("/plus");return;}
  if(!data)return;
  const parts=[data.topic,"","SUMMARY",data.summary,"","FLASHCARDS",...data.flashcards.flatMap((item,index)=>[`${index+1}. ${item.question}`,item.answer,""]),"QUIZ",...data.quiz.flatMap((item,index)=>[`${index+1}. ${item.question}`,...item.options.map((option,i)=>`${String.fromCharCode(65+i)}. ${option}`),`Answer: ${item.options[item.answer]}`,item.explanation,""]),"PRACTICE TEST",...data.practiceTest.flatMap((item,index)=>[`${index+1}. ${item.question}`,item.answer,""])];
  try{await Share.share({title:`${data.topic} · SnapStudy`,message:parts.join("\n")});}catch(error){console.warn("Study pack export failed",error);}
 }
 const planSteps=[t("planStep1"),t("planStep2"),t("planStep3"),t("planStep4")];
 const clock=String(Math.floor(focusSeconds/60)).padStart(2,"0")+":"+String(focusSeconds%60).padStart(2,"0");
 useEffect(()=>{if(data){supabase.auth.getUser().then(({data:{user}})=>{if(user)supabase.from("study_activity").insert({user_id:user.id}).then(({error})=>{if(error&&error.code!=="23505")console.warn("Study streak was not saved:",error.message);});});}},[data]);
 async function recordQuizAnswer(q:{question:string;options:string[];answer:number;explanation:string;topic?:string},choice:number,fallbackTopic:string){
  try{
   const topic=q.topic||fallbackTopic;
   const idKey=topic+"::"+q.question;
   const list:any[]=await loadStudyData<any[]>("weakTopics",[]);
   const index=list.findIndex((item:any)=>item.id===idKey);
   if(index<0&&choice===q.answer)return;
   const old=index>=0?list[index]:{id:idKey,topic,question:q.question,options:q.options,answer:q.answer,explanation:q.explanation,misses:0,attempts:0,correctStreak:0,mastered:false,lastMissedAt:Date.now()};
   const next={...old,options:q.options,answer:q.answer,explanation:q.explanation,attempts:(old.attempts||0)+1,lastReviewedAt:Date.now(),correctStreak:choice===q.answer?(old.correctStreak||0)+1:0,misses:(old.misses||0)+(choice===q.answer?0:1),lastMissedAt:choice===q.answer?old.lastMissedAt:Date.now(),mastered:choice===q.answer?(old.mastered||((old.correctStreak||0)+1>=2)):false};
   if(index>=0)list[index]=next;else list.push(next);
   await saveStudyData("weakTopics",list);
  }catch(e){console.warn("Could not save weak-topic progress",e);}
 }
 const modeIcons:Record<Mode,React.ComponentProps<typeof Ionicons>["name"]>={speed:"flash-outline",matching:"git-compare-outline",summary:"sparkles-outline",flashcards:"copy-outline",quiz:"checkmark-circle-outline",test:"document-text-outline",concepts:"bulb-outline",written:"create-outline",cloze:"text-outline",plan:"calendar-outline",teach:"chatbubble-ellipses-outline",focus:"timer-outline"};
 const modeLabel=(m:Mode)=>m==="test"?t("practiceTest"):m==="concepts"?t("keyConcepts"):m==="written"?(language==="sv"?"Skrivsvar":"Written practice"):m==="cloze"?(language==="sv"?"Fyll i luckor":"Fill the blanks"):m==="matching"?(language==="sv"?"Matcha par":language==="ar"?"طابق الأزواج":"Match pairs"):m==="speed"?(language==="sv"?"Snabbquiz":language==="ar"?"تحدي السرعة":"Speed round"):m==="plan"?t("studyPlan"):m==="teach"?t("teachBack"):m==="focus"?t("focusTimer"):m==="summary"?t("summary"):m==="flashcards"?t("flashcards"):m==="quiz"?t("quiz"):m;
 if(error)return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.title}>{t("couldntAnalyze")}</Text><Text style={s.error}>{error}</Text><Text style={s.muted}>{t("checkConnection")}</Text><Pressable style={s.button} onPress={()=>router.replace("/history")}><Text style={s.buttonText}>{t("backHome")}</Text></Pressable></View></SafeAreaView>;
 if(!data)return <SafeAreaView style={s.loadingScreen}><View pointerEvents="none" style={s.glowOne}/><View pointerEvents="none" style={s.glowTwo}/><View style={s.loadingContent}><Animated.View style={[s.loadingLogo,{transform:[{scale:loadingPulse.interpolate({inputRange:[0,1],outputRange:[0.94,1.06]})}]}]}><Ionicons name="sparkles" size={34} color="#FFFFFF"/></Animated.View><Text style={s.loadingBrand}>SNAPSTUDY</Text><Text style={s.loadingTitle}>{language==="sv"?"Gör dina anteckningar till något magiskt":language==="ar"?"نحوّل ملاحظاتك إلى شيء رائع":"Turning your notes into magic"}</Text><Text style={s.loadingSubtitle}>{language==="sv"?"Vi bygger dina kort och quiz…":language==="ar"?"نجهّز البطاقات والاختبار…":"Making flashcards, quizzes & a study plan…"}</Text><View style={s.loadingDots}><View style={s.loadingDot}/><View style={[s.loadingDot,{opacity:0.65}]}/><View style={[s.loadingDot,{opacity:0.35}]}/></View><Text style={s.loadingFoot}>{t("readingNotes")}</Text></View></SafeAreaView>;
 return <SafeAreaView style={[s.safe,{direction:language==="ar"?"rtl":"ltr"}]}><Animated.ScrollView style={{opacity:modeMotion,transform:[{translateY:modeMotion.interpolate({inputRange:[0,1],outputRange:[8,0]})}]}} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
  <Pressable onPress={()=>router.replace("/")}><Text style={s.back}>{t("newScan")}</Text></Pressable>
  <Text style={s.eyebrow}>{t("studySession")}</Text><Text style={s.title}>{data.topic}</Text>
  <Pressable onPress={()=>router.push("/progress")} style={{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:14,padding:12,marginTop:9,marginBottom:10,flexDirection:"row",alignItems:"center",gap:10}}><View style={{flex:1}}><Text style={{color:c.accent,fontSize:11,fontWeight:"900"}}>LEVEL {getLevel(gameXP).level} · {gameXP.toLocaleString()} XP</Text><View style={{height:6,backgroundColor:c.border,borderRadius:6,overflow:"hidden",marginTop:8}}><View style={{height:"100%",width:(getLevel(gameXP).progress*100)+"%",backgroundColor:c.accent}}/></View><Text style={{color:c.muted,fontSize:10,marginTop:5}}>{getLevel(gameXP).nextXp-gameXP} XP to next level</Text></View><Ionicons name="trophy-outline" size={20} color={c.accent}/></Pressable>
  <Pressable style={s.goPlus} onPress={()=>router.push("/plus")}><Text style={s.goPlusText}>SNAPSTUDY PLUS</Text><Text style={s.goPlusArrow}>↗</Text></Pressable>
  <View style={s.energyHud}><View style={s.hudHearts}><Ionicons name="heart" size={17} color="#F06A9B"/><Text style={s.hudText}>{hearts}/5</Text></View><View style={s.hudStamina}><Ionicons name="flash" size={17} color="#9B7BFF"/><View style={s.hudTrack}><View style={[s.hudFill,{width:stamina+"%"}]}/></View><Text style={s.hudText}>{stamina}%</Text></View></View>
  <AdBanner />
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{MODES.map(m=><Pressable key={m} onPress={()=>m==="focus"?router.push("/focus"):setMode(m)} style={[s.tab,mode===m&&s.tabActive]}><Ionicons name={modeIcons[m]} size={16} color={mode===m?c.onAccent:c.muted}/><Text style={[s.tabText,mode===m&&s.tabTextActive]}>{modeLabel(m)}</Text></Pressable>)}</ScrollView>
  {mode==="summary"&&<><View style={s.hero}><Text style={s.heading}>{t("summary")}</Text><View style={{gap:10}}><MarkdownText style={s.body}>{data.summary}</MarkdownText></View></View><View style={s.stats}><Stat n={data.flashcards.length} label={t("flashcards")}/><Stat n={data.quiz.length} label="Quiz"/><Stat n={data.practiceTest.length} label={t("practiceTest")}/></View><Pressable style={[s.primaryBtn,{flexDirection:"row",gap:9,marginTop:14}]} onPress={exportStudyPack}><Ionicons name={hasPlusFeature(plusAccess,"export")?"download-outline":"lock-closed-outline"} size={17} color={c.onAccent}/><Text style={s.primaryText}>{hasPlusFeature(plusAccess,"export")?(language==="sv"?"Exportera studiepaket":language==="ar"?"تصدير حزمة الدراسة":"Export study pack"):(language==="sv"?"Lås upp export med Pro":language==="ar"?"افتح التصدير مع برو":"Unlock study pack export · Pro")}</Text></Pressable></>}
  {mode==="concepts"&&<View style={s.sectionStack}><Text style={s.heading}>{t("keyConcepts")}</Text><Text style={s.mutedLeft}>{t("keyConceptHint")}</Text>{keyConcepts.map((item,i)=><View style={s.conceptCard} key={i}><Text style={s.conceptNumber}>{String(i+1).padStart(2,"0")}</Text><View style={{flex:1}}><Text style={s.conceptQuestion}>{item.question}</Text><MarkdownText style={s.body}>{item.answer}</MarkdownText></View></View>)}</View>}
  {mode==="written"&&<View style={s.sectionStack}><Text style={s.heading}>{language==="sv"?"Skrivsvar":"Written practice"}</Text><Text style={s.mutedLeft}>{language==="sv"?"Svara med egna ord och jämför sedan med facit.":"Answer in your own words, then reveal the model answer."}</Text>{data.practiceTest.length>0?<View style={s.card}><Text style={s.progress}>{writtenIndex+1} / {data.practiceTest.length}</Text><Text style={s.q}>{data.practiceTest[writtenIndex]?.question}</Text><TextInput multiline value={writtenText} onChangeText={setWrittenText} placeholder={language==="sv"?"Skriv ditt svar…":"Write your answer…"} placeholderTextColor={c.subtle} style={s.teachInput}/>{writtenReveal&&<View style={s.answerBox}><Text style={s.flashLabel}>{language==="sv"?"MODELLSVAR":"MODEL ANSWER"}</Text><MarkdownText style={s.body}>{data.practiceTest[writtenIndex]?.answer || ""}</MarkdownText></View>}<Pressable style={s.secondaryBtn} onPress={()=>setWrittenReveal(v=>!v)}><Text style={s.btnText}>{writtenReveal?(language==="sv"?"Dölj svar":"Hide answer"):(language==="sv"?"Visa modellsvar":"Reveal model answer")}</Text></Pressable><Pressable style={s.primaryBtn} onPress={()=>{setWrittenIndex(v=>(v+1)%data.practiceTest.length);setWrittenText("");setWrittenReveal(false);}}><Text style={s.primaryText}>{language==="sv"?"Nästa fråga":"Next question"}</Text></Pressable></View>:<Text style={s.body}>{language==="sv"?"Inga övningsfrågor skapades för detta material.":"No written practice questions were generated for this set."}</Text>}</View>}
  {mode==="cloze"&&<View style={s.sectionStack}><Text style={s.heading}>{language==="sv"?"Fyll i luckan":"Fill in the blank"}</Text><Text style={s.mutedLeft}>{language==="sv"?"Kom ihåg nyckelordet och skriv det innan du visar svaret.":"Recall the key word and type it before revealing the answer."}</Text>{data.flashcards.length>0?(()=>{const item=data.flashcards[clozeIndex%data.flashcards.length];const words=item.answer.split(/\s+/);const wordIndex=words.findIndex((w:string)=>w.replace(/[^\p{L}\p{N}]/gu,"").length>=5);const target=wordIndex>=0?words[wordIndex]:words[0]||"";const masked=words.map((w:string,i:number)=>i===wordIndex&&wordIndex>=0?"_____":w).join(" ");return <View style={s.card}><Text style={s.progress}>{clozeIndex+1} / {data.flashcards.length}</Text><Text style={s.q}>{item.question}</Text><View style={s.flashcard}><MarkdownText style={s.flashText}>{masked}</MarkdownText></View><TextInput value={clozeText} onChangeText={setClozeText} placeholder={language==="sv"?"Skriv det saknade ordet…":"Type the missing word…"} placeholderTextColor={c.subtle} style={s.teachInput}/>{clozeReveal&&<View style={s.answerBox}><Text style={s.flashLabel}>{language==="sv"?"RÄTT SVAR":"CORRECT ANSWER"}</Text><Text style={s.body}>{target}</Text><Text style={[s.feedback,{color:clozeText.trim().toLowerCase().replace(/[.,!?]/g,"")===target.toLowerCase().replace(/[.,!?]/g,"")?"#34A56A":c.muted}]}>{clozeText.trim().toLowerCase().replace(/[.,!?]/g,"")===target.toLowerCase().replace(/[.,!?]/g,"")?(language==="sv"?"Rätt!":"Correct!"):(language==="sv"?"Jämför med svaret ovan":"Compare with the answer above")}</Text></View>}<Pressable style={s.secondaryBtn} onPress={()=>setClozeReveal(v=>!v)}><Text style={s.btnText}>{clozeReveal?(language==="sv"?"Dölj svar":"Hide answer"):(language==="sv"?"Visa svar":"Reveal answer")}</Text></Pressable><Pressable style={s.primaryBtn} onPress={()=>{setClozeIndex(v=>(v+1)%data.flashcards.length);setClozeText("");setClozeReveal(false);}}><Text style={s.primaryText}>{language==="sv"?"Nästa kort":"Next card"}</Text></Pressable></View>;})():<Text style={s.body}>No flashcards available.</Text>}</View>}
  {mode==="matching"&&<View style={s.sectionStack}>
    <Text style={s.heading}>{language==="sv"?"Matcha begrepp och svar":language==="ar"?"طابق المفاهيم والإجابات":"Match concepts and answers"}</Text>
    <Text style={s.mutedLeft}>{language==="sv"?"Tryck på ett begrepp och sedan dess rätta svar.":"Tap a concept, then its matching answer. Find all pairs."}</Text>
    <View style={s.matchProgress}><Text style={s.progress}>{matchSolved.length} / {matchTiles.length/2} {language==="sv"?"par":"pairs"}</Text><View style={s.progressTrack}><View style={[s.progressFill,{width:(matchSolved.length/Math.max(1,matchTiles.length/2)*100)+"%"}]}/></View></View>
    {matchSolved.length===matchTiles.length/2&&matchTiles.length>0?<Animated.View style={[s.hero,{transform:[{scale:matchMotion.interpolate({inputRange:[0,1],outputRange:[0.92,1]})}]}]}><Ionicons name="trophy" size={34} color={c.accent}/><Text style={s.heading}>{language==="sv"?"Alla par hittade!":"All pairs matched!"}</Text><Text style={s.body}>{language==="sv"?"Du fick 20 XP. Bra jobbat!":"You earned 20 XP. Nice work!"}</Text><Pressable style={s.primaryBtn} onPress={()=>{setMatchSolved([]);setMatchSelected(null);setMatchFirst(null);setMatchWrong([]);matchAwarded.current=false;}}><Text style={s.primaryText}>{language==="sv"?"Spela igen":"Play again"}</Text></Pressable></Animated.View>:<View style={{flexDirection:"row",flexWrap:"wrap",gap:9}}>{matchTiles.map(tile=>{const solved=matchSolved.includes(tile.pair),selected=matchSelected===tile.id,wrong=matchWrong.includes(tile.id),revealed=solved||selected||matchFirst===tile.id||wrong;return <Animated.View key={tile.id} style={{width:"48%",transform:[{scale:matchMotion.interpolate({inputRange:[0,1],outputRange:[0.94,1]})}]}}><Pressable disabled={solved} onPress={()=>setMatchSelected(tile.id)} style={[s.matchTile,solved&&s.matchTileSolved,selected&&s.matchTileSelected,wrong&&s.matchTileWrong]}><Text style={[s.matchTileText,solved&&{color:"#16A34A"}]} numberOfLines={5}>{solved?"✓":revealed?tile.text:(language==="sv"?"Tryck för att visa":"Tap to reveal")}</Text></Pressable></Animated.View>;})}</View>}
  </View>}
  {mode==="speed"&&<View style={s.sectionStack}>
    <Text style={s.heading}>{language==="sv"?"60 sekunders snabbquiz":language==="ar"?"اختبار سرعة لمدة 60 ثانية":"60-second speed round"}</Text>
    <Text style={s.mutedLeft}>{language==="sv"?"Svara så många frågor du kan innan tiden tar slut.":"Answer as many questions as you can before the timer runs out."}</Text>
    <View style={s.timerCard}><Text style={s.clock}>{Math.floor(speedSeconds/60)}:{String(speedSeconds%60).padStart(2,"0")}</Text><Text style={s.timerCaption}>{language==="sv"?"Poäng":"Score"} · {speedScore}</Text><View style={s.progressTrack}><View style={[s.progressFill,{width:(speedSeconds/60*100)+"%"}]}/></View></View>
    {!speedRunning&&speedSeconds>0&&<Pressable style={s.primaryBtn} onPress={()=>setSpeedRunning(true)}><Text style={s.primaryText}>{language==="sv"?"Starta snabbquiz":"Start speed round"}</Text></Pressable>}
    {speedSeconds===0?<View style={s.hero}><Ionicons name="trophy" size={32} color={c.accent}/><Text style={s.heading}>{language==="sv"?"Tiden är ute!":"Time's up!"}</Text><Text style={s.bigScore}>{speedScore}</Text><Text style={s.body}>{language==="sv"?"Du fick XP baserat på din poäng.":"You earned XP based on your score."}</Text><Pressable style={s.primaryBtn} onPress={()=>{setSpeedSeconds(60);setSpeedRunning(false);setSpeedIndex(0);setSpeedScore(0);setSpeedAnswered(false);speedAwarded.current=false;}}><Text style={s.primaryText}>{language==="sv"?"Spela igen":"Play again"}</Text></Pressable></View>:speedRunning&&speedQuiz&&<Animated.View style={[s.card,{opacity:questionMotion,transform:[{translateX:questionMotion.interpolate({inputRange:[0,1],outputRange:[25,0]})}]}]}><Text style={s.progress}>{language==="sv"?"Fråga":"Question"} {speedIndex+1}</Text><Text style={s.q}>{currentQuiz.question}</Text>{currentQuiz.options.map((option,index)=><Pressable key={index} disabled={speedAnswered} onPress={()=>{setSpeedAnswered(true);if(index===currentQuiz?.answer)setSpeedScore(v=>v+1);}} style={[s.secondaryBtn,speedAnswered&&index===currentQuiz.correctAnswer&&{borderColor:"#22C55E",backgroundColor:"#22C55E18"}]}><Text style={s.btnText}>{option}</Text></Pressable>)}{speedAnswered&&<><Text style={[s.feedback,{color:currentQuiz.correctAnswer!==undefined?c.accent:c.muted}]}>{language==="sv"?"Bra! Nästa fråga!":"Answer locked in — keep going!"}</Text><Pressable style={s.primaryBtn} onPress={()=>{setSpeedIndex(v=>(v+1)%Math.max(1,data.quiz.length));setSpeedAnswered(false);}}><Text style={s.primaryText}>{language==="sv"?"Nästa":"Next question"}</Text></Pressable></>}</Animated.View>}
  </View>}
  {mode==="plan"&&<View style={s.sectionStack}><Text style={s.heading}>{t("studyPlan")}</Text><Text style={s.mutedLeft}>{language==="sv"?"Ett enkelt upplägg för att repetera det viktigaste.":language==="ar"?"خطة بسيطة لمراجعة أهم المعلومات.":"A simple sequence to review the most important material."}</Text>{planSteps.map((step,i)=><View style={s.planRow} key={step}><View style={s.planNumber}><Text style={s.planNumberText}>{i+1}</Text></View><Text style={s.planText}>{step}</Text></View>)}<Pressable style={s.primaryBtn} onPress={()=>router.push("/focus")}><Text style={s.primaryText}>{t("startFocus")}</Text></Pressable></View>}
  {mode==="teach"&&<View style={s.sectionStack}><Text style={s.heading}>{t("teachBack")}</Text><Text style={s.mutedLeft}>{t("teachBackTip")}</Text><TextInput multiline value={teachText} onChangeText={setTeachText} placeholder={t("writeExplanation")} placeholderTextColor={c.subtle} style={s.teachInput}/><Text style={s.mutedLeft}>{language==="sv"?"Jämför din förklaring med sammanfattningen när du är klar.":language==="ar"?"قارن شرحك بالملخص عند الانتهاء.":"When you're done, compare your explanation with the summary."}</Text><Pressable style={s.secondaryBtn} onPress={()=>setMode("summary")}><Text style={s.btnText}>{language==="sv"?"Visa sammanfattningen":language==="ar"?"عرض الملخص":"Review summary"}</Text></Pressable></View>}
  {mode==="focus"&&<View style={s.sectionStack}><Text style={s.heading}>{t("focusTimer")}</Text><Text style={s.mutedLeft}>{t("focusReady")}</Text><View style={s.timerCard}><Text style={s.clock}>{clock}</Text><Text style={s.timerCaption}>{focusSeconds===0?t("focusDone"):t("minutes")}</Text><View style={s.row}><Pressable style={s.secondaryBtn} onPress={()=>setFocusRunning(v=>!v)}><Text style={s.btnText}>{focusRunning?t("pause"):focusSeconds===0?t("resume"):t("startFocus")}</Text></Pressable><Pressable style={s.primaryBtn} onPress={()=>{setFocusRunning(false);setFocusSeconds(1500);focusAwarded.current=false;focusRunId.current="focus-"+Date.now();}}><Text style={s.primaryText}>{t("reset")}</Text></Pressable></View></View></View>}
  {mode === "flashcards" && (
   <View>
    <View style={s.reviewHeader}>
     <Text style={s.progress}>{dueOnly ? t("dueCards") + " · " + visibleCardIndices.length : t("card") + " " + Math.min(card + 1, data.flashcards.length) + " " + t("of") + " " + data.flashcards.length}</Text>
     <Pressable style={[s.dueToggle, dueOnly && s.dueToggleActive]} onPress={() => { setDueOnly(value => !value); setCard(0); setShowAnswer(false); }}>
      <Text style={[s.dueToggleText, dueOnly && s.dueToggleTextActive]}>{dueOnly ? t("showAllCards") : t("reviewDue") + " · " + dueCount}</Text>
     </Pressable>
    </View>
    {visibleCardIndices.length === 0 ? (
     <View style={s.hero}>
      <Text style={s.heading}>{t("allCaughtUp")}</Text>
      <Text style={s.body}>{t("noCardsDue")}</Text>
      <Pressable style={s.primaryBtn} onPress={() => { setDueOnly(false); setCard(0); }}>
       <Text style={s.primaryText}>{t("studyAllCards")}</Text>
      </Pressable>
     </View>
    ) : (
     <View>
      <Animated.View style={{ opacity: flashMotion, transform: [{ scale: flashMotion.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }, { rotateY: flashMotion.interpolate({ inputRange: [0, 1], outputRange: ["-6deg", "0deg"] }) }] }}>
       <Pressable style={s.flashcard} onPress={() => setShowAnswer(value => !value)}>
        <Text style={s.flashLabel}>{showAnswer ? t("answer").toLocaleUpperCase() : t("question").toLocaleUpperCase()}</Text>
        <MarkdownText style={[s.flashText, { writingDirection: language === "ar" ? "rtl" : "auto" }]}>{showAnswer ? activeCard?.answer || "" : activeCard?.question || ""}</MarkdownText>
        <Text style={s.tap}>{t("tapReveal")}</Text>
       </Pressable>
      </Animated.View>
      {showAnswer && (
       <View style={s.ratingWrap}>
        <Text style={s.ratingTitle}>{t("howRemembered")}</Text>
        <View style={s.ratingRow}>
         <Pressable style={[s.ratingButton, s.ratingAgain]} onPress={() => rateCard("again")}><Text style={s.ratingText}>{t("again")}</Text><Text style={s.ratingSub}>10 {t("minutesShort")}</Text></Pressable>
         <Pressable style={s.ratingButton} onPress={() => rateCard("hard")}><Text style={s.ratingText}>{t("hard")}</Text><Text style={s.ratingSub}>1+ {t("daysShort")}</Text></Pressable>
         <Pressable style={s.ratingButton} onPress={() => rateCard("good")}><Text style={s.ratingText}>{t("good")}</Text><Text style={s.ratingSub}>1–14 {t("daysShort")}</Text></Pressable>
         <Pressable style={[s.ratingButton, s.ratingEasy]} onPress={() => rateCard("easy")}><Text style={s.ratingText}>{t("easy")}</Text><Text style={s.ratingSub}>4+ {t("daysShort")}</Text></Pressable>
        </View>
       </View>
      )}
      <View style={s.row}>
       <Pressable style={s.secondaryBtn} onPress={() => { setCard(Math.max(0, card - 1)); setShowAnswer(false); }}><Text style={s.btnText}>{t("previous")}</Text></Pressable>
       <Pressable style={s.primaryBtn} onPress={() => { setCard((card + 1) % visibleCardIndices.length); setShowAnswer(false); }}><Text style={s.primaryText}>{t("next")}</Text></Pressable>
      </View>
     </View>
    )}
   </View>
  )}
   {mode === "quiz" && (
    <View>
      {hearts <= 0 ? (
        <View style={s.hero}>
          <Text style={s.heading}>Out of hearts!</Text>
          <Text style={s.bigScore}>💔 0</Text>
          <Text style={s.body}>You ran out of hearts. Try the quiz again to earn them back.</Text>
          <Pressable style={s.primaryBtn} onPress={() => {
            const day = new Date().toISOString().slice(0, 10);
            setQuizIndex(0); setScore(0); setSelected(null); setHearts(5); setStamina(100);
            AsyncStorage.setItem("snapstudy:energy:v1", JSON.stringify({ day, hearts: 5, stamina: 100 })).catch(() => {});
          }}>
            <Text style={s.primaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : quizDone ? (
        <View style={s.hero}>
          <Text style={s.heading}>{t("quizComplete")}</Text>
          <Text style={s.bigScore}>{score}/{data.quiz.length}</Text>
          <Text style={s.body}>{t("score")}: {Math.round(score / Math.max(1, data.quiz.length) * 100)}%</Text>
          <Pressable style={s.primaryBtn} onPress={() => { const day = new Date().toISOString().slice(0, 10); setQuizIndex(0); setScore(0); setSelected(null); setHearts(5); AsyncStorage.setItem("snapstudy:energy:v1", JSON.stringify({ day, hearts: 5, stamina })).catch(() => {}); }}>
            <Text style={s.primaryText}>{t("retakeQuiz")}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={s.progress}>{t("questionProgress")} {quizIndex + 1} {t("of")} {data.quiz.length}</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: ((quizIndex + 1) / Math.max(1, data.quiz.length) * 100) + "%" }]} />
          </View>
          <Animated.View style={{ opacity: questionMotion, transform: [{ translateX: questionMotion.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { scale: questionMotion.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }] }}>
            <View style={s.card}>
              <Text style={s.q}>{currentQuiz?.question}</Text>
              {currentQuiz?.options.map((option, index) => {
                const picked = selected === index;
                const locked = selected !== null;
                return (
                  <Pressable
                    key={index}
                    disabled={locked}
                    onPress={async () => {
                      setSelected(index);
                      const nextHearts = index === currentQuiz.answer ? hearts : Math.max(0, hearts - 1);
                      const nextStamina = Math.max(0, stamina - 10);
                      if (index === currentQuiz.answer) setScore(value => value + 1);
                      else setHearts(nextHearts);
                      setStamina(nextStamina);
                      const day = new Date().toISOString().slice(0, 10);
                      AsyncStorage.setItem("snapstudy:energy:v1", JSON.stringify({ day, hearts: nextHearts, stamina: nextStamina })).catch(() => {});
                      await recordQuizAnswer(currentQuiz, index, data.topic);
                    }}
                    style={[s.optionBtn, picked && s.picked, selected !== null && index === currentQuiz?.answer && s.correctOption, picked && selected !== null && selected !== currentQuiz?.answer && s.wrongOption]}
                  >
                    <Text style={s.optionText}>{String.fromCharCode(65 + index)}. {option}</Text>
                  </Pressable>
                );
              })}
              {selected !== null && (
                <Animated.View style={{ opacity: feedbackMotion, transform: [{ translateY: feedbackMotion.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
                  <Text style={s.feedback}>{selected === currentQuiz?.answer ? t("correct") : t("notQuite")}</Text>
                  <MarkdownText style={s.explain}>{currentQuiz?.explanation || ""}</MarkdownText>
                  <Pressable style={s.primaryBtn} onPress={async () => { if(quizIndex===data.quiz.length-1){const today=new Date().toISOString().slice(0,10);await awardXP("quiz:"+today+":"+data.topic+":"+Date.now(),25,"quiz","Quiz completed",{quizzesCompleted:1,tasksCompleted:1,perfectQuizzes:(score===data.quiz.length?1:0)}).then(value=>setGameXP(value.totalXp)).catch(e=>console.warn("Could not award quiz XP",e));} setQuizIndex(value => value + 1); setSelected(null); }}>
                    <Text style={s.primaryText}>{quizIndex === data.quiz.length - 1 ? t("finish") : t("next")}</Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          </Animated.View>
        </>
      )}
    </View>
  )}
  {mode==="test"&&<View><Text style={s.progress}>{t("questionProgress")} {testIndex+1} {t("of")} {data.practiceTest.length}</Text><View style={s.progressTrack}><View style={[s.progressFill,{width:((testIndex+1)/Math.max(1,data.practiceTest.length)*100)+"%"}]}/></View><Animated.View style={{opacity:questionMotion,transform:[{translateX:questionMotion.interpolate({inputRange:[0,1],outputRange:[18,0]})}]}}><View style={s.card}><Text style={s.q}>{data.practiceTest[testIndex].question}</Text>{showTestAnswer&&<Animated.View style={{opacity:revealMotion,transform:[{translateY:revealMotion.interpolate({inputRange:[0,1],outputRange:[10,0]})}]}}><View style={s.answerBox}><Text style={s.flashLabel}>{t("answer").toUpperCase()}</Text><MarkdownText style={s.body}>{data.practiceTest[testIndex].answer}</MarkdownText></View></Animated.View>}<Pressable style={s.secondaryBtn} onPress={()=>setShowTestAnswer(!showTestAnswer)}><Text style={s.btnText}>{showTestAnswer?t("hideAnswer"):t("tapReveal")}</Text></Pressable><Pressable style={s.primaryBtn} onPress={()=>{setTestIndex(v=>v===data.practiceTest.length-1?0:v+1);setShowTestAnswer(false)}}><Text style={s.primaryText}>{testIndex===data.practiceTest.length-1?t("restartTest"):t("next")}</Text></Pressable></View></Animated.View></View>}
  <Pressable style={s.plusCard} onPress={()=>router.push("/plus")}><Text style={s.plusEyebrow}>SNAPSTUDY PLUS</Text><Text style={s.plusTitle}>{t("plusHeroTitle")}</Text><Text style={s.plusText}>{t("plusHeroSub")}</Text><Text style={s.plusLink}>{language==="sv"?"Utforska Plus →":language==="ar"?"اكتشف بلس ←":"Explore Plus →"}</Text></Pressable>
 </Animated.ScrollView></SafeAreaView>
}
function Stat({n,label}:{n:number;label:string}){const {colors:c}=useTheme();const s=makeStyles(c);return <View style={s.stat}><Text style={s.statN}>{n}</Text><Text style={s.statL}>{label}</Text></View>}
const makeStyles = (c: ThemeColors, language:"en"|"sv"|"ar"="en") => StyleSheet.create({matchProgress:{gap:7,marginBottom:12},matchTile:{minHeight:88,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:16,padding:12,alignItems:"center",justifyContent:"center"},matchTileSolved:{backgroundColor:c.surface,borderColor:"#22C55E",borderWidth:2,opacity:0.8},matchTileSelected:{borderColor:c.accent,borderWidth:2,backgroundColor:c.accent+"18"},matchTileWrong:{borderColor:"#EF4444",backgroundColor:"#EF444418"},matchTileText:{color:c.text,fontSize:13,fontWeight:"700",textAlign:"center"},
 safe:{flex:1,backgroundColor:c.bg},loadingScreen:{flex:1,backgroundColor:"#F8F4FF",overflow:"hidden",alignItems:"center",justifyContent:"center",padding:28},glowOne:{position:"absolute",width:290,height:290,borderRadius:145,backgroundColor:"#E6D9FF",top:-80,right:-100},glowTwo:{position:"absolute",width:250,height:250,borderRadius:125,backgroundColor:"#FFD9E9",bottom:-70,left:-80},loadingContent:{alignItems:"center",justifyContent:"center",width:"100%",maxWidth:360},loadingLogo:{width:90,height:90,borderRadius:30,backgroundColor:"#8D6AF5",alignItems:"center",justifyContent:"center",marginBottom:22,shadowColor:"#8D6AF5",shadowOpacity:0.3,shadowRadius:24,elevation:8},loadingBrand:{color:"#8D6AF5",fontSize:12,fontWeight:"900",letterSpacing:3},loadingTitle:{color:"#29233A",fontSize:25,fontWeight:"900",textAlign:"center",lineHeight:32,marginTop:17},loadingSubtitle:{color:"#81778F",fontSize:14,textAlign:"center",lineHeight:21,marginTop:10},loadingDots:{flexDirection:"row",gap:8,marginTop:28},loadingDot:{width:8,height:8,borderRadius:4,backgroundColor:"#8D6AF5"},loadingFoot:{color:"#9B91A8",fontSize:11,marginTop:28},goPlus:{alignSelf:"flex-end",flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:13,paddingVertical:8,borderRadius:999,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.accent,marginBottom:14},goPlusText:{color:c.accent,fontSize:11,fontWeight:"900"},goPlusArrow:{color:c.accent,fontSize:13,fontWeight:"900"},container:{padding:22,paddingTop:36,paddingBottom:55},center:{flex:1,alignItems:"center",justifyContent:"center",padding:30},back:{color:c.muted,fontSize:15,marginBottom:24},eyebrow:{color:c.muted,fontSize:11,fontWeight:"800",letterSpacing:1.8},title:{color:c.text,fontSize:31,fontWeight:"800",marginTop:7,marginBottom:16,writingDirection:language==="ar"?"rtl":"auto"},loading:{color:c.text,fontSize:17,fontWeight:"700",marginTop:18},muted:{color:c.subtle,textAlign:"center",lineHeight:20,marginTop:7},mutedLeft:{color:c.muted,fontSize:13,lineHeight:20,marginTop:5,marginBottom:12},error:{color:c.text,textAlign:"center",lineHeight:21,marginVertical:15},button:{backgroundColor:c.accent,paddingHorizontal:22,paddingVertical:13,borderRadius:12,marginTop:20},buttonText:{color:c.onAccent,fontWeight:"800"},tabs:{flexDirection:"row",gap:7,paddingBottom:15},tab:{flexDirection:"row",gap:7,paddingHorizontal:13,paddingVertical:10,alignItems:"center",borderRadius:14,borderWidth:1,borderColor:"rgba(255,255,255,0.22)",backgroundColor:"rgba(255,255,255,0.08)"},tabActive:{backgroundColor:c.accent,borderColor:c.accent},tabText:{color:c.subtle,fontSize:12,fontWeight:"800"},tabTextActive:{color:c.onAccent},energyHud:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:13,borderRadius:18,backgroundColor:"rgba(255,255,255,0.58)",borderWidth:1,borderColor:"rgba(255,255,255,0.8)",marginBottom:14},hudHearts:{flexDirection:"row",alignItems:"center",gap:7},hudStamina:{flexDirection:"row",alignItems:"center",gap:7,flex:1,marginLeft:18},hudTrack:{height:6,flex:1,borderRadius:99,backgroundColor:"rgba(141,106,245,0.15)",overflow:"hidden"},hudFill:{height:"100%",borderRadius:99,backgroundColor:"#9B7BFF"},hudText:{fontSize:11,fontWeight:"900",color:c.text},hero:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:20,padding:18},heading:{color:c.text,fontSize:20,fontWeight:"800",marginBottom:10},body:{color:c.muted,fontSize:14,lineHeight:22,writingDirection:language==="ar"?"rtl":"auto"},stats:{flexDirection:"row",gap:9,marginTop:12},stat:{flex:1,backgroundColor:c.surface,borderRadius:16,borderWidth:1,borderColor:c.border,padding:14},statN:{color:c.text,fontSize:22,fontWeight:"900"},statL:{color:c.subtle,fontSize:11,marginTop:3},progress:{color:c.subtle,fontSize:12,fontWeight:"700",marginBottom:8,writingDirection:language==="ar"?"rtl":"auto"},progressTrack:{height:5,borderRadius:99,backgroundColor:c.border,overflow:"hidden",marginBottom:16},progressFill:{height:"100%",borderRadius:99,backgroundColor:c.accent},flashcard:{minHeight:300,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:24,padding:25,justifyContent:"center",alignItems:"center"},flashLabel:{color:c.subtle,fontSize:11,fontWeight:"900",letterSpacing:1.5},flashText:{color:c.text,fontSize:25,fontWeight:"800",textAlign:"center",lineHeight:33,marginTop:18,writingDirection:language==="ar"?"rtl":"auto"},tap:{color:c.subtle,fontSize:12,marginTop:28},row:{flexDirection:"row",gap:10,marginTop:12},primaryBtn:{backgroundColor:c.accent,paddingVertical:14,paddingHorizontal:14,borderRadius:12,alignItems:"center",justifyContent:"center",marginTop:12,flex:1},secondaryBtn:{borderWidth:1,borderColor:c.border,paddingVertical:13,paddingHorizontal:14,borderRadius:12,alignItems:"center",justifyContent:"center",marginTop:12,flex:1},primaryText:{color:c.onAccent,fontWeight:"800",textAlign:"center"},btnText:{color:c.text,fontWeight:"800",textAlign:"center"},card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:17},q:{color:c.text,fontSize:16,fontWeight:"800",lineHeight:23,marginBottom:12,writingDirection:language==="ar"?"rtl":"auto"},optionBtn:{borderWidth:1,borderColor:c.border,borderRadius:15,padding:15,marginTop:9,minHeight:54,justifyContent:"center"},picked:{borderColor:c.accent,backgroundColor:c.accentSoft},correctOption:{borderColor:"#34A56A",backgroundColor:"#34A56A18"},wrongOption:{borderColor:"#E05A5A",backgroundColor:"#E05A5A18"},optionText:{color:c.muted,fontSize:13,lineHeight:19,writingDirection:language==="ar"?"rtl":"auto"},feedback:{color:c.text,fontSize:16,fontWeight:"800",marginTop:15},explain:{color:c.muted,fontSize:13,lineHeight:19,marginTop:5,writingDirection:language==="ar"?"rtl":"auto"},bigScore:{color:c.text,fontSize:52,fontWeight:"900",marginVertical:8},answerBox:{marginTop:10,padding:14,borderRadius:13,backgroundColor:c.input},sectionStack:{gap:8},conceptCard:{flexDirection:"row",gap:12,alignItems:"flex-start",padding:15,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,borderRadius:16,marginBottom:9},conceptNumber:{color:c.accent,fontSize:12,fontWeight:"900",paddingTop:2},conceptQuestion:{color:c.text,fontSize:14,fontWeight:"800",lineHeight:20,marginBottom:6,writingDirection:language==="ar"?"rtl":"auto"},planRow:{flexDirection:"row",alignItems:"center",gap:12,marginTop:8,padding:14,borderRadius:15,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},planNumber:{width:32,height:32,borderRadius:11,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},planNumberText:{color:c.accent,fontWeight:"900"},planText:{color:c.text,fontSize:13,lineHeight:20,flex:1,writingDirection:language==="ar"?"rtl":"auto"},teachInput:{minHeight:160,borderWidth:1,borderColor:c.border,borderRadius:15,padding:14,color:c.text,textAlignVertical:"top",marginTop:8,marginBottom:8,backgroundColor:c.surface},timerCard:{marginTop:8,padding:20,borderRadius:22,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},clock:{color:c.text,fontSize:58,fontWeight:"900",textAlign:"center",fontVariant:["tabular-nums"],marginVertical:20},timerCaption:{color:c.muted,fontSize:13,textAlign:"center"},reviewHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:10},dueToggle:{paddingHorizontal:11,paddingVertical:8,borderRadius:11,borderWidth:1,borderColor:c.border},dueToggleActive:{backgroundColor:c.accentSoft,borderColor:c.accent},dueToggleText:{color:c.muted,fontSize:10,fontWeight:"900"},dueToggleTextActive:{color:c.accent},ratingWrap:{marginTop:12,marginBottom:6,padding:13,borderRadius:16,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},ratingTitle:{color:c.text,fontSize:12,fontWeight:"900",marginBottom:10},ratingRow:{flexDirection:"row",gap:6},ratingButton:{flex:1,minHeight:48,borderRadius:11,backgroundColor:c.surfaceAlt,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center",paddingVertical:7},ratingAgain:{backgroundColor:"#FDECEC",borderColor:"#F2C2C2"},ratingEasy:{backgroundColor:c.accentSoft,borderColor:c.accent},ratingText:{color:c.text,fontSize:11,fontWeight:"900"},ratingSub:{color:c.muted,fontSize:8,marginTop:3},plusCard:{marginTop:16,borderRadius:19,padding:17,backgroundColor:c.accentSoft,borderWidth:1,borderColor:c.accent},plusEyebrow:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:1.5},plusTitle:{color:c.text,fontSize:17,fontWeight:"900",marginTop:8},plusText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:5},plusLink:{color:c.accent,fontWeight:"900",fontSize:13,marginTop:12}
});
