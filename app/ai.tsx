import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { LocalizedText as Text } from "../components/LocalizedText";
import { loadStudyData, saveStudyData } from "../lib/cloud-study-data";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeColors } from "../lib/theme";
import { useLanguage } from "../lib/language";

type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: number };
type Chat = { id: string; title: string; createdAt: number; updatedAt: number; messages: Message[] };
const makeChat = (): Chat => ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [] });
const titleFor = (value: string) => value.trim().replace(/\\s+/g, " ").slice(0, 42) || "New chat";

export default function SnapStudyAI() {
  const { colors: c } = useTheme();
  const { language } = useLanguage();
  const { width } = useWindowDimensions();
  const sv = language === "sv";
  const wide = width >= 820;
  const s = styles(c);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState<any>({ language });
  const scroll = useRef<ScrollView>(null);
  const active = chats.find(chat => chat.id === activeId);
  const messages = active?.messages || [];

  const persist = useCallback(async (next: Chat[]) => {
    setChats(next);
    await saveStudyData("snapstudy-ai-chats", next);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [saved, legacy, sessions, weak, user] = await Promise.all([
        loadStudyData<Chat[]>("snapstudy-ai-chats", []),
        loadStudyData<Message[]>("snapstudy-ai-chat", []),
        loadStudyData<any[]>("sessions", []),
        loadStudyData<any[]>("weakTopics", []),
        supabase.auth.getUser()
      ]);
      let list = Array.isArray(saved) ? saved : [];
      if (!list.length && Array.isArray(legacy) && legacy.length) {
        list = [{ id: "legacy-chat", title: titleFor(legacy.find(m => m.role === "user")?.content || "Previous chat"), createdAt: legacy[0]?.createdAt || Date.now(), updatedAt: legacy[legacy.length - 1]?.createdAt || Date.now(), messages: legacy }];
        await saveStudyData("snapstudy-ai-chats", list);
      }
      if (!alive) return;
      setChats(list);
      setActiveId(list[0]?.id || "");
      setContext({
        displayName: user.data.user?.user_metadata?.display_name || user.data.user?.user_metadata?.full_name || "student",
        recentSessions: Array.isArray(sessions) ? sessions.slice(-8).map(x => ({ topic: x.topic, summary: x.summary })) : [],
        weakTopics: Array.isArray(weak) ? weak.filter(x => !x.mastered).slice(0, 30) : [],
        language
      });
    })().catch(() => {});
    return () => { alive = false; };
  }, [language]);

  const createChat = () => {
    const chat = makeChat();
    const next = [chat, ...chats];
    setChats(next);
    saveStudyData("snapstudy-ai-chats", next).catch(() => {});
    setActiveId(chat.id);
    setInput("");
    setSidebarOpen(false);
  };
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...chats].sort((a, b) => b.updatedAt - a.updatedAt).filter(chat => !q || chat.title.toLowerCase().includes(q) || chat.messages.some(m => m.content.toLowerCase().includes(q)));
  }, [chats, search]);

  const send = async (raw = input) => {
    const value = raw.trim();
    if (!value || busy) return;
    setInput("");
    let target = active;
    if (!target) {
      target = makeChat();
      setActiveId(target.id);
    }
    const userMessage: Message = { id: Date.now() + "-u", role: "user", content: value, createdAt: Date.now() };
    const updated: Chat = { ...target, title: target.messages.length ? target.title : titleFor(value), updatedAt: Date.now(), messages: [...target.messages, userMessage].slice(-80) };
    const first = [updated, ...chats.filter(x => x.id !== target!.id)];
    await persist(first);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("study-chat", {
        body: { messages: updated.messages.slice(-16).map(m => ({ role: m.role, content: m.content })), context }
      });
      if (error) throw error;
      const answer = typeof data?.message === "string" ? data.message.trim() : "";
      if (!answer) throw new Error(data?.error || "No response came back.");
      const completed = { ...updated, updatedAt: Date.now(), messages: [...updated.messages, { id: Date.now() + "-a", role: "assistant" as const, content: answer, createdAt: Date.now() }].slice(-80) };
      await persist([completed, ...first.filter(x => x.id !== target!.id)]);
    } catch (err: any) {
      const message = err?.message || "SnapStudy AI couldn't connect. Try again.";
      const failed = { ...updated, messages: [...updated.messages, { id: Date.now() + "-e", role: "assistant" as const, content: (sv ? "Jag kunde inte få svar: " : "I couldn't get a reply: ") + message, createdAt: Date.now() }] };
      await persist([failed, ...first.filter(x => x.id !== target!.id)]);
    } finally {
      setBusy(false);
    }
  };

  const sidebar = <View style={s.sidebar}>
    <View style={s.sidebarHeader}>
      <View style={s.brandIcon}><Ionicons name="sparkles" size={17} color={c.onAccent}/></View>
      <Text style={s.brand}>SnapStudy AI</Text>
      {!wide ? <Pressable onPress={() => setSidebarOpen(false)} style={s.iconButton}><Ionicons name="close" size={20} color={c.muted}/></Pressable> : null}
    </View>
    <Pressable onPress={createChat} style={s.newChat}><Ionicons name="add" size={19} color={c.text}/><Text style={s.newChatLabel}>{sv ? "Ny chatt" : "New chat"}</Text></Pressable>
    <View style={s.search}><Ionicons name="search" size={16} color={c.subtle}/><TextInput value={search} onChangeText={setSearch} placeholder={sv ? "Sök chattar" : "Search chats"} placeholderTextColor={c.subtle} style={s.searchInput}/></View>
    <ScrollView style={s.history} keyboardShouldPersistTaps="handled">
      {filtered.map(chat => <View key={chat.id} style={[s.historyRow, chat.id === activeId && s.selectedRow]}>
        <Pressable style={s.historyTap} onPress={() => { setActiveId(chat.id); setSidebarOpen(false); }}>
          <Text numberOfLines={1} style={s.historyTitle}>{chat.title}</Text>
        </Pressable>
        <Pressable style={s.deleteChat} onPress={() => { const next = chats.filter(x => x.id !== chat.id); persist(next).catch(() => {}); if (activeId === chat.id) setActiveId(next[0]?.id || ""); }}>
          <Ionicons name="trash-outline" size={15} color={c.subtle}/>
        </Pressable>
      </View>)}
      {!filtered.length ? <Text style={s.noChats}>{sv ? "Inga chattar ännu" : "No chats yet"}</Text> : null}
    </ScrollView>
    <View style={s.sideBottom}>
      <Pressable onPress={() => router.push("/history")} style={s.sideLink}><Ionicons name="book-outline" size={17} color={c.muted}/><Text style={s.sideLinkText}>{sv ? "Studiehistorik" : "Study history"}</Text></Pressable>
      <Pressable onPress={() => router.push("/account")} style={s.sideLink}><Ionicons name="settings-outline" size={17} color={c.muted}/><Text style={s.sideLinkText}>{sv ? "Inställningar" : "Settings"}</Text></Pressable>
    </View>
  </View>;

  return <SafeAreaView style={s.safe}><View style={s.app}>
    {wide ? <View style={s.desktopSidebar}>{sidebar}</View> : null}
    <View style={s.main}>
      <View style={s.topbar}>
        {!wide ? <Pressable onPress={() => setSidebarOpen(true)} style={s.iconButton}><Ionicons name="menu" size={21} color={c.text}/></Pressable> : null}
        <Text style={s.topTitle}>SnapStudy AI</Text>
        <View style={{ flex: 1 }}/>
        <Pressable onPress={createChat} style={s.iconButton}><Ionicons name="create-outline" size={21} color={c.text}/></Pressable>
      </View>
      <KeyboardAvoidingView style={s.chatArea} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scroll} style={s.chatScroll} contentContainerStyle={[s.chatContent, !messages.length && s.emptyContent]} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
          {!messages.length ? <View style={s.welcome}>
            <View style={s.welcomeIcon}><Ionicons name="sparkles" size={25} color={c.accent}/></View>
            <Text style={s.welcomeTitle}>{sv ? "Vad ska vi plugga idag?" : "What are we studying today?"}</Text>
            <Text style={s.welcomeSub}>{sv ? "Din AI-läxhjälpare kan hjälpa dig med dina sparade studier." : "Your AI study partner can help with your saved study material."}</Text>
            {(sv ? ["Förklara mina svåra ämnen", "Förhör mig på senaste studiepaketet", "Hjälp mig plugga till provet"] : ["Explain my weak topics", "Quiz me on my latest study set", "Help me prepare for my exam"]).map(prompt => <Pressable key={prompt} onPress={() => send(prompt)} style={s.prompt}><Text style={s.promptText}>{prompt}</Text><Ionicons name="arrow-up-right" size={16} color={c.accent}/></Pressable>)}
          </View> : messages.map(message => <View key={message.id} style={[s.message, message.role === "user" && s.userMessage]}>
            <View style={[s.avatar, message.role === "user" && s.userAvatar]}><Ionicons name={message.role === "user" ? "person" : "sparkles"} size={15} color={message.role === "user" ? c.onAccent : c.accent}/></View>
            <View style={s.messageBody}><Text style={s.role}>{message.role === "user" ? (sv ? "Du" : "You") : "SnapStudy AI"}</Text><Text selectable style={s.messageText}>{message.content}</Text></View>
          </View>)}
          {busy ? <View style={s.thinking}><ActivityIndicator color={c.accent}/><Text style={s.thinkingText}>{sv ? "SnapStudy AI skriver…" : "SnapStudy AI is thinking…"}</Text></View> : null}
        </ScrollView>
        <View style={s.composerWrap}>
          <View style={s.composer}><TextInput value={input} onChangeText={setInput} multiline maxLength={4000} placeholder={sv ? "Fråga SnapStudy AI" : "Message SnapStudy AI"} placeholderTextColor={c.subtle} style={s.input} onSubmitEditing={() => send()}/><View style={s.composerBottom}><Pressable onPress={() => router.push("/study-hub")} style={s.contextButton}><Ionicons name="add-circle-outline" size={19} color={c.muted}/><Text style={s.contextLabel}>{sv ? "Studiepaket" : "Study context"}</Text></Pressable><View style={{ flex: 1 }}/><Pressable disabled={!input.trim() || busy} onPress={() => send()} style={[s.send, (!input.trim() || busy) && s.disabled]}><Ionicons name="arrow-up" size={19} color={c.onAccent}/></Pressable></View></View>
          <Text style={s.disclaimer}>{sv ? "AI kan göra misstag. Kontrollera viktiga svar." : "SnapStudy AI can make mistakes. Check important answers."}</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
    {!wide && sidebarOpen ? <View style={s.overlay}><Pressable onPress={() => setSidebarOpen(false)} style={s.scrim}/><View style={s.drawer}>{sidebar}</View></View> : null}
  </View></SafeAreaView>;
}

const styles = (c: ThemeColors) => StyleSheet.create({
  safe:{flex:1,backgroundColor:c.bg}, app:{flex:1,flexDirection:"row",backgroundColor:c.bg}, desktopSidebar:{width:265,borderRightWidth:1,borderRightColor:c.border}, sidebar:{flex:1,backgroundColor:c.surface,padding:12}, sidebarHeader:{flexDirection:"row",alignItems:"center",gap:9,padding:5,marginBottom:14}, brandIcon:{width:31,height:31,borderRadius:10,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"}, brand:{flex:1,color:c.text,fontSize:14,fontWeight:"900"}, newChat:{height:42,borderRadius:12,borderWidth:1,borderColor:c.border,flexDirection:"row",alignItems:"center",gap:9,paddingHorizontal:12,marginBottom:11}, newChatLabel:{color:c.text,fontSize:12,fontWeight:"800"}, search:{height:38,borderRadius:10,backgroundColor:c.input,flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:10,marginBottom:12}, searchInput:{flex:1,color:c.text,fontSize:12,padding:0}, history:{flex:1}, historyRow:{minHeight:37,borderRadius:9,flexDirection:"row",alignItems:"center",paddingLeft:9,paddingRight:3}, selectedRow:{backgroundColor:c.accentSoft}, historyTap:{flex:1,paddingVertical:9}, historyTitle:{color:c.muted,fontSize:11,fontWeight:"700"}, deleteChat:{width:28,height:30,alignItems:"center",justifyContent:"center"}, noChats:{color:c.subtle,fontSize:11,padding:8}, sideBottom:{borderTopWidth:1,borderTopColor:c.border,paddingTop:8}, sideLink:{flexDirection:"row",alignItems:"center",gap:9,padding:10}, sideLinkText:{color:c.muted,fontSize:11,fontWeight:"700"},
  main:{flex:1,minWidth:0}, topbar:{height:56,flexDirection:"row",alignItems:"center",paddingHorizontal:15,gap:9,borderBottomWidth:1,borderBottomColor:c.border}, iconButton:{width:36,height:36,borderRadius:10,alignItems:"center",justifyContent:"center"}, topTitle:{color:c.text,fontSize:14,fontWeight:"900"}, chatArea:{flex:1}, chatScroll:{flex:1}, chatContent:{width:"100%",maxWidth:820,alignSelf:"center",paddingHorizontal:wide?28:16,paddingTop:25,paddingBottom:24,gap:25}, emptyContent:{flexGrow:1,justifyContent:"center",paddingBottom:45}, welcome:{width:"100%",maxWidth:620,alignSelf:"center",alignItems:"center"}, welcomeIcon:{width:54,height:54,borderRadius:18,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:17}, welcomeTitle:{color:c.text,fontSize:wide?27:22,fontWeight:"900",textAlign:"center"}, welcomeSub:{color:c.muted,fontSize:13,lineHeight:20,textAlign:"center",marginTop:9,marginBottom:20}, prompt:{width:"100%",minHeight:52,borderRadius:13,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,paddingHorizontal:14,paddingVertical:12,flexDirection:"row",alignItems:"center",gap:10,marginTop:8},promptText:{color:c.text,fontSize:12,fontWeight:"700",flex:1},
  message:{flexDirection:"row",alignItems:"flex-start",gap:12,width:"100%"},userMessage:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:15,padding:13},avatar:{width:30,height:30,borderRadius:10,backgroundColor:c.accentSoft,alignItems:"center",justifyContent:"center",flexShrink:0},userAvatar:{backgroundColor:c.accent},messageBody:{flex:1,minWidth:0},role:{color:c.text,fontSize:12,fontWeight:"900",marginBottom:7},messageText:{color:c.text,fontSize:14,lineHeight:23},thinking:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:8},thinkingText:{color:c.muted,fontSize:12},
  composerWrap:{width:"100%",maxWidth:820,alignSelf:"center",paddingHorizontal:wide?28:15,paddingTop:10,paddingBottom:2},composer:{borderWidth:1,borderColor:c.border,borderRadius:21,backgroundColor:c.surface,padding:10},input:{color:c.text,fontSize:14,lineHeight:21,minHeight:38,maxHeight:140,paddingHorizontal:8,paddingTop:7,paddingBottom:6},composerBottom:{flexDirection:"row",alignItems:"center",gap:8,paddingTop:4},contextButton:{flexDirection:"row",alignItems:"center",gap:5,padding:5},contextLabel:{color:c.muted,fontSize:10,fontWeight:"700"},send:{width:36,height:36,borderRadius:12,backgroundColor:c.accent,alignItems:"center",justifyContent:"center"},disabled:{opacity:0.4},disclaimer:{color:c.subtle,fontSize:9,textAlign:"center",paddingVertical:8},
  overlay:{position:"absolute",left:0,right:0,top:0,bottom:0,flexDirection:"row"},scrim:{position:"absolute",left:0,right:0,top:0,bottom:0,backgroundColor:"rgba(0,0,0,0.45)"},drawer:{width:Math.min(300,width*0.86),height:"100%",backgroundColor:c.surface}
});