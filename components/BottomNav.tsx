import { LocalizedText as Text } from "./LocalizedText";
import { Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";

import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
export default function BottomNav(){
 const { colors:c } = useTheme(); const s=makeStyles(c); const {t}=useLanguage();
 const path=usePathname();
 const studyRoutes=["/study-hub","/study","/focus","/planner","/progress","/weak-topics","/library"];
 const friendsRoutes=["/friends","/chat"];
 const items=[["/","home-outline","home"],["/study-hub","book-outline","studyHub"],["/ai","sparkles-outline","AI"],["/history","albums-outline","history"],["/friends","people-outline","friends"],["/leaderboard","trophy-outline","ranks"],["/account","person-circle-outline","account"]] as const;
 return <View style={s.wrap}><View style={s.bar}>{items.map(([href,icon,labelKey])=>{const active=path===href||(href==="/study-hub"&&studyRoutes.includes(path))||(href==="/ai"&&path==="/ai")||(href==="/friends"&&friendsRoutes.includes(path))||(href==="/account"&&(path==="/plus"||path==="/credits"));const label=labelKey==="AI"?"AI":t(labelKey);return <Pressable key={href} onPress={()=>router.replace(href)} style={s.item}><View style={[s.icon,active&&s.activeIcon]}><Ionicons name={icon} size={19} color={active?c.accent:c.subtle}/></View><Text style={[s.label,active&&s.activeText]}>{label}</Text></Pressable>})}</View></View>
}
const makeStyles = (c: ThemeColors) => StyleSheet.create({wrap:{paddingHorizontal:14,paddingTop:8,paddingBottom:10,backgroundColor:c.bg},bar:{height:68,borderRadius:24,backgroundColor:c.bg==="#F4F5FA"?"rgba(255,255,255,0.82)":"rgba(35,42,58,0.82)",borderWidth:1,borderColor:c.border,flexDirection:"row",alignItems:"center",justifyContent:"space-around",shadowColor:c.accent,shadowOpacity:0.14,shadowRadius:18,elevation:5},item:{flex:1,alignItems:"center",justifyContent:"center",gap:4},icon:{width:38,height:30,borderRadius:11,alignItems:"center",justifyContent:"center"},activeIcon:{backgroundColor:c.accentSoft},activeText:{color:c.accent},label:{color:c.subtle,fontSize:8.5,fontWeight:"800"}});