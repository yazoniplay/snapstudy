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

type ThemeContextValue = { mode: ThemeMode; colors: ThemeColors; setMode: (mode: ThemeMode) => void; accentColor: string; setAccentColor: (color: string) => void };
const ThemeContext = createContext<ThemeContextValue>({
  mode:"dark", colors:palettes.dark, setMode:()=>{}, accentColor:"#8B5CF6", setAccentColor:()=>{},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accentColor, setAccentColorState] = useState("#8B5CF6");
  useEffect(() => {
    AsyncStorage.multiGet(["snapstudy:theme", "snapstudy:accent"]).then(values => {
      const savedMode = values[0]?.[1];
      const savedAccent = values[1]?.[1];
      if (savedMode === "light" || savedMode === "dark") setModeState(savedMode);
      if (savedAccent && /^#[0-9A-Fa-f]{6}$/.test(savedAccent)) setAccentColorState(savedAccent.toUpperCase());
    }).catch(() => {});
  }, []);
  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem("snapstudy:theme", next).catch(() => {});
  };
  const setAccentColor = (color: string) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return;
    const normalized = color.toUpperCase();
    setAccentColorState(normalized);
    AsyncStorage.setItem("snapstudy:accent", normalized).catch(() => {});
  };
  const mix = (hex: string, target: string, amount: number) => {
    const channel = (start: number, end: number) => Math.round(start + (end - start) * amount);
    const rgb = (value: string) => [parseInt(value.slice(1,3),16),parseInt(value.slice(3,5),16),parseInt(value.slice(5,7),16)];
    const a = rgb(hex), b = rgb(target);
    return "#" + a.map((v,i)=>channel(v,b[i]).toString(16).padStart(2,"0")).join("").toUpperCase();
  };
  const colors = useMemo(() => ({
    ...palettes[mode],
    accent: accentColor,
    accentSoft: mix(accentColor, mode === "dark" ? palettes.dark.bg : "#FFFFFF", mode === "dark" ? 0.78 : 0.88),
  }), [mode, accentColor]);
  const value = useMemo(() => ({ mode, colors, setMode, accentColor, setAccentColor }), [mode, colors, accentColor]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
