import {Modal,Pressable,StyleSheet,View} from "react-native";
import {LocalizedText as Text} from "./LocalizedText";
import {useTheme,type ThemeColors} from "../lib/theme";
type Props={visible:boolean;title:string;message:string;confirmLabel?:string;cancelLabel?:string;destructive?:boolean;busy?:boolean;onCancel:()=>void;onConfirm:()=>void};
export default function ConfirmActionModal({visible,title,message,confirmLabel="Confirm",cancelLabel="Cancel",destructive=true,busy=false,onCancel,onConfirm}:Props){
 const {colors:c}=useTheme();const s=styles(c,destructive);
 return <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
  <View style={s.backdrop}><View accessibilityRole="alert" accessibilityViewIsModal style={s.card}>
   <View style={s.icon}><Text style={s.iconText}>{destructive?"!":"?"}</Text></View>
   <Text style={s.title}>{title}</Text><Text style={s.message}>{message}</Text>
   <View style={s.actions}><Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={s.cancel}><Text style={s.cancelText}>{cancelLabel}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={onConfirm} style={[s.confirm,busy&&{opacity:.6}]}><Text style={s.confirmText}>{busy?"…":confirmLabel}</Text></Pressable></View>
  </View></View>
 </Modal>;
}
const styles=(c:ThemeColors,d:boolean)=>StyleSheet.create({backdrop:{flex:1,backgroundColor:"rgba(7,10,18,0.68)",alignItems:"center",justifyContent:"center",padding:22},card:{width:"100%",maxWidth:420,borderRadius:24,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,padding:22,shadowColor:"#000",shadowOpacity:.24,shadowRadius:28,shadowOffset:{width:0,height:12},elevation:12},icon:{width:46,height:46,borderRadius:16,backgroundColor:d?c.danger+"18":c.accentSoft,alignItems:"center",justifyContent:"center",marginBottom:15,borderWidth:1,borderColor:d?c.dangerBorder:c.border},iconText:{fontSize:24,fontWeight:"900",color:d?c.danger:c.accent},title:{fontSize:19,fontWeight:"900",color:c.text},message:{fontSize:13,lineHeight:20,color:c.muted,marginTop:8},actions:{flexDirection:"row",gap:10,marginTop:22},cancel:{flex:1,minHeight:46,borderRadius:13,borderWidth:1,borderColor:c.border,alignItems:"center",justifyContent:"center",backgroundColor:c.input},cancelText:{fontSize:12,fontWeight:"800",color:c.text},confirm:{flex:1,minHeight:46,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:d?c.danger:c.accent},confirmText:{fontSize:12,fontWeight:"900",color:"#FFFFFF"}});
