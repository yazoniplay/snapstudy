import {useEffect,useState} from "react";
import {Alert,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {router} from "expo-router";
import {useTheme,type ThemeColors} from "../lib/theme";
import {useLanguage} from "../lib/language";

type WeakItem={id:string;topic:string;question:string;options:string[];answer:number;explanation:string;misses:number;attempts:number;correctStreak:number;mastered:boolean;lastMissedAt:number};
export default function WeakTopics(){
 const {colors:c}=useTheme();const {t,language}=useLanguage();const s=styles(c);
 const [items,setItems]=useState<WeakItem[]>([]);
 const [loaded,setLoaded]=useState(false);
 async function load(){try{const raw=await AsyncStorage.getItem("snapstudy:weakTopics");const parsed=raw?JSON.parse(raw):[];setItems(Array.isArray(parsed)?parsed:[]);}catch{setItems([]);}finally{setLoaded(true);}}
 useEffect(()=>{load();},[]);
 const active=items.filter(x=>!x.mastered).sort((a,b)=>(b.misses||0)-(a.misses||0));
 const mastered=items.filter(x=>x.mastered);
 async function clearMastered(){const next=items.filter(x=>!x.mastered);await AsyncStorage.setItem("snapstudy:weakTopics",JSON.stringify(next));setItems(next);Alert.alert(language==="sv"?"Klart":language==="ar"?"تم":"Done",language==="sv"?"Behärskade frågor har tagits bort.":language==="ar"?"تمت إزالة الأسئلة التي أتقنتها.":"Mastered questions were cleared.");}
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
  <Pressable onPress={()=>router.back()}><Text style={s.back}>{t("back")}</Text></Pressable>
  <Text style={s.eyebrow}>SNAPSTUDY · REVIEW</Text>
  <Text style={s.title}>{t("weakTopicsTitle")}</Text>
  <Text style={s.subtitle}>{t("weakTopicsSub")}</Text>
  <View style={s.summary}><View style={s.stat}><Text style={s.statN}>{active.length}</Text><Text style={s.statL}>{t("weakTopics")}</Text></View><View style={s.stat}><Text style={s.statN}>{active.reduce((n,x)=>n+(x.misses||0),0)}</Text><Text style={s.statL}>{t("missedCount")}</Text></View></View>
  {!loaded?<Text style={s.empty}>{t("loading")}</Text>:active.length===0?<View style={s.emptyCard}><Text style={s.emptyTitle}>✓ {t("allCaughtUp")}</Text><Text style={s.empty}>{t("weakTopicsEmpty")}</Text><Pressable style={s.primary} onPress={()=>router.replace("/")}><Text style={s.primaryText}>{t("startStudying")}</Text></Pressable></View>:<>
   <Pressable style={s.primary} onPress={()=>router.push({pathname:"/study",params:{weak:"1",mode:"quiz"}})}><Text style={s.primaryText}>✦  {t("startWeakReview")}</Text></Pressable>
   {active.map(item=><View key={item.id} style={s.item}><View style={s.itemTop}><Text style={s.topic}>{item.topic}</Text><Text style={s.misses}>{item.misses} {t("missedCount")}</Text></View><Text style={s.question}>{item.question}</Text><Text style={s.detail}>{language==="sv"?"Rätta svar i rad: ":language==="ar"?"الإجابات الصحيحة المتتالية: ":"Correct in a row: "}{item.correctStreak||0}/2</Text></View>)}
  </>}
  {mastered.length>0&&<Pressable style={s.secondary} onPress={clearMastered}><Text style={s.secondaryText}>{t("clearMastered")} · {mastered.length}</Text></Pressable>}
 </ScrollView></SafeAreaView>;
}
const styles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},container:{padding:22,paddingTop:25,paddingBottom:40},back:{color:c.muted,fontSize:14,fontWeight:"700",marginBottom:22},eyebrow:{color:c.accent,fontSize:10,fontWeight:"900",letterSpacing:1.8},title:{color:c.text,fontSize:29,fontWeight:"900",marginTop:8},subtitle:{color:c.muted,fontSize:13,lineHeight:20,marginTop:8,marginBottom:18},summary:{flexDirection:"row",gap:10,marginBottom:16},stat:{flex:1,padding:16,borderRadius:16,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},statN:{color:c.text,fontSize:25,fontWeight:"900"},statL:{color:c.muted,fontSize:11,marginTop:3},primary:{backgroundColor:c.accent,borderRadius:13,paddingVertical:15,alignItems:"center",justifyContent:"center",marginBottom:15},primaryText:{color:c.onAccent,fontWeight:"900",fontSize:13},item:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:16,padding:15,marginBottom:10},itemTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8},topic:{color:c.accent,fontSize:11,fontWeight:"900",flex:1},misses:{color:c.muted,fontSize:10,fontWeight:"800"},question:{color:c.text,fontSize:14,fontWeight:"800",lineHeight:20,marginTop:10},detail:{color:c.subtle,fontSize:11,marginTop:8},emptyCard:{padding:20,borderRadius:18,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},emptyTitle:{color:c.text,fontSize:17,fontWeight:"900",marginBottom:8},empty:{color:c.muted,fontSize:13,lineHeight:20},secondary:{padding:13,borderRadius:12,borderWidth:1,borderColor:c.border,alignItems:"center",marginTop:8},secondaryText:{color:c.text,fontWeight:"800",fontSize:12}
});
