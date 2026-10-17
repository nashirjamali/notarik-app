import { Link } from "expo-router";
import { useState } from "react";
import { TextInput } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/theme/Theme";

export default function LoginScreen() {
  const theme = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not reach the API");
    }
  }

  const inputStyle = {
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    color: theme.text,
    backgroundColor: theme.surface,
  };

  return (
    <Screen style={{ padding: theme.spacing.lg, gap: theme.spacing.md, justifyContent: "center" }}>
      <Text variant="display">Notarik</Text>
      <Text variant="label">Email</Text>
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={inputStyle}
      />
      <Text variant="label">Password</Text>
      <TextInput
        accessibilityLabel="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={inputStyle}
      />
      {error ? <Text variant="muted">{error}</Text> : null}
      <Button label="Log in" onPress={() => void submit()} />
      <Link href="/signup">
        <Text variant="label">Sign up</Text>
      </Link>
    </Screen>
  );
}
