import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { destination } from "@/lib/guard";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/theme/Theme";

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
