import {useEffect,useRef,useState} from "react";
import {ActivityIndicator,Animated,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {router, useLocalSearchParams} from "expo-router";
import {takePendingImage} from "../lib/image";
import {analyzeNotes} from "../lib/api";
import type {StudyResult} from "../lib/api";

import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
type Mode="summary"|"flashcards"|"quiz"|"test";
export default function Study(){
 const { colors:c } = useTheme(); const s=makeStyles(c); const {t}=useLanguage();
 const { id } = useLocalSearchParams<{id?: string}>();
 const [image]=useState(()=>takePendingImage()),[data,setData]=useState<StudyResult|null>(null),[error,setError]=useState(""),[mode,setMode]=useState<Mode>("summary");
 const [card,setCard]=useState(0),[showAnswer,setShowAnswer]=useState(false),[quizIndex,setQuizIndex]=useState(0),[score,setScore]=useState(0),[selected,setSelected]=useState<number|null>(null),[testIndex,setTestIndex]=useState(0),[showTestAnswer,setShowTestAnswer]=useState(false);
 const modeMotion=useRef(new Animated.Value(1)).current;
 useEffect(()=>{modeMotion.setValue(0);Animated.timing(modeMotion,{toValue:1,duration:220,useNativeDriver:true}).start();},[mode,modeMotion]);
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    if(id){
      const saved = await AsyncStorage.getItem("snapstudy:session:"+id);
      if(!saved) throw new Error("This saved study session could not be found on this device.");
      if(active) setData(JSON.parse(saved) as StudyResult);
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
 if(error)return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.title}>Couldn't analyze notes</Text><Text style={s.error}>{error}</Text><Text style={s.muted}>Check your connection and that the AI service is configured.</Text><Pressable style={s.button} onPress={()=>router.replace("/history")}><Text style={s.buttonText}>Back home</Text></Pressable></View></SafeAreaView>;
 if(!data)return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={c.onAccent}/><Text style={s.loading}>Building your study session…</Text><Text style={s.muted}>Reading handwriting and creating practice.</Text></View></SafeAreaView>;
 return <SafeAreaView style={s.safe}><Animated.ScrollView style={{opacity:modeMotion,transform:[{translateY:modeMotion.interpolate({inputRange:[0,1],outputRange:[8,0]})}]}} contentContainerStyle={s.container}>
  <Pressable onPress={()=>router.replace("/")}><Text style={s.back}>{t("newScan")}</Text></Pressable>
  <Text style={s.eyebrow}>{t("studySession")}</Text><Text style={s.title}>{data.topic}</Text>
  <View style={s.tabs}>{(["summary","flashcards","quiz","test"] as Mode[]).map(m=><Pressable key={m} onPress={()=>setMode(m)} style={[s.tab,mode===m&&s.tabActive]}><Text style={[s.tabText,mode===m&&s.tabTextActive]}>{m==="test"?"Practice test":m==="summary"?t("summary"):m==="flashcards"?t("flashcards"):"Quiz"}</Text></Pressable>)}</View>
  {mode==="summary"&&<><View style={s.hero}><Text style={s.heading}>Summary</Text><Text style={s.body}>{data.summary}</Text></View><View style={s.stats}><Stat n={data.flashcards.length} label="flashcards"/><Stat n={data.quiz.length} label="quiz questions"/><Stat n={data.practiceTest.length} label="test questions"/></View></>}
  {mode==="flashcards"&&<View><Text style={s.progress}>Card {Math.min(card+1,data.flashcards.length)} of {data.flashcards.length}</Text><Pressable style={s.flashcard} onPress={()=>setShowAnswer(!showAnswer)}><Text style={s.flashLabel}>{showAnswer?"ANSWER":"QUESTION"}</Text><Text style={s.flashText}>{showAnswer?data.flashcards[card].answer:data.flashcards[card].question}</Text><Text style={s.tap}>{showAnswer?"Tap to see question":"Tap to reveal answer"}</Text></Pressable><View style={s.row}><Pressable style={s.secondaryBtn} onPress={()=>{setCard(Math.max(0,card-1));setShowAnswer(false)}}><Text style={s.btnText}>Previous</Text></Pressable><Pressable style={s.primaryBtn} onPress={()=>{setCard(Math.min(data.flashcards.length-1,card+1));setShowAnswer(false)}}><Text style={s.primaryText}>Next</Text></Pressable></View></View>}
  {mode==="quiz"&&<View>{quizDone?<View style={s.hero}><Text style={s.heading}>Quiz complete 🎉</Text><Text style={s.bigScore}>{score}/{data.quiz.length}</Text><Text style={s.body}>Score: {Math.round(score/data.quiz.length*100)}%</Text><Pressable style={s.primaryBtn} onPress={()=>{setQuizIndex(0);setScore(0);setSelected(null)}}><Text style={s.primaryText}>Retake quiz</Text></Pressable></View>:<><Text style={s.progress}>Question {quizIndex+1} of {data.quiz.length}</Text><View style={s.card}><Text style={s.q}>{currentQuiz?.question}</Text>{currentQuiz?.options.map((o,i)=>{const picked=selected===i;const locked=selected!==null;return <Pressable key={i} disabled={locked} onPress={()=>{setSelected(i);if(i===currentQuiz.answer)setScore(v=>v+1)}} style={[s.optionBtn,picked&&s.picked]}><Text style={s.optionText}>{String.fromCharCode(65+i)}. {o}</Text></Pressable>})}{selected!==null&&<><Text style={s.feedback}>{selected===currentQuiz?.answer?"Correct ✓":"Not quite"}</Text><Text style={s.explain}>{currentQuiz?.explanation}</Text><Pressable style={s.primaryBtn} onPress={()=>{setQuizIndex(v=>v+1);setSelected(null)}}><Text style={s.primaryText}>{quizIndex===data.quiz.length-1?"Finish":"Next question"}</Text></Pressable></>}</View></>}</View>}
  {mode==="test"&&<View><Text style={s.progress}>Question {testIndex+1} of {data.practiceTest.length}</Text><View style={s.card}><Text style={s.q}>{data.practiceTest[testIndex].question}</Text>{showTestAnswer&&<View style={s.answerBox}><Text style={s.flashLabel}>{t("answer").toUpperCase()}</Text><Text style={s.body}>{data.practiceTest[testIndex].answer}</Text></View>}<Pressable style={s.secondaryBtn} onPress={()=>setShowTestAnswer(!showTestAnswer)}><Text style={s.btnText}>{showTestAnswer?"Hide answer":t("tapReveal")}</Text></Pressable><Pressable style={s.primaryBtn} onPress={()=>{setTestIndex(v=>Math.min(data.practiceTest.length-1,v+1));setShowTestAnswer(false)}}><Text style={s.primaryText}>{testIndex===data.practiceTest.length-1?"Done":t("next")}</Text></Pressable></View></View>}
 </Animated.ScrollView></SafeAreaView>
}
function Stat({n,label}:{n:number;label:string}){const {colors:c}=useTheme();const s=makeStyles(c);return <View style={s.stat}><Text style={s.statN}>{n}</Text><Text style={s.statL}>{label}</Text></View>}
const makeStyles = (c: ThemeColors) => StyleSheet.create({safe:{flex:1,backgroundColor:c.bg},container:{padding:22,paddingTop:25,paddingBottom:55},center:{flex:1,alignItems:"center",justifyContent:"center",padding:30},back:{color:c.muted,fontSize:15,marginBottom:24},eyebrow:{color:c.muted,fontSize:11,fontWeight:"800",letterSpacing:1.8},title:{color:c.text,fontSize:31,fontWeight:"800",marginTop:7,marginBottom:20},loading:{color:c.text,fontSize:17,fontWeight:"700",marginTop:18},muted:{color:c.subtle,textAlign:"center",lineHeight:20,marginTop:7},error:{color:c.text,textAlign:"center",lineHeight:21,marginVertical:15},button:{backgroundColor:c.accent,paddingHorizontal:22,paddingVertical:13,borderRadius:12,marginTop:20},buttonText:{color:c.onAccent,fontWeight:"800"},tabs:{flexDirection:"row",flexWrap:"wrap",backgroundColor:c.surface,borderRadius:14,padding:4,marginBottom:18,borderWidth:1,borderColor:c.border,gap:3},tab:{width:"32%",paddingVertical:10,alignItems:"center",borderRadius:10},tabActive:{backgroundColor:c.accent},tabText:{color:c.subtle,fontSize:12,fontWeight:"800"},tabTextActive:{color:c.onAccent},hero:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:20,padding:18},heading:{color:c.text,fontSize:19,fontWeight:"800",marginBottom:10},body:{color:c.muted,fontSize:14,lineHeight:22},stats:{flexDirection:"row",gap:9,marginTop:12},stat:{flex:1,backgroundColor:c.surface,borderRadius:16,borderWidth:1,borderColor:c.border,padding:14},statN:{color:c.text,fontSize:22,fontWeight:"900"},statL:{color:c.subtle,fontSize:11,marginTop:3},progress:{color:c.subtle,fontSize:12,fontWeight:"700",marginBottom:10},flashcard:{minHeight:320,backgroundColor:c.surface,borderRadius:24,padding:25,justifyContent:"center",alignItems:"center"},flashLabel:{color:c.subtle,fontSize:11,fontWeight:"900",letterSpacing:1.5},flashText:{color:c.text,fontSize:25,fontWeight:"800",textAlign:"center",lineHeight:33,marginTop:18},tap:{color:c.subtle,fontSize:12,marginTop:28},row:{flexDirection:"row",gap:10,marginTop:12},primaryBtn:{backgroundColor:c.accent,paddingVertical:14,borderRadius:12,alignItems:"center",marginTop:12,flex:1},secondaryBtn:{borderWidth:1,borderColor:c.border,paddingVertical:13,borderRadius:12,alignItems:"center",marginTop:12,flex:1},primaryText:{color:c.onAccent,fontWeight:"800"},btnText:{color:c.text,fontWeight:"800"},card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:18,padding:17},q:{color:c.text,fontSize:16,fontWeight:"800",lineHeight:23,marginBottom:12},optionBtn:{borderWidth:1,borderColor:c.border,borderRadius:12,padding:13,marginTop:8},picked:{borderColor:c.accent,backgroundColor:c.accentSoft},optionText:{color:c.muted,fontSize:13,lineHeight:19},feedback:{color:c.text,fontSize:16,fontWeight:"800",marginTop:15},explain:{color:c.muted,fontSize:13,lineHeight:19,marginTop:5},bigScore:{color:c.text,fontSize:52,fontWeight:"900",marginVertical:8},answerBox:{marginTop:10,padding:14,borderRadius:13,backgroundColor:c.input},flashLabel2:{color:c.subtle}});
