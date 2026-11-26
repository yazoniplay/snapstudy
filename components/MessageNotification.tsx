import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { LocalizedText as Text } from "./LocalizedText";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme";

type Incoming = { friendshipId:string; friendId:string; name:string; body:string };

export default function MessageNotification(){
  const {colors:c}=useTheme();
  const pathname=usePathname();
  const [notice,setNotice]=useState<Incoming|null>(null);
  const opacity=useRef(new Animated.Value(0)).current;
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    let alive=true;
    let channel:any=null;
    const start=async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!alive||!user)return;
      channel=supabase.channel("snapstudy-incoming-message-"+user.id)
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},async(payload:any)=>{
          const message=payload.new;
          if(!message||message.sender_id===user.id||!message.friendship_id)return;
          const {data:friendship}=await supabase.from("friendships").select("id,user_a,user_b,status").eq("id",message.friendship_id).eq("status","accepted").maybeSingle();
          if(!friendship)return;
          if(message.id)await supabase.from("messages").update({delivered_at:new Date().toISOString()}).eq("id",message.id).is("delivered_at",null);
          const friendId=friendship.user_a===user.id?friendship.user_b:friendship.user_a;
          const {data:profile}=await supabase.from("profiles").select("display_name,username").eq("id",friendId).maybeSingle();
          const name=profile?.display_name||profile?.username||"Study buddy";
          const body=message.message_type==="image"?"📷 Sent you a photo":message.message_type==="gift"?"🎁 Sent you a gift":String(message.body||"New message");
          if(!alive)return;
          setNotice({friendshipId:message.friendship_id,friendId,name,body});
          if(timer.current)clearTimeout(timer.current);
          opacity.setValue(0);
          Animated.timing(opacity,{toValue:1,duration:190,useNativeDriver:true}).start();
          timer.current=setTimeout(()=>Animated.timing(opacity,{toValue:0,duration:180,useNativeDriver:true}).start(({finished})=>{if(finished&&alive)setNotice(null);}),6500);
        }).subscribe();
    };
    start();
    const {data:authListener}=supabase.auth.onAuthStateChange(()=>{if(channel)supabase.removeChannel(channel);channel=null;start();});
    return ()=>{alive=false;authListener.subscription.unsubscribe();if(channel)supabase.removeChannel(channel);if(timer.current)clearTimeout(timer.current);};
  },[opacity]);
  if(!notice)return null;
  const open=()=>{const item=notice;setNotice(null);if(timer.current)clearTimeout(timer.current);router.push({pathname:"/chat",params:{friendshipId:item.friendshipId,friendId:item.friendId,name:item.name}});};
  return <Animated.View style={[styles.position,{opacity,transform:[{translateY:opacity.interpolate({inputRange:[0,1],outputRange:[18,0]})}]}]}>
    <Pressable onPress={open} onLongPress={()=>setNotice(null)} style={[styles.card,{backgroundColor:c.surface,borderColor:c.border,shadowColor:c.text}]}>
      <View style={[styles.icon,{backgroundColor:c.accentSoft}]}><Ionicons name="chatbubble-ellipses" size={20} color={c.accent}/></View>
      <View style={styles.copy}><Text style={[styles.name,{color:c.text}]} numberOfLines={1}>{notice.name}</Text><Text style={[styles.body,{color:c.muted}]} numberOfLines={2}>{notice.body}</Text></View>
      <Pressable onPress={()=>setNotice(null)} hitSlop={10} style={styles.close}><Ionicons name="close" size={18} color={c.subtle}/></Pressable>
    </Pressable>
  </Animated.View>;
}
const styles=StyleSheet.create({
 position:{position:"absolute",left:12,right:12,bottom:88,zIndex:9999,elevation:20},
 card:{minHeight:70,borderRadius:17,borderWidth:1,padding:12,flexDirection:"row",alignItems:"center",gap:11,shadowOpacity:.2,shadowRadius:16,shadowOffset:{width:0,height:6}},
 icon:{width:42,height:42,borderRadius:13,alignItems:"center",justifyContent:"center"},
 copy:{flex:1,minWidth:0,gap:3},name:{fontSize:13,fontWeight:"900"},body:{fontSize:12,lineHeight:17},close:{padding:4,alignSelf:"flex-start"}
});
