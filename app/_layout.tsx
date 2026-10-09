import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../lib/theme";

function AppStack() {
  const { mode, colors } = useTheme();
  return <>
    <StatusBar style={mode === "dark" ? "light" : "dark"} />
    <Stack screenOptions={{
      headerShown:false,
      animation:"fade",
      contentStyle:{backgroundColor:colors.bg},
    }} />
  </>;
}

export default function Layout() {
  return <ThemeProvider><AppStack /></ThemeProvider>;
}
