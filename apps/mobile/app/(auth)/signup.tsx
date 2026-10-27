import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { GoogleSignInError } from "@/lib/google";
import { useTheme } from "@/theme/Theme";
import Apple from "../../assets/svg/login-apple.svg";
import ChevronLeft from "../../assets/svg/login-chevron-left.svg";
import Eye from "../../assets/svg/login-eye.svg";
import Google from "../../assets/svg/login-google.svg";
import Lock from "../../assets/svg/login-lock.svg";
import Mail from "../../assets/svg/login-mail.svg";
import User from "../../assets/svg/signup-user.svg";

// Mirrors SignupRequest.password min_length on the API.
const MIN_PASSWORD_LENGTH = 8;

export default function SignupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signup, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting && !googleBusy;

  async function submit() {
    if (!canSubmit) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signup(email.trim(), password, name);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not reach the API");
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function continueWithGoogle() {
    if (googleBusy || submitting) return;
    setError(null);
    setGoogleBusy(true);
    try {
      await loginWithGoogle();
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof GoogleSignInError
          ? caught.message
          : "Could not reach the API",
      );
    } finally {
      setGoogleBusy(false);
    }
  }

  // Apple sign-in comes later; say so instead of failing silently.
  function comingSoon(feature: string) {
    setError(`${feature} is not available yet`);
  }

  const inputRow = [
    styles.inputRow,
    { backgroundColor: theme.bg, borderRadius: theme.radius.lg },
  ];
  const inputText = [styles.input, { color: theme.text, ...theme.type.caption }];
  const outlined = [
    styles.outlined,
    { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: theme.radius.md },
  ];

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.surface }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.frame}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={goBack}
              style={({ pressed }) => [
                styles.back,
                { backgroundColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ChevronLeft />
            </Pressable>

            <View style={styles.form}>
              <Text style={[styles.headline, { color: theme.text, ...theme.type.headline.hero }]}>
                Create your{"\n"}account
              </Text>
              <Text style={{ color: theme.muted, ...theme.type.caption }}>
                It takes less than a minute.
              </Text>
              <View style={{ height: 6 }} />

              <View style={inputRow}>
                <User />
                <TextInput
                  accessibilityLabel="Name"
                  placeholder="Your name"
                  placeholderTextColor={theme.muted}
                  autoCapitalize="words"
                  maxLength={80}
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  value={name}
                  onChangeText={setName}
                  style={inputText}
                />
              </View>

              <View style={inputRow}>
                <Mail />
                <TextInput
                  accessibilityLabel="Email"
                  placeholder="you@email.com"
                  placeholderTextColor={theme.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  value={email}
                  onChangeText={setEmail}
                  style={inputText}
                />
              </View>

              <View style={inputRow}>
                <Lock />
                <TextInput
                  accessibilityLabel="Password"
                  placeholder="Create a password"
                  placeholderTextColor={theme.muted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={() => void submit()}
                  style={inputText}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  hitSlop={12}
                  onPress={() => setShowPassword((value) => !value)}
                  style={{ opacity: showPassword ? 0.5 : 1 }}
                >
                  <Eye />
                </Pressable>
              </View>

              <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>
                By creating an account, you agree to our Terms and Privacy Policy.
              </Text>

              {error ? (
                <Text accessibilityRole="alert" style={{ color: theme.danger, ...theme.type.caption }}>
                  {error}
                </Text>
              ) : null}

              <View style={{ height: 4 }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create account"
                accessibilityState={{ disabled: !canSubmit, busy: submitting }}
                disabled={!canSubmit}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.primary,
                  {
                    height: theme.buttonHeights.primary,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.accent,
                    opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.accentText} />
                ) : (
                  <Text style={{ color: theme.accentText, ...theme.type.button1 }}>
                    Create account
                  </Text>
                )}
              </Pressable>

              <View style={{ height: 8 }} />
              <View style={styles.divider}>
                <View style={[styles.line, { backgroundColor: theme.border }]} />
                <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>or</Text>
                <View style={[styles.line, { backgroundColor: theme.border }]} />
              </View>
              <View style={{ height: 8 }} />

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: googleBusy, busy: googleBusy }}
                disabled={googleBusy}
                onPress={() => void continueWithGoogle()}
                style={({ pressed }) => [outlined, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Google />
                <Text style={{ color: theme.text, ...theme.type.button2 }}>Continue with Google</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => comingSoon("Apple sign-in")}
                style={({ pressed }) => [outlined, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Apple />
                <Text style={{ color: theme.text, ...theme.type.button2 }}>Continue with Apple</Text>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={{ color: theme.muted, ...theme.type.caption }}>
                Already have an account?
              </Text>
              <Link replace href="/login" accessibilityRole="link">
                <Text style={{ color: theme.accent, ...theme.type.captionBold }}>Log in</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: "center" },
  frame: {
    width: "100%",
    maxWidth: 390,
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "web" ? 52 : 8,
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { marginTop: 12, gap: 10 },
  headline: { letterSpacing: -1.6 },
  inputRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    // @ts-expect-error web-only: drop the browser focus ring inside the pill
    outlineStyle: "none",
  },
  primary: { alignItems: "center", justifyContent: "center" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { flex: 1, height: 1 },
  outlined: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    paddingTop: 32,
    paddingBottom: 24,
  },
});
