import { ScrollView, StyleSheet, Text, View, type TextStyle, type StyleProp } from "react-native";
import { useTheme } from "../lib/theme";

type Props = { children: string; style?: StyleProp<TextStyle>; testID?: string };
type Part = { text: string; kind: "plain" | "bold" | "italic" | "code" | "strike" };

function unescapeMarkdown(value: string) {
  return value.replace(/\\([\\*_\x60{}[\]()#+.!|>~-])/g, "$1").replace(/\\n/g, "\n");
}
function inlineParts(value: string): Part[] {
  const text = unescapeMarkdown(value);
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|\x60[^\x60]+\x60)/g;
  const result: Part[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) result.push({ text: text.slice(last, index), kind: "plain" });
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) result.push({ text: token.slice(2, -2), kind: "bold" });
    else if (token.startsWith("~~")) result.push({ text: token.slice(2, -2), kind: "strike" });
    else if (token.startsWith("\x60")) result.push({ text: token.slice(1, -1), kind: "code" });
    else result.push({ text: token.slice(1, -1), kind: "italic" });
    last = index + token.length;
  }
  if (last < text.length) result.push({ text: text.slice(last), kind: "plain" });
  return result;
}
function isTableRow(line: string) {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}
function cells(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map(x => unescapeMarkdown(x.trim()).replace(/\\\|/g, "|"));
}
function isDivider(line: string) {
  return isTableRow(line) && cells(line).every(x => /^:?-{3,}:?$/.test(x.replace(/\s/g, "")));
}

export default function MarkdownText({ children, style, testID }: Props) {
  const { colors: c } = useTheme();
  const lines = String(children ?? "").replace(/\r/g, "").split("\n");
  const blocks: { type: "line" | "table" | "code"; line?: string; rows?: string[][]; code?: string }[] = [];
  for (let i = 0; i < lines.length;) {
    if (lines[i].trim().startsWith("\x60\x60\x60")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("\x60\x60\x60")) code.push(lines[i++]);
      if (i < lines.length) i++;
      blocks.push({ type: "code", code: code.join("\n") });
      continue;
    }
    if (i + 1 < lines.length && isTableRow(lines[i]) && isDivider(lines[i + 1])) {
      const rows = [cells(lines[i])];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      blocks.push({ type: "table", rows });
      continue;
    }
    blocks.push({ type: "line", line: lines[i++] });
  }
  const renderInline = (value: string, key: string) => inlineParts(value).map((part, i) => <Text key={key + i} style={[
    part.kind === "bold" ? s.bold : null,
    part.kind === "italic" ? s.italic : null,
    part.kind === "strike" ? s.strike : null,
    part.kind === "code" ? [s.inlineCode, { color: c.accent, backgroundColor: c.input }] : null,
  ]}>{part.text}</Text>);

  return <View testID={testID} style={s.root}>
    {blocks.map((block, index) => {
      if (block.type === "code") return <ScrollView key={index} horizontal style={[s.codeBlock, { backgroundColor: c.input, borderColor: c.border }]}><Text selectable style={[s.codeText, { color: c.text }]}>{block.code}</Text></ScrollView>;
      if (block.type === "table") {
        const rows = block.rows || [];
        const count = Math.max(1, ...rows.map(row => row.length));
        return <ScrollView key={index} horizontal style={s.tableScroll} showsHorizontalScrollIndicator>
          <View style={[s.table, { borderColor: c.border }]}>
            {rows.map((row, ri) => <View key={ri} style={[s.tableRow, { backgroundColor: ri === 0 ? c.accentSoft : c.surface, borderBottomColor: c.border }]}>
              {Array.from({ length: count }, (_, ci) => <View key={ci} style={[s.tableCell, { width: Math.max(112, 320 / count), borderRightColor: c.border }]}>
                <Text style={[s.tableText, { color: c.text }, ri === 0 ? s.tableHeader : null]}>{renderInline(row[ci] || "", index + "-" + ri + "-" + ci)}</Text>
              </View>)}
            </View>)}
          </View>
        </ScrollView>;
      }
      const raw = block.line || "";
      const line = unescapeMarkdown(raw).trim();
      if (!line) return <View key={index} style={s.blankLine} />;
      if (/^\s*([-*_])\1{2,}\s*$/.test(raw)) return <View key={index} style={[s.rule, { backgroundColor: c.border }]} />;
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
      const numbered = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
      const quote = line.match(/^>\s?(.*)$/);
      const content = heading?.[2] || bullet?.[1] || numbered?.[2] || quote?.[1] || line;
      return <View key={index} style={quote ? [s.quote, { borderLeftColor: c.accent }] : bullet || numbered ? s.listRow : undefined}>
        <Text selectable style={[s.text, { color: c.text }, style,
          heading ? [s.heading, heading[1].length === 1 ? s.h1 : heading[1].length === 2 ? s.h2 : s.h3] : null,
          bullet || numbered ? s.listText : null,
          quote ? { color: c.muted, fontStyle: "italic" } : null,
        ]}>{bullet ? "• " : numbered ? numbered[1] + ". " : ""}{renderInline(content, "line-" + index)}</Text>
      </View>;
    })}
  </View>;
}
const s = StyleSheet.create({
  root: { gap: 5, minWidth: 0 },
  text: { fontSize: 14, lineHeight: 22, fontWeight: "400", flexShrink: 1 },
  heading: { fontWeight: "900", marginTop: 9, marginBottom: 2 },
  h1: { fontSize: 21, lineHeight: 29 }, h2: { fontSize: 18, lineHeight: 25 }, h3: { fontSize: 15, lineHeight: 22 },
  bold: { fontWeight: "900" }, italic: { fontStyle: "italic" }, strike: { textDecorationLine: "line-through" },
  inlineCode: { fontFamily: "monospace", fontSize: 12, paddingHorizontal: 3 },
  listRow: { paddingLeft: 3 }, listText: { lineHeight: 23 },
  quote: { borderLeftWidth: 3, paddingLeft: 10, marginVertical: 3 },
  blankLine: { height: 7 }, rule: { height: 1, marginVertical: 8 },
  tableScroll: { maxWidth: "100%", marginVertical: 6 }, table: { borderWidth: 1, borderRadius: 9, overflow: "hidden" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1 }, tableCell: { paddingHorizontal: 9, paddingVertical: 9, borderRightWidth: 1, justifyContent: "center" },
  tableText: { fontSize: 11, lineHeight: 16 }, tableHeader: { fontWeight: "900" },
  codeBlock: { maxWidth: "100%", borderWidth: 1, borderRadius: 10, padding: 12, marginVertical: 5 },
  codeText: { fontFamily: "monospace", fontSize: 12, lineHeight: 19 },
});
