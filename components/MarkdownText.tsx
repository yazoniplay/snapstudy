import { Fragment } from "react";
import { StyleSheet, Text, type TextStyle, type StyleProp } from "react-native";
import { useTheme } from "../lib/theme";

type Props = { children: string; style?: StyleProp<TextStyle>; testID?: string };
function inlineParts(text: string) {
  const token = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\x60[^\x60]+\x60)/g;
  const parts: { text: string; kind: "plain"|"bold"|"italic"|"code" }[] = [];
  let last = 0;
  for (const match of text.matchAll(token)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last,index), kind:"plain" });
    const value = match[0];
    if (value.startsWith("**") || value.startsWith("__")) parts.push({text:value.slice(2,-2),kind:"bold"});
    else if (value.startsWith("`")) parts.push({text:value.slice(1,-1),kind:"code"});
    else parts.push({text:value.slice(1,-1),kind:"italic"});
    last = index + value.length;
  }
  if (last < text.length) parts.push({text:text.slice(last),kind:"plain"});
  return parts;
}
export default function MarkdownText({ children, style, testID }: Props) {
  const { colors:c } = useTheme();
  const lines = String(children ?? "").replace(/\r/g,"").split("\n");
  return <Text testID={testID} style={[s.base,{color:c.text},style]}>
    {lines.map((raw,index)=>{
      const line=raw.trim();
      if(!line) return <Fragment key={index}>{"\n"}</Fragment>;
      const heading=line.match(/^(#{1,4})\s+(.+)$/);
      const bullet=line.match(/^\s*[-*+]\s+(.+)$/);
      const numbered=line.match(/^\s*\d+[.)]\s+(.+)$/);
      const text=heading?heading[2]:bullet?bullet[1]:numbered?numbered[1]:line;
      const kind=heading?"heading":bullet?"bullet":numbered?"numbered":"plain";
      return <Fragment key={index}>{index>0?"\n":""}{bullet?"• ":numbered?(line.match(/^\s*\d+/)?.[0]||"")+"  ":""}<Text style={kind==="heading"?[s.heading,{color:c.text},heading?.[1].length===1?s.h1:heading?.[1].length===2?s.h2:s.h3]:kind==="bullet"||kind==="numbered"?s.listItem:undefined}>{inlineParts(text).map((part,i)=><Text key={i} style={part.kind==="bold"?s.bold:part.kind==="italic"?s.italic:part.kind==="code"?[s.code,{color:c.accent}]:undefined}>{part.text}</Text>)}</Text></Fragment>;
    })}
  </Text>;
}
const s=StyleSheet.create({
 base:{fontSize:14,lineHeight:22,fontWeight:"400"},
 heading:{fontWeight:"900",marginTop:8,marginBottom:3},
 h1:{fontSize:20,lineHeight:28},h2:{fontSize:17,lineHeight:24},h3:{fontSize:15,lineHeight:22},
 bold:{fontWeight:"900"},italic:{fontStyle:"italic"},code:{fontFamily:"monospace",fontSize:13},
 listItem:{fontSize:14,lineHeight:22}
});