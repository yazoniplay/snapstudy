import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";

export default function BottomNav(){
 const path=usePathname();
 const items=[["/","⌂","Home"],["/history","▤","History"],["/account","◉","Account"]] as const;
 return <View style={s.wrap}><View style={s.bar}>{items.map(([href,icon,label])=>{const active=path===href;return <Pressable key={href} onPress={()=>router.replace(href)} style={s.item}><View style={[s.icon,active&&s.activeIcon]}><Text style={[s.iconText,active&&s.activeText]}>{icon}</Text></View><Text style={[s.label,active&&s.activeText]}>{label}</Text></Pressable>})}</View></View>
}
const s=StyleSheet.create({wrap:{paddingHorizontal:14,paddingTop:8,paddingBottom:10,backgroundColor:"#070A12"},bar:{height:68,borderRadius:22,backgroundColor:"#101522",borderWidth:1,borderColor:"#242A3A",flexDirection:"row",alignItems:"center",justifyContent:"space-around"},item:{flex:1,alignItems:"center",justifyContent:"center",gap:4},icon:{width:38,height:30,borderRadius:11,alignItems:"center",justifyContent:"center"},activeIcon:{backgroundColor:"#1B1730"},iconText:{color:"#777286",fontSize:18,fontWeight:"900"},activeText:{color:"#B49AFF"},label:{color:"#777286",fontSize:10,fontWeight:"800"}});