import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";

import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
export default function BottomNav(){
 const { colors:c } = useTheme(); const s=makeStyles(c); const {t}=useLanguage();
 const path=usePathname();
 const items=[["/","home-outline","home"],["/history","albums-outline","history"],["/leaderboard","trophy-outline","ranks"],["/account","person-circle-outline","account"]] as const;
 return <View style={s.wrap}><View style={s.bar}>{items.map(([href,icon,labelKey])=>{const active=path===href;return <Pressable key={href} onPress={()=>router.replace(href)} style={s.item}><View style={[s.icon,active&&s.activeIcon]}><Ionicons name={icon} size={21} color={active?c.accent:c.subtle}/></View><Text style={[s.label,active&&s.activeText]}>{t(labelKey)}</Text></Pressable>})}</View></View>
}
const makeStyles = (c: ThemeColors) => StyleSheet.create({wrap:{paddingHorizontal:14,paddingTop:8,paddingBottom:10,backgroundColor:c.bg},bar:{height:68,borderRadius:24,backgroundColor:"rgba(255,255,255,0.72)",borderWidth:1,borderColor:"rgba(255,255,255,0.9)",flexDirection:"row",alignItems:"center",justifyContent:"space-around",shadowColor:"#6D4AFF",shadowOpacity:0.08,shadowRadius:18,elevation:5},item:{flex:1,alignItems:"center",justifyContent:"center",gap:4},icon:{width:38,height:30,borderRadius:11,alignItems:"center",justifyContent:"center"},activeIcon:{backgroundColor:c.accentSoft},activeText:{color:c.accent},label:{color:c.subtle,fontSize:10,fontWeight:"800"}});