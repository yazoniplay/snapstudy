import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import BottomNav from "../components/BottomNav";
import MessageNotification from "../components/MessageNotification";
import { ThemeProvider, useTheme } from "../lib/theme";
import { LanguageProvider } from "../lib/language";
import { supabase } from "../lib/supabase";

function AppStack() {
  const { mode, colors } = useTheme();
  const pathname = usePathname();
  const presenceRef = useRef<any>(null);
  const showBottomNav = pathname !== "/" && pathname !== "/auth" && pathname !== "/onboarding" && pathname !== "/study";

  useEffect(() => {
    let disposed = false;
    async function setPresence(userId: string | null) {
      if (presenceRef.current) {
        const previous = presenceRef.current;
        presenceRef.current = null;
        await supabase.removeChannel(previous);
      }
      if (!userId || disposed) return;
      const channel = supabase.channel("snapstudy-presence:" + userId, { config: { presence: { key: userId } } });
      presenceRef.current = channel;
      channel.subscribe(async status => {
        if (status === "SUBSCRIBED" && !disposed && presenceRef.current === channel) {
          await channel.track({ user_id: userId, active_at: new Date().toISOString() });
        }
      });
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!disposed) void setPresence(data.session?.user.id || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void setPresence(session?.user.id || null);
    });
    return () => {
      disposed = true;
      listener.subscription.unsubscribe();
      if (presenceRef.current) void supabase.removeChannel(presenceRef.current);
      presenceRef.current = null;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
