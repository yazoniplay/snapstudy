import { useCallback, useEffect, useState } from "react";
import { Alert, ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import BottomNav from "../components/BottomNav";
import AdBanner from "../components/AdBanner";
import { useTheme, type ThemeColors } from "../lib/theme";

type Profile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
type Friendship = { id: string; user_a: string; user_b: string; requested_by: string; status: "pending" | "accepted" | "declined"; created_at: string };
type FriendRow = Friendship & { profile: Profile };

export default function Friends() {
  const { colors: c } = useTheme();
  const s = styles(c);
  const [userId, setUserId] = useState("");
  const [tab, setTab] = useState<"friends" | "requests" | "find">("friends");
  const [links, setLinks] = useState<FriendRow[]>([]);
  const [results, setResults] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [workingId, setWorkingId] = useState("");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }
    setUserId(user.id);
    const { data, error } = await supabase.from("friendships").select("id,user_a,user_b,requested_by,status,created_at").or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order("updated_at", { ascending: false });
    if (error) { Alert.alert("Couldn't load friends", error.message); setLoading(false); return; }
    const rows = (data || []) as Friendship[];
    const ids = [...new Set(rows.map(row => row.user_a === user.id ? row.user_b : row.user_a))];
    let profiles: Profile[] = [];
    if (ids.length) {
      const { data: people, error: profileError } = await supabase.rpc("get_social_profiles", { target_ids: ids });
      if (profileError) Alert.alert("Couldn't load profiles", profileError.message);
      profiles = (people || []) as Profile[];
    }
    setLinks(rows.map(row => ({ ...row, profile: profiles.find(person => person.id === (row.user_a === user.id ? row.user_b : row.user_a)) || { id: row.user_a === user.id ? row.user_b : row.user_a, username: null, display_name: "Student", avatar_url: null } })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase.channel("snapstudy-friendships")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function search() {
    const term = query.trim();
    if (term.length < 2) { Alert.alert("Keep searching", "Enter at least 2 characters of a username or name."); return; }
    setSearching(true);
    const { data, error } = await supabase.rpc("search_social_profiles", { search_term: term });
    if (error) Alert.alert("Search failed", error.message);
    else setResults((data || []) as Profile[]);
    setSearching(false);
  }

  async function sendRequest(person: Profile) {
    setWorkingId(person.id);
    const { error } = await supabase.rpc("send_friend_request", { target_user_id: person.id });
    if (error) Alert.alert("Couldn't send request", error.message);
    else { Alert.alert("Request sent", `Your friend request was sent to ${person.display_name || person.username || "this student"}.`); setResults(current => current.filter(p => p.id !== person.id)); await load(); }
    setWorkingId("");
  }

  async function respond(row: FriendRow, accept: boolean) {
    setWorkingId(row.id);
    const { error } = await supabase.rpc("respond_friend_request", { target_user_id: row.profile.id, accept_request: accept });
    if (error) Alert.alert("Couldn't update request", error.message);
    else await load();
    setWorkingId("");
  }

  function removeFriend(row: FriendRow) {
    Alert.alert("Remove friend?", `Remove ${row.profile.display_name || row.profile.username || "this student"} from your friends?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { const { error } = await supabase.from("friendships").delete().eq("id", row.id); if (error) Alert.alert("Couldn't remove friend", error.message); else await load(); } }
    ]);
  }

  const accepted = links.filter(row => row.status === "accepted");
  const incoming = links.filter(row => row.status === "pending" && row.requested_by !== userId);
  const outgoing = links.filter(row => row.status === "pending" && row.requested_by === userId);
  const displayName = (p: Profile) => p.display_name || p.username || "Student";

  function personCard(person: Profile, action: React.ReactNode, key = person.id) {
    return <View key={key} style={s.personCard}>
      <View style={s.personAvatar}>{person.avatar_url ? <Image source={{ uri: person.avatar_url }} style={s.avatarImage}/> : <Text style={s.avatarLetter}>{displayName(person).slice(0,1).toUpperCase()}</Text>}</View>
      <View style={s.personMeta}><Text style={s.personName} numberOfLines={1}>{displayName(person)}</Text><Text style={s.personHandle} numberOfLines={1}>@{person.username || "student"}</Text></View>
      {action}
    </View>;
  }

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.topline}><View style={s.titleIcon}><Ionicons name="people" size={23} color={c.accent}/></View><View style={{flex:1}}><Text style={s.eyebrow}>STUDY TOGETHER</Text><Text style={s.title}>Friends</Text></View><View style={s.countPill}><Ionicons name="people-outline" size={15} color={c.accent}/><Text style={s.countText}>{accepted.length}</Text></View></View>
      <Text style={s.subtitle}>Find your people, share notes, and celebrate every win.</Text>
      <View style={s.tabs}>
        {([["friends","Friends"],["requests",`Requests${incoming.length ? ` · ${incoming.length}` : ""}`],["find","Find people"]] as const).map(([id,label])=><Pressable key={id} onPress={()=>setTab(id)} style={[s.tab,tab===id&&s.tabActive]}><Text style={[s.tabText,tab===id&&s.tabTextActive]}>{label}</Text></Pressable>)}
      </View>
      {tab === "friends" && <View style={s.section}>
        <Text style={s.sectionTitle}>Your study circle</Text>
        {loading ? <ActivityIndicator color={c.accent} style={{margin:28}}/> : accepted.length ? accepted.map(row => personCard(row.profile, <View style={s.actions}><Pressable accessibilityLabel="Open chat" style={s.chatButton} onPress={()=>router.push({ pathname:"/chat", params:{ friendshipId:row.id, friendId:row.profile.id, name:displayName(row.profile) } })}><Ionicons name="chatbubble-ellipses" size={17} color={c.onAccent}/><Text style={s.chatButtonText}>Chat</Text></Pressable><Pressable accessibilityLabel="Remove friend" style={s.moreButton} onPress={()=>removeFriend(row)}><Ionicons name="ellipsis-horizontal" size={18} color={c.muted}/></Pressable></View>, row.id)) : <View style={s.empty}><View style={s.emptyIcon}><Ionicons name="people-outline" size={25} color={c.accent}/></View><Text style={s.emptyTitle}>Your circle starts here</Text><Text style={s.emptyText}>Find classmates by username and send your first friend request.</Text><Pressable style={s.primary} onPress={()=>setTab("find")}><Text style={s.primaryText}>Find people</Text><Ionicons name="arrow-forward" size={16} color={c.onAccent}/></Pressable></View>}
      </View>}
      {tab === "requests" && <View style={s.section}>
        <Text style={s.sectionTitle}>Incoming requests</Text>
        {incoming.length ? incoming.map(row=>personCard(row.profile,<View style={s.actions}><Pressable style={s.acceptButton} disabled={workingId===row.id} onPress={()=>respond(row,true)}><Ionicons name="checkmark" size={17} color="#fff"/></Pressable><Pressable style={s.declineButton} disabled={workingId===row.id} onPress={()=>respond(row,false)}><Ionicons name="close" size={17} color={c.danger}/></Pressable></View>,row.id)) : <Text style={s.emptyText}>No new requests right now.</Text>}
        <Text style={[s.sectionTitle,{marginTop:20}]}>Sent requests</Text>
        {outgoing.length ? outgoing.map(row=>personCard(row.profile,<View style={s.pendingPill}><Text style={s.pendingText}>Pending</Text></View>,row.id)) : <Text style={s.emptyText}>No pending sent requests.</Text>}
      </View>}
      {tab === "find" && <View style={s.section}>
        <Text style={s.sectionTitle}>Find a friend</Text><Text style={s.emptyText}>Search by username or display name. Only send requests to people you know.</Text>
        <View style={s.searchRow}><Ionicons name="search" size={19} color={c.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="Search students…" placeholderTextColor={c.subtle} autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={search} style={s.searchInput}/><Pressable onPress={search} disabled={searching} style={s.searchButton}>{searching?<ActivityIndicator size="small" color={c.onAccent}/>:<Ionicons name="arrow-forward" size={18} color={c.onAccent}/>}</Pressable></View>
        {results.map(person=>personCard(person,<Pressable disabled={workingId===person.id} style={s.addButton} onPress={()=>sendRequest(person)}>{workingId===person.id?<ActivityIndicator size="small" color={c.onAccent}/>:<><Ionicons name="person-add" size={15} color={c.onAccent}/><Text style={s.addButtonText}>Add</Text></>}</Pressable>))}
        {!results.length && <View style={s.searchHint}><Ionicons name="sparkles-outline" size={19} color={c.accent}/><Text style={s.searchHintText}>Try a username or at least two letters of a name.</Text></View>}
      </View>}
      <View style={s.privacy}><Ionicons name="shield-checkmark-outline" size={18} color={c.accent}/><Text style={s.privacyText}>Messages are private to accepted friends. You can remove a friend at any time.</Text></View>
      <AdBanner/>
    </ScrollView>
    <BottomNav/>
  </SafeAreaView>;
}

const styles = (c: ThemeColors) => StyleSheet.create({
  safe:{flex:1,backgroundColor:c.bg},container:{padding:20,paddingBottom:28},topline:{flexDirection:"row",alignItems:"center",gap:12},titleIcon:{width:48,height:48,borderRadius:16,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},eyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.8,color:c.muted},title:{fontSize:32,fontWeight:"900",letterSpacing:-1,color:c.text,marginTop:2},countPill:{flexDirection:"row",gap:5,alignItems:"center",paddingHorizontal:12,paddingVertical:8,borderRadius:18,backgroundColor:c.accentSoft},countText:{fontSize:13,fontWeight:"900",color:c.accent},subtitle:{color:c.muted,fontSize:13,lineHeight:19,marginTop:10,marginBottom:20},tabs:{flexDirection:"row",gap:6,padding:5,borderRadius:17,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,marginBottom:22},tab:{flex:1,paddingVertical:11,borderRadius:12,alignItems:"center"},tabActive:{backgroundColor:c.accentSoft},tabText:{fontSize:11,fontWeight:"800",color:c.muted},tabTextActive:{color:c.accent},section:{gap:10},sectionTitle:{fontSize:17,fontWeight:"900",color:c.text,marginBottom:3},personCard:{flexDirection:"row",alignItems:"center",gap:11,padding:12,borderRadius:18,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,minHeight:75},personAvatar:{width:46,height:46,borderRadius:16,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",overflow:"hidden"},avatarImage:{width:"100%",height:"100%"},avatarLetter:{fontSize:17,fontWeight:"900",color:c.accent},personMeta:{flex:1,minWidth:0},personName:{fontSize:13,fontWeight:"900",color:c.text},personHandle:{fontSize:11,color:c.muted,marginTop:4},actions:{flexDirection:"row",alignItems:"center",gap:7},chatButton:{flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:12,paddingVertical:10,borderRadius:12,backgroundColor:c.accent},chatButtonText:{fontSize:11,fontWeight:"900",color:c.onAccent},moreButton:{width:35,height:35,borderRadius:11,backgroundColor:c.input,alignItems:"center",justifyContent:"center"},acceptButton:{width:36,height:36,borderRadius:12,backgroundColor:"#23A779",alignItems:"center",justifyContent:"center"},declineButton:{width:36,height:36,borderRadius:12,backgroundColor:c.input,alignItems:"center",justifyContent:"center"},pendingPill:{paddingHorizontal:10,paddingVertical:7,borderRadius:11,backgroundColor:c.accentSoft},pendingText:{fontSize:10,fontWeight:"800",color:c.accent},empty:{alignItems:"center",paddingVertical:30,paddingHorizontal:18,borderRadius:22,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},emptyIcon:{width:56,height:56,borderRadius:19,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:14},emptyTitle:{fontSize:17,fontWeight:"900",color:c.text},emptyText:{fontSize:12,lineHeight:18,color:c.muted,marginTop:4},primary:{marginTop:17,flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",paddingHorizontal:18,paddingVertical:13,borderRadius:13,backgroundColor:c.accent},primaryText:{fontSize:12,fontWeight:"900",color:c.onAccent},searchRow:{flexDirection:"row",alignItems:"center",gap:9,paddingLeft:14,paddingRight:5,borderRadius:15,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,minHeight:52,marginTop:8,marginBottom:8},searchInput:{flex:1,color:c.text,fontSize:13,paddingVertical:10},searchButton:{width:42,height:42,borderRadius:12,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},addButton:{minWidth:75,height:39,paddingHorizontal:11,borderRadius:12,backgroundColor:c.accent,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5},addButtonText:{fontSize:11,fontWeight:"900",color:c.onAccent},searchHint:{flexDirection:"row",gap:9,alignItems:"center",padding:13,backgroundColor:c.accentSoft,borderRadius:14,marginTop:5},searchHintText:{flex:1,color:c.muted,fontSize:11,lineHeight:16},privacy:{flexDirection:"row",gap:9,alignItems:"center",padding:14,borderRadius:16,backgroundColor:c.accentSoft,marginTop:23,marginBottom:18},privacyText:{flex:1,color:c.muted,fontSize:11,lineHeight:16}
});
