import { useEffect, useRef } from "react";
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import SnapStudyMark from "./SnapStudyMark";
import { useTheme } from "../lib/theme";

export default function LoadingScreen() {
  const { colors:c, mode } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const spinLoop = Animated.loop(Animated.timing(spin,{toValue:1,duration:7600,easing:Easing.linear,useNativeDriver:true}));
    const breatheLoop = Animated.loop(Animated.sequence([
      Animated.timing(breathe,{toValue:1,duration:1250,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),
      Animated.timing(breathe,{toValue:0,duration:1250,easing:Easing.inOut(Easing.ease),useNativeDriver:true})
    ]));
    const progressLoop = Animated.loop(Animated.sequence([
      Animated.timing(progress,{toValue:1,duration:1450,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
      Animated.timing(progress,{toValue:0,duration:250,easing:Easing.linear,useNativeDriver:true})
    ]));
    Animated.spring(appear,{toValue:1,friction:8,tension:48,useNativeDriver:true}).start();
    spinLoop.start(); breatheLoop.start(); progressLoop.start();
    return () => { spinLoop.stop(); breatheLoop.stop(); progressLoop.stop(); };
  },[spin,breathe,progress,appear]);
  const rotation=spin.interpolate({inputRange:[0,1],outputRange:["0deg","360deg"]});
  const scale=breathe.interpolate({inputRange:[0,1],outputRange:[0.96,1.045]});
  const slide=appear.interpolate({inputRange:[0,1],outputRange:[22,0]});
  const barX=progress.interpolate({inputRange:[0,1],outputRange:[-86,218]});
  const muted=mode==="dark"?"rgba(255,255,255,0.56)":c.muted;
  return <SafeAreaView style={[s.safe,{backgroundColor:c.bg}]}>
    <View pointerEvents="none" style={[s.glow,{backgroundColor:c.accentSoft,top:-155,left:-145}]}/>
    <View pointerEvents="none" style={[s.glow,{backgroundColor:c.accentSoft,bottom:-170,right:-140,opacity:0.55}]}/>
    <Animated.View style={[s.content,{opacity:appear,transform:[{translateY:slide}]}]}>
      <View style={s.orbitStage}>
        <Animated.View style={[s.orbit,{transform:[{rotate:rotation}]}]}>
          <View style={[s.orbitDot,{backgroundColor:c.accent,top:4,left:"50%"}]}/>
          <View style={[s.orbitDotSmall,{backgroundColor:c.accent,bottom:20,right:9}]}/>
        </Animated.View>
        <Animated.View style={[s.logoShadow,{transform:[{scale}]}]}>
          <LinearGradient colors={mode==="dark"?["#7B65FF","#A66BFF","#DB85C8"]:["#7058F5","#9C6BFA","#E58DCB"]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.logo}>
            <SnapStudyMark size={76}/>
          </LinearGradient>
        </Animated.View>
        <View style={[s.floatChip,{top:18,left:4,backgroundColor:c.surface,borderColor:c.border}]}>
          <Ionicons name="sparkles" size={16} color={c.accent}/>
        </View>
        <View style={[s.floatChip,{bottom:16,right:2,backgroundColor:c.surface,borderColor:c.border}]}>
          <Ionicons name="book-outline" size={16} color={c.accent}/>
        </View>
      </View>
      <Text style={[s.brand,{color:c.text}]}>SnapStudy</Text>
      <Text style={[s.tagline,{color:muted}]}>Your next breakthrough starts here.</Text>
      <View style={[s.loadingTrack,{backgroundColor:c.border}]}>
        <Animated.View style={[s.loadingBar,{backgroundColor:c.accent,transform:[{translateX:barX}]}]}/>
      </View>
      <Text style={[s.loadingLabel,{color:muted}]}>Building your study space</Text>
      <View style={s.featureRow}>
        <View style={[s.feature,{backgroundColor:c.surface,borderColor:c.border}]}><Ionicons name="flash-outline" size={15} color={c.accent}/><Text style={[s.featureText,{color:c.text}]}>Focus</Text></View>
        <View style={[s.feature,{backgroundColor:c.surface,borderColor:c.border}]}><Ionicons name="layers-outline" size={15} color={c.accent}/><Text style={[s.featureText,{color:c.text}]}>Learn</Text></View>
        <View style={[s.feature,{backgroundColor:c.surface,borderColor:c.border}]}><Ionicons name="trending-up-outline" size={15} color={c.accent}/><Text style={[s.featureText,{color:c.text}]}>Grow</Text></View>
      </View>
    </Animated.View>
  </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,alignItems:"center",justifyContent:"center",overflow:"hidden",paddingHorizontal:24},
 glow:{position:"absolute",width:340,height:340,borderRadius:170,opacity:0.65},
 content:{width:"100%",maxWidth:360,alignItems:"center"},
 orbitStage:{width:210,height:210,alignItems:"center",justifyContent:"center",marginBottom:22},
 orbit:{position:"absolute",width:184,height:184,borderRadius:92,borderWidth:1.5,borderStyle:"dashed",borderColor:"rgba(141,106,245,0.35)"},
 orbitDot:{position:"absolute",width:11,height:11,borderRadius:6,marginLeft:-5.5},
 orbitDotSmall:{position:"absolute",width:7,height:7,borderRadius:4},
 logoShadow:{borderRadius:35,shadowColor:"#8B69F5",shadowOpacity:0.25,shadowRadius:28,shadowOffset:{width:0,height:12},elevation:10},
 logo:{width:112,height:112,borderRadius:35,alignItems:"center",justifyContent:"center"},
 floatChip:{position:"absolute",width:38,height:38,borderRadius:14,borderWidth:1,alignItems:"center",justifyContent:"center",shadowColor:"#000",shadowOpacity:0.08,shadowRadius:10,shadowOffset:{width:0,height:5},elevation:3},
 brand:{fontSize:30,fontWeight:"900",letterSpacing:-1.1},
 tagline:{fontSize:13,fontWeight:"600",marginTop:8,textAlign:"center"},
 loadingTrack:{width:190,height:5,borderRadius:8,overflow:"hidden",marginTop:34},
 loadingBar:{width:"42%",height:"100%",borderRadius:8},
 loadingLabel:{fontSize:11,fontWeight:"700",letterSpacing:0.2,marginTop:12},
 featureRow:{flexDirection:"row",gap:8,marginTop:30},
 feature:{flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:12,paddingVertical:9,borderRadius:13,borderWidth:1},
 featureText:{fontSize:11,fontWeight:"800"}
});