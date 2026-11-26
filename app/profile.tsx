import { LocalizedText as Text } from "../components/LocalizedText";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeColors } from "../lib/theme";

type PublicProfile = { id:string; username:string|null; display_name:string|null; avatar_url:string|null; profile_about:string|null; profile_status:string|null };
type Friendship = { id:string; user_a:string; user_b:string; requested_by:string; status:"pending"|"accepted"|"declined" };

export default function StudentProfile() {
  const params=useLocalSearchParams<{userId?:string|string[]}>();
  const targetId=Array.isArray(params.userId)?params.userId[0]||"":params.userId||"";
  const {colors:c}=useTheme();const s=styles(c);
  const [userId,setUserId]=useState("");
  const [person,setPerson]=useState<PublicProfile|null>(null);
  const [friendship,setFriendship]=useState<Friendship|null>(null);
  const [online,setOnline]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user){router.replace("/auth");return;}
      setUserId(user.id);
      if(!targetId){setError("No student was selected. Go back and tap a profile photo again.");return;}
      if(targetId===user.id){router.replace("/account");return;}
      // Use the narrowly-scoped public profile RPC rather than querying the
      // profiles table directly. This avoids table RLS/column permission
      // differences between web sessions and native sessions.
      const {data:profiles,error:profileError}=await supabase.rpc("get_public_profile",{target_user_id:targetId});
      if(profileError)throw profileError;
      const profile=Array.isArray(profiles)?profiles[0]:profiles;
      if(!profile){setError("This profile is unavailable or no longer exists.");return;}
      setPerson(profile as PublicProfile);
      const {data:links,error:friendError}=await supabase.from("friendships")
        .select("id,user_a,user_b,requested_by,status")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      if(friendError)throw friendError;
      setFriendship(((links||[]) as Friendship[]).find(row=>row.user_a===targetId||row.user_b===targetId)||null);
    }catch(e:any){setError(e?.message||"Couldn't load this student profile.");}
    finally{setLoading(false);}
  },[targetId]);

  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!targetId)return;
    let active=true;
    // Use a per-student topic so this route never attaches presence handlers
    // to the already-subscribed app-wide channel.
    const channel=supabase.channel("snapstudy-presence:"+targetId,{config:{presence:{key:"profile-viewer-"+targetId}}});
    channel.on("presence",{event:"sync"},()=>{
      if(!active)return;
      const state=channel.presenceState() as Record<string,Array<{user_id?:string}>>;
      const ids=Object.entries(state).flatMap(([key,metas])=>metas.map(meta=>meta.user_id||key));
      setOnline(ids.includes(targetId));
    });
    channel.subscribe();
    return()=>{active=false;void supabase.removeChannel(channel);};
  },[targetId]);

  const name=person?.display_name||person?.username||"Student";
  const accepted=friendship?.status==="accepted";
  const incoming=friendship?.status==="pending"&&friendship.requested_by!==userId;
  const outgoing=friendship?.status==="pending"&&friendship.requested_by===userId;
  async function addFriend(){setBusy(true);const {error}=await supabase.rpc("send_friend_request",{target_user_id:targetId});if(error)setError(error.message);else await load();setBusy(false);}
  async function acceptRequest(){setBusy(true);const {error}=await supabase.rpc("respond_friend_request",{target_user_id:targetId,accept_request:true});if(error)setError(error.message);else await load();setBusy(false);}
  function removeFriend(){if(!friendship)return;Alert.alert("Remove friend?",`Remove ${name} from your study circle?`,[{text:"Cancel",style:"cancel"},{text:"Remove",style:"destructive",onPress:async()=>{setBusy(true);const {error}=await supabase.from("friendships").delete().eq("id",friendship.id);if(error)setError(error.message);else await load();setBusy(false);}}]);}
  function openChat(){if(friendship&&accepted)router.push({pathname:"/chat",params:{friendshipId:friendship.id,friendId:targetId,name}});}

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container}>
    <Pressable style={s.back} onPress={()=>router.replace("/friends")}><Ionicons name="arrow-back" size={21} color={c.text}/><Text style={s.backText}>Back to people</Text></Pressable>
    {loading?<View style={s.loading}><ActivityIndicator color={c.accent} size="large"/><Text style={s.sub}>Loading student profile…</Text></View>:error&&!person?<View style={s.errorCard}><Ionicons name="alert-circle-outline" size={30} color={c.danger}/><Text style={s.title}>Profile couldn’t open</Text><Text style={s.sub}>{error}</Text><Pressable style={s.primary} onPress={()=>void load()}><Text style={s.primaryText}>Try again</Text></Pressable></View>:person&&<>
      {error?<Text style={s.inlineError}>{error}</Text>:null}
      <View style={s.hero}>
        <View style={s.avatarWrap}>{person.avatar_url?<Image source={{uri:person.avatar_url}} style={s.avatar}/>:<View style={s.avatarFallback}><Text style={s.avatarLetter}>{name.slice(0,1).toUpperCase()}</Text></View>}<View style={[s.onlineDot,online?s.online:s.offline]}/></View>
        <Text style={s.name}>{name}</Text><Text style={s.handle}>@{person.username||"student"}</Text>
        <View style={s.statusPill}><View style={[s.statusDot,online?s.online:s.offline]}/><Text style={s.statusText}>{online?"Online":"Offline"} · {person.profile_status||"Ready to study"}</Text></View>
        <View style={s.actions}>
          {accepted?<Pressable style={s.primary} onPress={openChat}><Ionicons name="chatbubble-ellipses" size={18} color={c.onAccent}/><Text style={s.primaryText}>Chat</Text></Pressable>
          :incoming?<Pressable style={s.primary} disabled={busy} onPress={acceptRequest}>{busy?<ActivityIndicator color={c.onAccent}/>:<><Ionicons name="person-add" size={18} color={c.onAccent}/><Text style={s.primaryText}>Accept request</Text></>}</Pressable>
          :outgoing?<View style={s.pending}><Ionicons name="time-outline" size={17} color={c.accent}/><Text style={s.pendingText}>Request sent</Text></View>
          :<Pressable style={s.primary} disabled={busy} onPress={addFriend}>{busy?<ActivityIndicator color={c.onAccent}/>:<><Ionicons name="person-add" size={18} color={c.onAccent}/><Text style={s.primaryText}>Add friend</Text></>}</Pressable>}
          {accepted?<Pressable style={s.secondary} disabled={busy} onPress={removeFriend}><Ionicons name="person-remove-outline" size={17} color={c.danger}/><Text style={s.secondaryText}>Remove friend</Text></Pressable>:null}
        </View>
      </View>
      <View style={s.bioCard}><View style={s.sectionHeading}><Ionicons name="person-circle-outline" size={19} color={c.accent}/><Text style={s.sectionTitle}>About me</Text></View><Text style={s.bio}>{person.profile_about?.trim()||"This student hasn’t added a bio yet."}</Text></View>
    </>}
  </ScrollView></SafeAreaView>;
}

const styles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},container:{padding:18,paddingBottom:30},back:{flexDirection:"row",alignItems:"center",gap:7,paddingVertical:9,marginBottom:14},backText:{fontSize:13,fontWeight:"800",color:c.text},loading:{alignItems:"center",paddingVertical:70,gap:12},errorCard:{alignItems:"center",padding:24,borderRadius:24,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,marginTop:20},inlineError:{color:c.danger,backgroundColor:c.surface,padding:12,borderRadius:12,marginBottom:12},title:{fontSize:22,fontWeight:"900",color:c.text,textAlign:"center",marginTop:10},sub:{fontSize:13,lineHeight:20,color:c.muted,marginTop:8,textAlign:"center"},
 hero:{alignItems:"center",paddingHorizontal:22,paddingTop:30,paddingBottom:25,borderRadius:28,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,overflow:"hidden"},avatarWrap:{width:108,height:108,marginBottom:16,position:"relative"},avatar:{width:108,height:108,borderRadius:36,borderWidth:3,borderColor:c.surface},avatarFallback:{width:108,height:108,borderRadius:36,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:c.surface},avatarLetter:{fontSize:40,fontWeight:"900",color:c.accent},onlineDot:{position:"absolute",right:1,bottom:1,width:23,height:23,borderRadius:12,borderWidth:4,borderColor:c.surface},online:{backgroundColor:"#22C55E"},offline:{backgroundColor:c.subtle},name:{fontSize:27,fontWeight:"900",letterSpacing:-.7,color:c.text,textAlign:"center"},handle:{fontSize:12,color:c.muted,marginTop:4},statusPill:{flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:13,paddingVertical:9,borderRadius:15,backgroundColor:c.input,borderWidth:1,borderColor:c.border,marginTop:16,maxWidth:"100%"},statusDot:{width:8,height:8,borderRadius:4},statusText:{fontSize:11,color:c.text,fontWeight:"700"},actions:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:9,marginTop:21,flexWrap:"wrap"},primary:{minHeight:45,paddingHorizontal:19,borderRadius:15,backgroundColor:c.accent,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},primaryText:{fontSize:12,fontWeight:"900",color:c.onAccent},secondary:{minHeight:45,paddingHorizontal:16,borderRadius:15,backgroundColor:c.input,borderWidth:1,borderColor:c.border,flexDirection:"row",alignItems:"center",gap:7},secondaryText:{fontSize:12,fontWeight:"800",color:c.danger},pending:{flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:16,paddingVertical:13,borderRadius:15,backgroundColor:c.input,borderWidth:1,borderColor:c.border},pendingText:{fontSize:12,fontWeight:"800",color:c.accent},bioCard:{padding:18,borderRadius:22,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,marginTop:16},sectionHeading:{flexDirection:"row",alignItems:"center",gap:8},sectionTitle:{fontSize:15,fontWeight:"900",color:c.text},bio:{fontSize:13,lineHeight:20,color:c.muted,marginTop:12}
});

// Expo Router displays this boundary instead of leaving a blank white screen
// if a web/native render error occurs inside this route.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0E16", justifyContent: "center", padding: 24 }}>
      <View style={{ alignItems: "center", gap: 12 }}>
        <Ionicons name="alert-circle-outline" size={34} color="#FF9AAA" />
        <Text style={{ color: "#FFFFFF", fontSize: 21, fontWeight: "900", textAlign: "center" }}>Profile couldn’t open</Text>
        <Text style={{ color: "#C1C9D8", fontSize: 13, lineHeight: 20, textAlign: "center" }}>{error?.message || "Something went wrong while opening this profile."}</Text>
        <Pressable onPress={retry} style={{ backgroundColor: "#8B5CF6", borderRadius: 13, paddingHorizontal: 20, paddingVertical: 13 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>Try again</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/friends")} style={{ padding: 12 }}>
          <Text style={{ color: "#C1C9D8", fontWeight: "800" }}>Back to people</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
