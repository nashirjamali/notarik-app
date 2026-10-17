import { Link } from "expo-router";
import { useState } from "react";
import { TextInput } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/theme/Theme";

export default function SignupScreen() {
  const theme = useTheme();
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await signup(email.trim(), password);
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
      <Text variant="display">Create account</Text>
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
      <Button label="Sign up" onPress={() => void submit()} />
      <Link href="/login">
        <Text variant="label">Log in</Text>
      </Link>
    </Screen>
  );
}
