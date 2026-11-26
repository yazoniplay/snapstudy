import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import BottomNav from "../components/BottomNav";
import MessageNotification from "../components/MessageNotification";
import { ThemeProvider, useTheme } from "../lib/theme";
import { LanguageProvider } from "../lib/language";

function AppStack() {
  const { mode, colors } = useTheme();
  const pathname = usePathname();
  const showBottomNav = pathname !== "/" && pathname !== "/auth" && pathname !== "/onboarding";

  return (
    <View style={{ flex:  1, backgroundColor: colors.bg }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
      {showBottomNav ? <BottomNav /> : null}
      <MessageNotification />
    </View>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppStack />
      </LanguageProvider>
    </ThemeProvider>
  );
}
