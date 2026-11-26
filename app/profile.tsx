import { LocalizedText as Text } from "../components/LocalizedText";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeColors } from "../lib/theme";

type PublicProfile = { id:string; username:string|null; display_name:string|null; avatar_url:string|null; profile_about:string|null; profile_status:string|null };
type Friendship = { id:string; user_a:string; user_b:string; requested_by:string; status:"pending"|"accepted"|"declined" };

export default function StudentProfile() {
  const params=useLocalSearchParams<{userId:string}>();
  const targetId=String(params.userId||"");
  const {colors:c}=useTheme();
  const s=styles(c);
  const [userId,setUserId]=useState("");
  const [person,setPerson]=useState<PublicProfile|null>(null);
  const [friendship,setFriendship]=useState<Friendship|null>(null);
  const [online,setOnline]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.replace("/auth");return;}
    setUserId(user.id);
    if(targetId===user.id){router.replace("/account");return;}
    const [{data:profile,error:profileError},{data:links,error:friendError}]=await Promise.all([
      supabase.rpc("get_public_profile",{target_user_id:targetId}),
      supabase.from("friendships").select("id,user_a,user_b,requested_by,status").or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    ]);
    if(profileError){Alert.alert("Couldn't open profile",profileError.message);setLoading(false);return;}
    if(friendError){Alert.alert("Couldn't check friendship",friendError.message);setLoading(false);return;}
    setPerson((profile||[])[0] as PublicProfile||null);
    setFriendship(((links||[]) as Friendship[]).find(row=>(row.user_a===targetId||row.user_b===targetId))||null);
    setLoading(false);
  },[targetId]);

  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!targetId)return;
    const channel=supabase.channel("snapstudy-presence-profile",{config:{presence:{key:"profile-viewer-"+Math.random().toString(36).slice(2)}}})
      .on("presence",{event:"sync"},()=>{
        const state=channel.presenceState() as Record<string,Array<{user_id?:string}>>;
        const ids=Object.entries(state).flatMap(([key,metas])=>metas.map(meta=>meta.user_id||key));
        setOnline(ids.includes(targetId));
      })
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[targetId]);

  const name=person?.display_name||person?.username||"Student";
  const accepted=friendship?.status==="accepted";
  const incoming=friendship?.status==="pending"&&friendship.requested_by!==userId;
  const outgoing=friendship?.status==="pending"&&friendship.requested_by===userId;
  async function addFriend(){
    setBusy(true);const {error}=await supabase.rpc("send_friend_request",{target_user_id:targetId});
    if(error)Alert.alert("Couldn't send request",error.message);else await load();setBusy(false);
  }
  async function acceptRequest(){
    setBusy(true);const {error}=await supabase.rpc("respond_friend_request",{target_user_id:targetId,accept_request:true});
    if(error)Alert.alert("Couldn't accept request",error.message);else await load();setBusy(false);
  }
  function removeFriend(){
    if(!friendship)return;
    Alert.alert("Remove friend?",`Remove ${name} from your study circle?`,[
      {text:"Cancel",style:"cancel"},
      {text:"Remove",style:"destructive",onPress:async()=>{setBusy(true);const {error}=await supabase.from("friendships").delete().eq("id",friendship.id);if(error)Alert.alert("Couldn't remove friend",error.message);else await load();setBusy(false);}}
    ]);
  }
  function openChat(){
    if(!friendship||!accepted)return;
    router.push({pathname:"/chat",params:{friendshipId:friendship.id,friendId:targetId,name}});
  }

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.container}>
      <Pressable style={s.back} onPress={()=>router.back()}><Ionicons name="arrow-back" size={21} color={c.text}/><Text style={s.backText}>Back</Text></Pressable>
      {loading?<ActivityIndicator color={c.accent} size="large" style={{marginTop:80}}/>:!person?<View style={s.empty}><Text style={s.title}>Profile unavailable</Text><Text style={s.sub}>This student profile couldn't be loaded.</Text></View>:<>
        <LinearGradient colors={[c.accentSoft,c.surface,c.bg]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.hero}>
          <View style={s.avatarWrap}>
            {person.avatar_url?<Image source={{uri:person.avatar_url}} style={s.avatar}/>:<View style={s.avatarFallback}><Text style={s.avatarLetter}>{name.slice(0,1).toUpperCase()}</Text></View>}
            <View style={[s.onlineDot,online?s.online:s.offline]}/>
          </View>
          <Text style={s.name}>{name}</Text>
          <Text style={s.handle}>@{person.username||"student"}</Text>
          <View style={s.statusPill}><View style={[s.statusDot,online?s.online:s.offline]}/><Text style={s.statusText}>{online?"Online":"Offline"} · {person.profile_status||"Ready to study"}</Text></View>
          <View style={s.actions}>
            {accepted?<Pressable style={s.primary} onPress={openChat}><Ionicons name="chatbubble-ellipses" size={18} color={c.onAccent}/><Text style={s.primaryText}>Chat</Text></Pressable>
              :incoming?<Pressable style={s.primary} disabled={busy} onPress={acceptRequest}>{busy?<ActivityIndicator color={c.onAccent}/>:<><Ionicons name="person-add" size={18} color={c.onAccent}/><Text style={s.primaryText}>Accept request</Text></>}</Pressable>
              :outgoing?<View style={s.pending}><Ionicons name="time-outline" size={17} color={c.accent}/><Text style={s.pendingText}>Request sent</Text></View>
              :<Pressable style={s.primary} disabled={busy} onPress={addFriend}>{busy?<ActivityIndicator color={c.onAccent}/>:<><Ionicons name="person-add" size={18} color={c.onAccent}/><Text style={s.primaryText}>Add friend</Text></>}</Pressable>}
            {accepted&&<Pressable style={s.secondary} disabled={busy} onPress={removeFriend}><Ionicons name="person-remove-outline" size={17} color={c.danger}/><Text style={s.secondaryText}>Remove</Text></Pressable>}
          </View>
        </LinearGradient>
        <View style={s.bioCard}><View style={s.sectionHeading}><Ionicons name="person-circle-outline" size={19} color={c.accent}/><Text style={s.sectionTitle}>About me</Text></View><Text style={s.bio}>{person.profile_about?.trim()||"This student hasn't added a bio yet."}</Text></View>
        <View style={s.note}><Ionicons name="shield-checkmark-outline" size={18} color={c.accent}/><Text style={s.noteText}>Only connect with classmates you know. You can remove a friend at any time.</Text></View>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const styles=(c:ThemeColors)=>StyleSheet.create({
  safe:{flex:1,backgroundColor:c.bg},container:{padding:18,paddingBottom:30},back:{flexDirection:"row",alignItems:"center",gap:7,paddingVertical:9,marginBottom:14},backText:{fontSize:13,fontWeight:"800",color:c.text},
  hero:{alignItems:"center",paddingHorizontal:22,paddingTop:30,paddingBottom:25,borderRadius:28,borderWidth:1,borderColor:c.border,overflow:"hidden"},
  avatarWrap:{width:108,height:108,marginBottom:16,position:"relative"},avatar:{width:108,height:108,borderRadius:36,borderWidth:3,borderColor:c.surface},avatarFallback:{width:108,height:108,borderRadius:36,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:c.surface},avatarLetter:{fontSize:40,fontWeight:"900",color:c.accent},onlineDot:{position:"absolute",right:1,bottom:1,width:23,height:23,borderRadius:12,borderWidth:4,borderColor:c.surface},online:{backgroundColor:"#22C55E"},offline:{backgroundColor:c.subtle},
  name:{fontSize:27,fontWeight:"900",letterSpacing:-.7,color:c.text,textAlign:"center"},handle:{fontSize:12,color:c.muted,marginTop:4},statusPill:{flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:13,paddingVertical:9,borderRadius:15,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,marginTop:16,maxWidth:"100%"},statusDot:{width:8,height:8,borderRadius:4},statusText:{fontSize:11,color:c.text,fontWeight:"700"},
  actions:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:9,marginTop:21,flexWrap:"wrap"},primary:{minHeight:45,paddingHorizontal:19,borderRadius:15,backgroundColor:c.accent,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},primaryText:{fontSize:12,fontWeight:"900",color:c.onAccent},secondary:{minHeight:45,paddingHorizontal:16,borderRadius:15,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,flexDirection:"row",alignItems:"center",gap:7},secondaryText:{fontSize:12,fontWeight:"800",color:c.danger},pending:{flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:16,paddingVertical:13,borderRadius:15,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},pendingText:{fontSize:12,fontWeight:"800",color:c.accent},
  bioCard:{padding:18,borderRadius:22,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,marginTop:16},sectionHeading:{flexDirection:"row",alignItems:"center",gap:8},sectionTitle:{fontSize:15,fontWeight:"900",color:c.text},bio:{fontSize:13,lineHeight:20,color:c.muted,marginTop:12},note:{flexDirection:"row",alignItems:"center",gap:9,padding:14,borderRadius:16,backgroundColor:c.accentSoft,marginTop:16},noteText:{flex:1,fontSize:11,lineHeight:16,color:c.muted},empty:{alignItems:"center",paddingVertical:60},title:{fontSize:22,fontWeight:"900",color:c.text},sub:{fontSize:13,color:c.muted,marginTop:8}
});
