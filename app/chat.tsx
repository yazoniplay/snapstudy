import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../components/LocalizedText";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeColors } from "../lib/theme";

type ChatReaction = {message_id:string;user_id:string;emoji:string};
type ChatMessage = { id:string; friendship_id:string; sender_id:string; message_type:"text"|"image"|"gift"; body:string|null; media_path:string|null; gift_code:string|null; created_at:string; read_at:string|null; reply_to?:string|null; edited_at?:string|null; deleted_at?:string|null; imageUrl?:string|null; reactions?:ChatReaction[] };
const GIFTS: Record<string,{emoji:string;label:string}> = {
  heart:{emoji:"💗",label:"A little love"}, star:{emoji:"⭐",label:"You're a star"},
  book:{emoji:"📚",label:"Study buddy"}, trophy:{emoji:"🏆",label:"You did it"},
  sparkles:{emoji:"✨",label:"Keep shining"}
};

export default function Chat() {
  const params = useLocalSearchParams<{friendshipId:string;friendId:string;name?:string}>();
  const friendshipId = String(params.friendshipId || "");
  const friendId = String(params.friendId || "");
  const friendName = String(params.name || "Study buddy");
  const { colors:c } = useTheme();
  const s = styles(c);
  const [userId,setUserId] = useState("");
  const [messages,setMessages] = useState<ChatMessage[]>([]);
  const [draft,setDraft] = useState("");
  const [loading,setLoading] = useState(true);
  const [sending,setSending] = useState(false);
  const [giftPicker,setGiftPicker] = useState(false);
  const [replyTo,setReplyTo] = useState<string|null>(null);
  const [editingMessageId,setEditingMessageId] = useState<string|null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const loadMessages = useCallback(async () => {
    if (!friendshipId) { Alert.alert("Chat unavailable","Open a chat from your friends list."); router.replace("/friends"); return; }
    const {data:{user}} = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }
    setUserId(user.id);
    const {data,error} = await supabase.from("messages").select("id,friendship_id,sender_id,message_type,body,media_path,gift_code,created_at,read_at,reply_to,edited_at,deleted_at").eq("friendship_id",friendshipId).order("created_at",{ascending:true}).limit(250);
    if (error) { Alert.alert("Couldn't load chat",error.message); setLoading(false); return; }
    const rows = (data || []) as ChatMessage[];
    const ids=rows.map(message=>message.id);
    let reactionRows:ChatReaction[]=[];
    if(ids.length){const {data:reactions}=await supabase.from("message_reactions").select("message_id,user_id,emoji").in("message_id",ids);reactionRows=(reactions||[]) as ChatReaction[];}
    const hydrated = await Promise.all(rows.map(async message => {
      const reactions=reactionRows.filter(reaction=>reaction.message_id===message.id);
      if (message.message_type !== "image" || !message.media_path) return {...message,reactions};
      const {data: signed} = await supabase.storage.from("chat-images").createSignedUrl(message.media_path,3600);
      return {...message,imageUrl:signed?.signedUrl || null,reactions};
    }));
    setMessages(hydrated);
    setLoading(false);
    const unread = rows.filter(message=>message.sender_id!==user.id && !message.read_at).map(message=>message.id);
    if (unread.length) await supabase.from("messages").update({read_at:new Date().toISOString()}).in("id",unread);
    setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),80);
  },[friendshipId]);

  useEffect(()=>{
    loadMessages();
    const channel = supabase.channel("snapstudy-chat-"+friendshipId)
      .on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:"friendship_id=eq."+friendshipId},()=>{loadMessages();})
      .on("postgres_changes",{event:"*",schema:"public",table:"message_reactions"},()=>{loadMessages();})
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[friendshipId,loadMessages]);

  async function sendText() {
    const body = draft.trim();
    if (!body || sending || !friendshipId || !userId) return;
    setSending(true); setDraft("");
    const result=editingMessageId
      ? await supabase.from("messages").update({body,edited_at:new Date().toISOString()}).eq("id",editingMessageId).eq("sender_id",userId)
      : await supabase.from("messages").insert({friendship_id:friendshipId,sender_id:userId,message_type:"text",body,reply_to:replyTo});
    if (result.error) { setDraft(body); Alert.alert("Message not sent",result.error.message); }
    else {setReplyTo(null);setEditingMessageId(null);await loadMessages();}
    setSending(false);
  }
  async function toggleReaction(message:ChatMessage,emoji:string) {
    if(!userId)return;
    const own=message.reactions?.find(reaction=>reaction.user_id===userId&&reaction.emoji===emoji);
    const result=own
      ? await supabase.from("message_reactions").delete().eq("message_id",message.id).eq("user_id",userId).eq("emoji",emoji)
      : await supabase.from("message_reactions").insert({message_id:message.id,user_id:userId,emoji});
    if(result.error)Alert.alert("Reaction not saved",result.error.message);else await loadMessages();
  }
  function openMessageActions(message:ChatMessage,mine:boolean) {
    const buttons:any[]=[{text:"Reply",onPress:()=>{setReplyTo(message.id);setEditingMessageId(null);}}];
    if(mine&&message.message_type==="text"&&!message.deleted_at)buttons.push({text:"Edit",onPress:()=>{setDraft(message.body||"");setEditingMessageId(message.id);setReplyTo(null);}});
    if(mine&&message.message_type==="text"&&!message.deleted_at)buttons.push({text:"Delete",style:"destructive",onPress:async()=>{const {error}=await supabase.from("messages").update({body:"This message was deleted.",deleted_at:new Date().toISOString(),edited_at:null}).eq("id",message.id).eq("sender_id",userId);if(error)Alert.alert("Couldn't delete message",error.message);else await loadMessages();}});
    buttons.push({text:"Cancel",style:"cancel"});
    Alert.alert("Message actions","Reply, react, or manage your message.",buttons);
  }

  async function sendImage() {
    if (sending || !userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Photo permission needed","Allow photo access to send a study photo."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],quality:0.8,allowsEditing:false});
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5*1024*1024) { Alert.alert("Photo is too large","Choose an image smaller than 5 MB."); return; }
    setSending(true);
    try {
      const mime = asset.mimeType || "image/jpeg";
      if (!["image/jpeg","image/png","image/webp"].includes(mime)) throw new Error("Choose a JPG, PNG, or WebP image.");
      const ext = mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
      const path = friendshipId+"/"+userId+"/"+Date.now()+"."+ext;
      const response = await fetch(asset.uri);
      const bytes = await response.arrayBuffer();
      const {error:uploadError} = await supabase.storage.from("chat-images").upload(path,bytes,{contentType:mime,upsert:false});
      if (uploadError) throw uploadError;
      const {error:messageError} = await supabase.from("messages").insert({friendship_id:friendshipId,sender_id:userId,message_type:"image",media_path:path});
      if (messageError) { await supabase.storage.from("chat-images").remove([path]); throw messageError; }
      await loadMessages();
    } catch(e:any) { Alert.alert("Couldn't send photo",e?.message || "Try another image."); }
    finally { setSending(false); }
  }

  async function sendGift(code:string) {
    if (sending || !userId) return;
    setSending(true); setGiftPicker(false);
    const {error} = await supabase.from("messages").insert({friendship_id:friendshipId,sender_id:userId,message_type:"gift",gift_code:code});
    if (error) Alert.alert("Gift didn't send",error.message);
    else await loadMessages();
    setSending(false);
  }

  return <SafeAreaView style={s.safe}>
    <View style={s.header}>
      <Pressable style={s.backButton} onPress={()=>router.back()}><Ionicons name="chevron-back" size={25} color={c.text}/></Pressable>
      <View style={s.avatar}><Text style={s.avatarText}>{friendName.slice(0,1).toUpperCase()}</Text></View>
      <View style={{flex:1}}><Text style={s.headerName} numberOfLines={1}>{friendName}</Text><Text style={s.headerSub}>Your private study chat</Text></View>
      <Pressable style={s.headerAction} onPress={()=>Alert.alert("Chat safety","Only chat with people you know. You can remove this friend from the Friends screen.")}><Ionicons name="shield-checkmark-outline" size={20} color={c.accent}/></Pressable>
    </View>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined} keyboardVerticalOffset={Platform.OS==="ios"?8:0}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.messageList} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>scrollRef.current?.scrollToEnd({animated:true})}>
        <View style={s.chatNotice}><Ionicons name="lock-closed" size={14} color={c.accent}/><Text style={s.noticeText}>Chat is available only while you’re friends.</Text></View>
        {loading ? <ActivityIndicator color={c.accent} style={{marginTop:40}}/> : messages.length===0 ? <View style={s.empty}><Text style={s.emptyEmoji}>💬</Text><Text style={s.emptyTitle}>Say hey to {friendName.split(" ")[0]}!</Text><Text style={s.emptyText}>Share a question, send a note photo, or drop a little gift.</Text></View> : messages.map(message=>{
          const mine=message.sender_id===userId;
          const gift=message.gift_code?GIFTS[message.gift_code]:null;
          const replied=message.reply_to?messages.find(item=>item.id===message.reply_to):null;
          const reactionGroups=(message.reactions||[]).reduce((groups:Record<string,{count:number;mine:boolean}>,reaction)=>{groups[reaction.emoji]??={count:0,mine:false};groups[reaction.emoji].count++;if(reaction.user_id===userId)groups[reaction.emoji].mine=true;return groups;},{});
          return <View key={message.id} style={[s.messageRow,mine?s.mineRow:s.theirRow]}>
            <Pressable onLongPress={()=>openMessageActions(message,mine)} delayLongPress={350} style={[s.bubble,mine?s.mineBubble:s.theirBubble,message.message_type==="gift"&&s.giftBubble]}>
              {replied&&<View style={s.replyPreview}><Text style={[s.replyPreviewName,mine&&s.mineText]}>{replied.sender_id===userId?"You":friendName}</Text><Text numberOfLines={2} style={[s.replyPreviewText,mine&&s.mineText]}>{replied.deleted_at?"Message deleted":replied.body||(replied.message_type==="image"?"📷 Photo":"🎁 Gift")}</Text></View>}
              {message.message_type==="text"&&<Text style={[s.messageText,mine&&s.mineText]}>{message.deleted_at?"This message was deleted.":message.body}</Text>}
              {message.message_type==="image"&&(message.imageUrl?<Image source={{uri:message.imageUrl}} style={s.sentImage} resizeMode="cover"/>:<Text style={s.messageText}>Photo unavailable</Text>)}
              {message.message_type==="gift"&&gift&&<View style={s.giftContent}><Text style={s.giftEmoji}>{gift.emoji}</Text><Text style={[s.giftLabel,mine&&s.mineText]}>{gift.label}</Text></View>}
              <Text style={[s.time,mine&&s.mineTime]}>{new Date(message.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}{message.edited_at&&!message.deleted_at?" · Edited":""}{mine&&message.read_at?" · Seen":""}</Text>
            </Pressable>
            <View style={s.messageExtras}>
              <View style={s.reactionRow}>{Object.entries(reactionGroups).map(([emoji,value])=><Pressable key={emoji} style={[s.reactionChip,value.mine&&s.reactionMine]} onPress={()=>toggleReaction(message,emoji)}><Text style={s.reactionText}>{emoji} {value.count}</Text></Pressable>)}<Pressable style={s.quickReact} onPress={()=>toggleReaction(message,"👍")}><Text style={s.quickReactText}>＋</Text></Pressable></View>
              <Pressable style={s.replyButton} onPress={()=>{setReplyTo(message.id);setEditingMessageId(null);}}><Ionicons name="return-up-back-outline" size={13} color={c.subtle}/><Text style={s.replyButtonText}>Reply</Text></Pressable>
            </View>
          </View>;
        })}
      </ScrollView>
      {giftPicker&&<View style={s.giftTray}>{Object.entries(GIFTS).map(([code,gift])=><Pressable key={code} style={s.giftChoice} onPress={()=>sendGift(code)}><Text style={s.giftChoiceEmoji}>{gift.emoji}</Text><Text style={s.giftChoiceLabel}>{gift.label}</Text></Pressable>)}</View>}
      {(replyTo||editingMessageId)&&<View style={s.composerBanner}><View style={{flex:1}}><Text style={s.composerBannerTitle}>{editingMessageId?"Editing message":"Replying to message"}</Text><Text numberOfLines={1} style={s.composerBannerText}>{editingMessageId?messages.find(m=>m.id===editingMessageId)?.body:messages.find(m=>m.id===replyTo)?.body}</Text></View><Pressable onPress={()=>{setReplyTo(null);setEditingMessageId(null);setDraft("");}}><Ionicons name="close-circle" size={21} color={c.subtle}/></Pressable></View>}
      <View style={s.composerWrap}>
        <Pressable style={s.toolButton} onPress={sendImage} disabled={sending||!userId} accessibilityLabel="Send image"><Ionicons name="image-outline" size={21} color={c.accent}/></Pressable>
        <Pressable style={[s.toolButton,giftPicker&&s.toolButtonActive]} onPress={()=>setGiftPicker(v=>!v)} accessibilityLabel="Send a gift"><Ionicons name="gift-outline" size={21} color={c.accent}/></Pressable>
        <TextInput value={draft} onChangeText={setDraft} placeholder={editingMessageId ? "Edit message…" : "Message your study buddy…"} placeholderTextColor={c.subtle} multiline maxLength={2000} style={s.input} returnKeyType="default"/>
        <Pressable style={[s.sendButton,(!draft.trim()||sending)&&{opacity:0.55}]} onPress={sendText} disabled={!draft.trim()||sending||!userId} accessibilityLabel="Send message">{sending?<ActivityIndicator size="small" color={c.onAccent}/>:<Ionicons name="arrow-up" size={21} color={c.onAccent}/>}</Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles=(c:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:c.bg},header:{flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.surface},backButton:{width:35,height:40,alignItems:"center",justifyContent:"center"},avatar:{width:42,height:42,borderRadius:15,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center"},avatarText:{fontSize:17,fontWeight:"900",color:c.accent},headerName:{fontSize:15,fontWeight:"900",color:c.text},headerSub:{fontSize:11,color:c.muted,marginTop:3},headerAction:{width:38,height:38,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:c.accentSoft},messageList:{padding:16,paddingBottom:24,flexGrow:1},chatNotice:{alignSelf:"center",flexDirection:"row",gap:6,alignItems:"center",paddingHorizontal:12,paddingVertical:8,borderRadius:20,backgroundColor:c.accentSoft,marginBottom:18},noticeText:{fontSize:10,color:c.muted,fontWeight:"700"},empty:{alignItems:"center",paddingHorizontal:28,paddingVertical:50},emptyEmoji:{fontSize:42,marginBottom:13},emptyTitle:{fontSize:18,fontWeight:"900",color:c.text,textAlign:"center"},emptyText:{fontSize:12,lineHeight:18,color:c.muted,textAlign:"center",marginTop:7},messageRow:{flexDirection:"row",marginBottom:10},mineRow:{justifyContent:"flex-end"},theirRow:{justifyContent:"flex-start"},bubble:{maxWidth:"84%",minWidth:70,paddingHorizontal:13,paddingTop:10,paddingBottom:7,borderRadius:18,borderWidth:1,borderColor:c.border},mineBubble:{backgroundColor:c.accent,borderColor:c.accent,borderBottomRightRadius:5},theirBubble:{backgroundColor:c.surface,borderBottomLeftRadius:5},messageText:{fontSize:14,lineHeight:20,color:c.text},mineText:{color:c.onAccent},time:{fontSize:9,color:c.subtle,textAlign:"right",marginTop:5},replyPreview:{borderLeftWidth:3,borderLeftColor:c.accent,paddingLeft:8,marginBottom:8,opacity:.86},replyPreviewName:{fontSize:10,fontWeight:"900",color:c.accent},replyPreviewText:{fontSize:10,color:c.text,marginTop:2},messageExtras:{maxWidth:"84%",marginTop:4},reactionRow:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:5},reactionChip:{paddingHorizontal:8,paddingVertical:4,borderRadius:12,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},reactionMine:{borderColor:c.accent,backgroundColor:c.accentSoft},reactionText:{fontSize:11,color:c.text},quickReact:{width:24,height:23,borderRadius:11,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center"},quickReactText:{fontSize:13,color:c.subtle},replyButton:{flexDirection:"row",alignItems:"center",gap:4,alignSelf:"flex-start",paddingVertical:5,paddingHorizontal:3},replyButtonText:{fontSize:10,color:c.subtle,fontWeight:"700"},composerBanner:{flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14,paddingVertical:9,borderTopWidth:1,borderTopColor:c.border,backgroundColor:c.accentSoft},composerBannerTitle:{fontSize:10,fontWeight:"900",color:c.accent},composerBannerText:{fontSize:11,color:c.muted,marginTop:2},mineTime:{color:c.onAccent,opacity:0.75},sentImage:{width:220,height:230,borderRadius:12,backgroundColor:c.input},giftBubble:{padding:14},giftContent:{alignItems:"center",minWidth:115,paddingVertical:4},giftEmoji:{fontSize:42},giftLabel:{fontSize:12,fontWeight:"900",color:c.text,marginTop:5},giftTray:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-around",gap:8,paddingHorizontal:12,paddingVertical:10,borderTopWidth:1,borderTopColor:c.border,backgroundColor:c.surface},giftChoice:{width:"29%",minHeight:78,borderRadius:14,alignItems:"center",justifyContent:"center",padding:7,backgroundColor:c.input},giftChoiceEmoji:{fontSize:25},giftChoiceLabel:{fontSize:9,fontWeight:"800",color:c.text,marginTop:4,textAlign:"center"},composerWrap:{flexDirection:"row",alignItems:"flex-end",gap:7,paddingHorizontal:10,paddingVertical:10,borderTopWidth:1,borderTopColor:c.border,backgroundColor:c.surface},toolButton:{width:39,height:42,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:c.accentSoft},toolButtonActive:{backgroundColor:c.border},input:{flex:1,maxHeight:120,minHeight:42,paddingHorizontal:13,paddingVertical:10,borderRadius:16,borderWidth:1,borderColor:c.border,backgroundColor:c.input,color:c.text,fontSize:13},sendButton:{width:42,height:42,borderRadius:15,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"}
});
