import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { useAuth } from "@/lib/auth";
import { getMe } from "@/lib/client";
import { useTheme } from "@/theme/Theme";

export default function SettingsScreen() {
  const theme = useTheme();
  const { logout, session } = useAuth();
  const me = useQuery({
    queryKey: ["me", session?.userId],
    queryFn: getMe,
    enabled: Boolean(session),
  });
  return (
    <Screen style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
      <Text variant="display">Settings</Text>
      {me.data?.name ? <Text variant="muted">Signed in as {me.data.name}</Text> : null}
      <Button label="Log out" variant="ghost" onPress={() => void logout()} />
    </Screen>
  );
}
