import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "dark" | "light";
export type ThemeColors = {
  bg: string; surface: string; surfaceAlt: string; border: string; text: string;
  muted: string; subtle: string; accent: string; accentSoft: string; input: string;
  onAccent: string; danger: string; dangerBorder: string;
};

const palettes: Record<ThemeMode, ThemeColors> = {
  dark: {
    bg:"#070A12", surface:"#0F1320", surfaceAlt:"#101522", border:"#242A3A",
    text:"#F7F5FF", muted:"#9691A4", subtle:"#777286", accent:"#8B5CF6",
    accentSoft:"#1B1730", input:"#0B0E17", onAccent:"#FFFFFF",
    danger:"#E2A7B4", dangerBorder:"#3A2D3A",
  },
  light: {
    bg:"#F5F6FB", surface:"#FFFFFF", surfaceAlt:"#FFFFFF", border:"#E1E4EE",
    text:"#191827", muted:"#656579", subtle:"#85859A", accent:"#7651E8",
    accentSoft:"#EEE9FF", input:"#F8F8FC", onAccent:"#FFFFFF",
    danger:"#B42345", dangerBorder:"#F1CAD3",
  },
};

type ThemeContextValue = { mode: ThemeMode; colors: ThemeColors; setMode: (mode: ThemeMode) => void };
const ThemeContext = createContext<ThemeContextValue>({
  mode:"dark", colors:palettes.dark, setMode:()=>{},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  useEffect(() => {
    AsyncStorage.getItem("snapstudy:theme").then(value => {
      if (value === "light" || value === "dark") setModeState(value);
    }).catch(() => {});
  }, []);
  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem("snapstudy:theme", next).catch(() => {});
  };
  const value = useMemo(() => ({ mode, colors:palettes[mode], setMode }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
