import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useTheme } from "@/theme/Theme";

export default function ChatScreen() {
  const theme = useTheme();
  return (
    <Screen style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
      <Text variant="display">Chat</Text>
      <Text variant="muted">The assistant arrives with the agent work.</Text>
    </Screen>
  );
}
