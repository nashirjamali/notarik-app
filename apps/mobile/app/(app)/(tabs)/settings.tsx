import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/theme/Theme";

export default function SettingsScreen() {
  const theme = useTheme();
  const { logout } = useAuth();
  return (
    <Screen style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
      <Text variant="display">Settings</Text>
      <Button label="Log out" variant="ghost" onPress={() => void logout()} />
    </Screen>
  );
}
