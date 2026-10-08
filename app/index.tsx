import { useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { imageToBase64 } from "../lib/image";

export default function Home(){
  const [busy,setBusy]=useState(false);

  async function scanNotes(){
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){
      Alert.alert("Photos permission needed","Allow photo access so SnapStudy can read your notes.");
      return;
    }
    const result=await ImagePicker.launchImageLibraryAsync({
      mediaTypes:["images"], quality:0.9, allowsEditing:true
    });
    if(result.canceled) return;

    try{
      setBusy(true);
      const image=await imageToBase64(result.assets[0].uri);
      router.push({pathname:"/study",params:{image}});
    }catch(error){
      Alert.alert("Couldn't read the photo","Try another image.");
    }finally{
      setBusy(false);
    }
  }

  return <SafeAreaView style={s.safe}>
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>SNAPSTUDY</Text>
          <Text style={s.title}>Study smarter.</Text>
          <Text style={s.sub}>Turn a photo of your notes into a study session.</Text>
        </View>
        <View style={s.logo}><Text style={s.logoText}>S</Text></View>
      </View>
      <View style={s.hero}>
        <View style={s.camera}><Text style={s.cameraText}>✦</Text></View>
        <Text style={s.heroTitle}>Scan your notes</Text>
        <Text style={s.heroSub}>Snap a page. SnapStudy will turn it into flashcards, quizzes, practice tests and a summary.</Text>
        <Pressable style={({pressed})=>[s.button,pressed&&s.pressed]} onPress={scanNotes} disabled={busy}>
          <Text style={s.buttonText}>{busy ? "Preparing..." : "📸  Scan notes"}</Text>
        </Pressable>
      </View>
      <Text style={s.section}>What you can make</Text>
      <View style={s.grid}>
        {[["◉","Flashcards","Memorize key facts"],["✓","Quiz","Test yourself"],["▣","Practice test","Simulate the exam"],["≡","Summary","Get the important stuff"]].map(([icon,name,desc])=>
          <View style={s.card} key={name}><Text style={s.icon}>{icon}</Text><Text style={s.cardTitle}>{name}</Text><Text style={s.cardDesc}>{desc}</Text></View>
        )}
      </View>
    </View>
  </SafeAreaView>
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#08090b"},container:{flex:1,padding:22,paddingTop:30},
 header:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:34},
 eyebrow:{color:"#8d93a1",fontSize:12,fontWeight:"800",letterSpacing:2},title:{color:"#f5f7fa",fontSize:36,fontWeight:"800",letterSpacing:-1.5,marginTop:6},
 sub:{color:"#9298a5",fontSize:14,lineHeight:21,marginTop:8,maxWidth:310},logo:{width:44,height:44,borderRadius:14,backgroundColor:"#f4f6f8",alignItems:"center",justifyContent:"center"},
 logoText:{fontSize:20,fontWeight:"900",color:"#090a0c"},hero:{backgroundColor:"#111318",borderWidth:1,borderColor:"#242831",borderRadius:24,padding:22,marginBottom:28},
 camera:{width:54,height:54,borderRadius:16,backgroundColor:"#1b1e25",alignItems:"center",justifyContent:"center",marginBottom:18},cameraText:{fontSize:25,color:"#f5f7fa"},
 heroTitle:{color:"#f5f7fa",fontSize:23,fontWeight:"800"},heroSub:{color:"#9096a3",fontSize:14,lineHeight:21,marginTop:7,marginBottom:20},
 button:{height:50,borderRadius:14,backgroundColor:"#f4f6f8",alignItems:"center",justifyContent:"center"},pressed:{opacity:.75,transform:[{scale:.98}]},
 buttonText:{color:"#090a0c",fontSize:15,fontWeight:"800"},section:{color:"#f0f2f5",fontSize:16,fontWeight:"800",marginBottom:12},
 grid:{flexDirection:"row",flexWrap:"wrap",gap:10},card:{width:"48%",minHeight:128,backgroundColor:"#111318",borderWidth:1,borderColor:"#242831",borderRadius:18,padding:15},
 icon:{color:"#f4f6f8",fontSize:20,marginBottom:15},cardTitle:{color:"#f4f6f8",fontSize:14,fontWeight:"800"},cardDesc:{color:"#777e8c",fontSize:12,lineHeight:17,marginTop:5}
});