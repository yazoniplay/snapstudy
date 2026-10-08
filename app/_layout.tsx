import { useEffect } from "react";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";

export default function Layout() {
  const pathname = usePathname();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && pathname !== "/auth") {
        router.replace("/auth");
      } else if (event === "SIGNED_IN" && pathname === "/auth" && session) {
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: "#070A12" },
        }}
      />
    </>
  );
}
