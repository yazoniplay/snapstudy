import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../components/LocalizedText";
import {useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,SafeAreaView,ScrollView,StyleSheet,View} from "react-native";
import { loadStudyData, saveStudyData } from "../lib/cloud-study-data";
import {router} from "expo-router";
import {useTheme,type ThemeColors} from "../lib/theme";
import {useLanguage} from "../lib/language";
import { supabase } from "../lib/supabase";
import MarkdownText from "../components/MarkdownText";
import ConfirmActionModal from "../components/ConfirmActionModal";

type WeakItem={id:string;topic:string;question:string;options:string[];answer:number;explanation:string;misses:number;attempts:number;correctStreak:number;mastered:boolean;lastMissedAt:number};
export default function WeakTopics(){
 const {colors:c}=useTheme();const {t,language}=useLanguage();const s=styles(c);
 const [items,setItems]=useState<WeakItem[]>([]);
 const [loaded,setLoaded]=useState(false);
  const [reviewBusy,setReviewBusy]=useState(false);
  const [review,setReview]=useState("");
  const [reviewError,setReviewError]=useState("");
 const [confirmClearMastered,setConfirmClearMastered]=useState(false);
 async function load(){try{const parsed=await loadStudyData<WeakItem[]>("weakTopics",[]);setItems(Array.isArray(parsed)?parsed:[]);}catch{setItems([]);}finally{setLoaded(true);}}
 useEffect(()=>{load();},[]);
 const active=items.filter(x=>!x.mastered).sort((a,b)=>(b.misses||0)-(a.misses||0));
 const mastered=items.filter(x=>x.mastered);
 async function clearMastered(){const next=items.filter(x=>!x.mastered);await saveStudyData("weakTopics",next);setItems(next);setConfirmClearMastered(false);}

 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
  <Pressable onPress={()=>router.back()}><Text style={s.back}>{t("back")}</Text></Pressable>
  <Text style={s.eyebrow}>SNAPSTUDY · REVIEW</Text>
  <Text style={s.title}>{t("weakTopicsTitle")}</Text>
  <Text style={s.subtitle}>{t("weakTopicsSub")}</Text>
  <View style={s.summary}><View style={s.stat}><Text style={s.statN}>{active.length}</Text><Text style={s.statL}>{t("weakTopics")}</Text></View><View style={s.stat}><Text style={s.statN}>{active.reduce((n,x)=>n+(x.misses||0),0)}</Text><Text style={s.statL}>{t("missedCount")}</Text></View></View>
  {!loaded?<Text style={s.empty}>{t("loading")}</Text>:active.length===0?<View style={s.emptyCard}><Text style={s.emptyTitle}>✓ {t("allCaughtUp")}</Text><Text style={s.empty}>{t("weakTopicsEmpty")}</Text><Pressable style={s.primary} onPress={()=>router.replace("/")}><Text style={s.primaryText}>{t("startStudying")}</Text></Pressable></View>:<>
   <Pressable style={s.primary} onPress={()=>router.push({pathname:"/study",params:{weak:"1",mode:"quiz"}})}><Text style={s.primaryText}>✦  {t("startWeakReview")}</Text></Pressable>
    <View style={s.aiReviewCard}>
      <View style={s.aiReviewHeader}><View style={s.aiIcon}><Text style={s.aiIconText}>✦</Text></View><View style={{flex:1}}><Text style={s.aiTitle}>{language==="sv"?"AI-repetition":"AI review"}</Text><Text style={s.aiSub}>{language==="sv"?"Få en genomgång av det du brukar missa":"Get a focused explanation of what you keep missing"}</Text></View></View>
      <Pressable disabled={reviewBusy} style={s.aiButton} onPress={async()=>{
        setReviewBusy(true);setReviewError("");setReview("");
        const payload=active.slice(0,18).map(item=>({topic:item.topic,question:item.question,options:item.options,correctAnswer:item.options?.[item.answer]||String(item.answer),explanation:item.explanation,misses:item.misses,correctStreak:item.correctStreak}));
        const prompt=(language==="sv"?"Gör en tydlig repetitionsgenomgång utifrån dessa svåra frågor. Svara på svenska. För varje ämne: förklara kärnkunskapen enkelt, visa vad som ofta blandas ihop, ge en minnesregel och avsluta med 3 korta övningsfrågor utan svar (lägg facit längst ner). Håll dig till informationen i frågorna och förklaringarna; markera om något inte går att avgöra.":"Create a focused review from these difficult questions. Explain the core ideas simply, point out likely confusions, give memory tips, then add 3 short practice questions with an answer key. Use only facts supported by the questions/explanations and say when something is unclear.")+"\n\n"+JSON.stringify(payload);
        try{const {data,error}=await supabase.functions.invoke("study-chat",{body:{messages:[{role:"user",content:prompt}],context:"Review the student's saved difficult questions. Treat the provided questions and explanations as the source material."}});if(error)throw error;const answer=typeof data?.message==="string"?data.message.trim():"";if(!answer)throw new Error(data?.error||"AI returned an empty review.");setReview(answer);}catch(e:any){setReviewError(e?.message||"AI review failed. Try again.");}finally{setReviewBusy(false);}
      }}>{reviewBusy?<ActivityIndicator color={c.onAccent}/>:<><Text style={s.aiButtonText}>{language==="sv"?"Låt AI repetera mina svåra frågor":"Review my difficult questions with AI"}</Text><Text style={s.aiButtonArrow}>→</Text></>}</Pressable>
      {reviewError?<Text style={s.aiError}>{reviewError}</Text>:null}
      {review?<View style={s.aiResult}><MarkdownText style={s.aiResultText}>{review}</MarkdownText></View>:null}
    </View>
   {active.map(item=><View key={item.id} style={s.item}><View style={s.itemTop}><Text style={s.topic}>{item.topic}</Text><Text style={s.misses}>{item.misses} {t("missedCount")}</Text></View><Text style={s.question}>{item.question}</Text><Text style={s.detail}>{language==="sv"?"Rätta svar i rad: ":language==="ar"?"الإجابات الصحيحة المتتالية: ":"Correct in a row: "}{item.correctStreak||0}/2</Text></View>)}
  </>}
  {mastered.length>0&&<Pressable style={s.secondary} onPress={()=>setConfirmClearMastered(true)}><Text style={s.secondaryText}>{t("clearMastered")} · {mastered.length}</Text></Pressable>}
 </ScrollView><ConfirmActionModal visible={confirmClearMastered} title={language==="sv"?"Ta bort behärskade frågor?":"Clear mastered questions?"} message={language==="sv"?"Detta tar bort alla frågor du markerat som behärskade från listan.":"This removes all questions marked as mastered from your saved weak-topic list."} confirmLabel={language==="sv"?"Ta bort":"Clear"} cancelLabel={language==="sv"?"Avbryt":"Cancel"} onCancel={()=>setConfirmClearMastered(false)} onConfirm={clearMastered}/></SafeAreaView>;
}
const styles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},container:{padding:22,paddingTop:25,paddingBottom:40},back:{color:c.muted,fontSize:14,fontWeight:"700",marginBottom:22},eyebrow:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:1.8},title:{color:c.text,fontSize:29,fontWeight:"900",marginTop:8},subtitle:{color:c.muted,fontSize:13,lineHeight:20,marginTop:8,marginBottom:18},summary:{flexDirection:"row",gap:10,marginBottom:16},stat:{flex:1,padding:16,borderRadius:16,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},statN:{color:c.text,fontSize:25,fontWeight:"900"},statL:{color:c.muted,fontSize:11,marginTop:3},primary:{backgroundColor:c.accent,borderRadius:13,paddingVertical:15,alignItems:"center",justifyContent:"center",marginBottom:15},primaryText:{color:c.onAccent,fontWeight:"900",fontSize:13},item:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:16,padding:15,marginBottom:10},itemTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8},topic:{color:c.accent,fontSize:11,fontWeight:"900",flex:1},misses:{color:c.muted,fontSize:10,fontWeight:"800"},question:{color:c.text,fontSize:14,fontWeight:"800",lineHeight:20,marginTop:10},detail:{color:c.subtle,fontSize:11,marginTop:8},emptyCard:{padding:20,borderRadius:18,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},aiReviewCard:{padding:15,borderRadius:18,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,marginBottom:15},aiReviewHeader:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:13},aiIcon:{width:38,height:38,borderRadius:12,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},aiIconText:{fontSize:21,color:c.accent,fontWeight:"900"},aiTitle:{color:c.text,fontSize:14,fontWeight:"900"},aiSub:{color:c.muted,fontSize:11,lineHeight:16,marginTop:3},aiButton:{minHeight:45,paddingHorizontal:13,paddingVertical:10,borderRadius:13,backgroundColor:c.accent,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},aiButtonText:{color:c.onAccent,fontSize:12,fontWeight:"900",flex:1},aiButtonArrow:{color:c.onAccent,fontSize:18,fontWeight:"900"},aiError:{color:c.danger,fontSize:12,lineHeight:17,marginTop:10},aiResult:{marginTop:13,padding:13,borderRadius:13,backgroundColor:c.input,borderWidth:1,borderColor:c.border},aiResultText:{color:c.text,fontSize:13,lineHeight:21},emptyTitle:{color:c.text,fontSize:17,fontWeight:"900",marginBottom:8},empty:{color:c.muted,fontSize:13,lineHeight:20},secondary:{padding:13,borderRadius:12,borderWidth:1,borderColor:c.border,alignItems:"center",marginTop:8},secondaryText:{color:c.text,fontWeight:"800",fontSize:12}
});
