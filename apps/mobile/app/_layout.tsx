import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";

import { ApiError } from "@/lib/api";
import { destination } from "@/lib/guard";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/theme/Theme";
import { useFonts } from "@/hooks/useFonts";

SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { ready, session } = useAuth();
  const where = destination(ready, session);
  if (where === "loading") return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={where === "app"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={where === "auth"}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) =>
              count < 1 && !(error instanceof ApiError && error.status === 401),
          },
        },
      }),
  );

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={client}>
          <Navigator />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
