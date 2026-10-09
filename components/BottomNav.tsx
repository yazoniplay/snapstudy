import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";

import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";
export default function BottomNav(){
 const { colors:c } = useTheme(); const s=makeStyles(c); const {t}=useLanguage();
 const path=usePathname();
 const items=[["/","⌂",t("home")],["/history","▤",t("history")],["/account","◉",t("account")]] as const;
 return <View style={s.wrap}><View style={s.bar}>{items.map(([href,icon,label])=>{const active=path===href;return <Pressable key={href} onPress={()=>router.replace(href)} style={s.item}><View style={[s.icon,active&&s.activeIcon]}><Text style={[s.iconText,active&&s.activeText]}>{icon}</Text></View><Text style={[s.label,active&&s.activeText]}>{label}</Text></Pressable>})}</View></View>
}
const makeStyles = (c: ThemeColors) => StyleSheet.create({wrap:{paddingHorizontal:14,paddingTop:8,paddingBottom:10,backgroundColor:c.bg},bar:{height:68,borderRadius:22,backgroundColor:c.surfaceAlt,borderWidth:1,borderColor:c.border,flexDirection:"row",alignItems:"center",justifyContent:"space-around"},item:{flex:1,alignItems:"center",justifyContent:"center",gap:4},icon:{width:38,height:30,borderRadius:11,alignItems:"center",justifyContent:"center"},activeIcon:{backgroundColor:c.accentSoft},iconText:{color:c.subtle,fontSize:18,fontWeight:"900"},activeText:{color:c.accent},label:{color:c.subtle,fontSize:10,fontWeight:"800"}});