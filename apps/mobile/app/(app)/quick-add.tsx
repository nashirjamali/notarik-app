import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError, type FieldError } from "@/lib/api";
import { createTransaction } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { parseQuickAdd } from "@/lib/quickAdd";
import { dateLabel } from "@/lib/receipt";
import type { TransactionInput } from "@/lib/types";
import { useTheme } from "@/theme/Theme";
import { categoryLabels, type Category } from "@/theme/tokens";
import Close from "../../assets/svg/sheet-x.svg";
import Mark from "../../assets/svg/review-mark.svg";

const camera = require("../../assets/icons/3d-camera.png");
const mic = require("../../assets/icons/3d-mic.png");
const rice = require("../../assets/icons/3d-rice.png");

// Web only: the accent border already shows focus, so drop the browser ring.
const noOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;

const MIN_INPUT_HEIGHT = 56;

const CATEGORY_ORDER: Category[] = ["Dining", "Groceries", "Transport", "Bills", "Shopping", "Other"];

function dateChip(date: string, now: Date): string {
  const label = dateLabel(date);
  if (label !== "Today") return label;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `Today, ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function QuickAddScreen() {
  const theme = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Category | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  const sheetHeight = Math.max(Math.min(664, height - 180), Math.min(520, height - 40));
  const parsed = useMemo(() => parseQuickAdd(text), [text]);
  const category = picked ?? parsed.category;
  const typed = text.trim().length > 0;
  const now = new Date();

  const save = useMutation({
    mutationFn: (input: TransactionInput) => createTransaction(input),
    onSuccess: (created) => {
      void client.invalidateQueries({ queryKey: ["transactions"] });
      router.replace(`/transactions/${created.id}`);
    },
    onError: (error) => {
      setServerErrors(error instanceof ApiError ? error.details : []);
      setMessage(error instanceof ApiError ? error.message : "Could not reach the API");
    },
  });

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function submit() {
    if (save.isPending) return;
    setServerErrors([]);
    if (parsed.total == null) {
      setMessage(typed ? "Add an amount, like 35rb or 35.000" : "Type what you spent, like “makan siang 35rb di warteg”");
      return;
    }
    setMessage(null);
    save.mutate({
      merchant: parsed.merchant ?? (parsed.description || "Expense"),
      date: parsed.date,
      total_minor: parsed.total,
      category,
      // Keep the words the person used when a merchant took the title.
      note: parsed.merchant && parsed.description ? parsed.description : undefined,
      items: [],
    });
  }

  const caption = { color: theme.muted, ...theme.type.captionSmall };
  const title = parsed.merchant ?? (parsed.description || "Expense");
  const subtitle = parsed.merchant ? parsed.description || categoryLabels[category] : categoryLabels[category];
  const fieldMessage = serverErrors[0]?.message;

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel="Close"
        accessibilityRole="button"
        onPress={close}
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.avoid}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              backgroundColor: theme.surface,
              transform: [
                { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] }) },
              ],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text accessibilityRole="header" style={{ color: theme.text, ...theme.type.body1Bold }}>
                Add expense
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                onPress={close}
                style={[styles.closeButton, { backgroundColor: theme.bg }]}
              >
                <Close />
              </Pressable>
            </View>

            <TextInput
              accessibilityLabel="What did you spend?"
              autoFocus
              multiline
              // The parser reads the exact words typed, so keep the keyboard from rewriting them.
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="off"
              placeholder="makan siang 35rb di warteg"
              placeholderTextColor={theme.muted}
              value={text}
              onChangeText={(value) => {
                setText(value);
                setMessage(null);
              }}
              // iOS does not grow a multiline field by itself; web does.
              onContentSizeChange={
                Platform.OS === "web"
                  ? undefined
                  : (event) =>
                      setInputHeight(Math.max(MIN_INPUT_HEIGHT, event.nativeEvent.contentSize.height))
              }
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.accent, backgroundColor: theme.surface, ...theme.type.body1 },
                noOutline,
                Platform.OS !== "web" && { height: inputHeight },
              ]}
            />

            {typed && parsed.total != null ? (
              <View style={[styles.preview, { backgroundColor: theme.bg }]}>
                <View style={styles.label}>
                  <Mark />
                  <Text style={{ color: theme.accent, ...theme.type.captionSmallBold }}>
                    Notarik understood
                  </Text>
                </View>
                <View style={styles.topRow}>
                  <View style={[styles.iconTile, { backgroundColor: theme.surface }]}>
                    {category === "Dining" ? (
                      <Image source={rice} style={styles.rice} resizeMode="contain" />
                    ) : (
                      <View style={[styles.bigDot, { backgroundColor: theme.category[category] }]} />
                    )}
                  </View>
                  <View style={styles.meta}>
                    <Text numberOfLines={1} style={{ color: theme.text, ...theme.type.body2Bold }}>
                      {title}
                    </Text>
                    <Text numberOfLines={1} style={caption}>
                      {subtitle}
                    </Text>
                  </View>
                  <Text style={{ color: theme.text, ...theme.type.body1Bold }}>
                    {formatIdr(parsed.total)}
                  </Text>
                </View>
                <View style={styles.chips}>
                  <View style={[styles.previewChip, { backgroundColor: theme.surface }]}>
                    <View style={[styles.dot, { backgroundColor: theme.category[category] }]} />
                    <Text style={{ color: theme.text, ...theme.type.captionSmallBold }}>
                      {categoryLabels[category]}
                    </Text>
                  </View>
                  <View style={[styles.previewChip, { backgroundColor: theme.surface }]}>
                    <Text style={caption}>{dateChip(parsed.date, now)}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {message || fieldMessage ? (
              <Text accessibilityRole="alert" style={{ color: theme.danger, ...theme.type.caption }}>
                {message ?? fieldMessage}
              </Text>
            ) : null}

            <View style={{ gap: 8 }}>
              <Text style={caption}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 24 }}
                style={styles.chipScroll}
              >
                {CATEGORY_ORDER.map((name) => {
                  const selected = name === category;
                  const color = theme.category[name];
                  return (
                    <Pressable
                      key={name}
                      accessibilityRole="radio"
                      accessibilityLabel={categoryLabels[name]}
                      aria-checked={selected}
                      onPress={() => setPicked(name)}
                      style={[
                        styles.category,
                        selected
                          ? { backgroundColor: color, borderColor: color }
                          : { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                    >
                      <View style={[styles.dot, { backgroundColor: selected ? theme.accentText : color }]} />
                      <Text
                        style={{
                          color: selected ? theme.accentText : theme.text,
                          ...(selected ? theme.type.captionBold : theme.type.caption),
                        }}
                      >
                        {categoryLabels[name]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={caption}>Or add another way</Text>
              <View style={styles.altRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Snap receipt"
                  onPress={() => router.replace("/snap")}
                  style={[styles.alt, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <View style={[styles.altTile, { backgroundColor: theme.bg }]}>
                    <Image source={camera} style={styles.altIcon} resizeMode="contain" />
                  </View>
                  <View>
                    <Text style={{ color: theme.text, ...theme.type.captionBold }}>Snap receipt</Text>
                    <Text style={caption}>Photo or PDF</Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voice"
                  onPress={() => setMessage("Voice entry is not available yet")}
                  style={[styles.alt, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <View style={[styles.altTile, { backgroundColor: theme.bg }]}>
                    <Image source={mic} style={styles.altIcon} resizeMode="contain" />
                  </View>
                  <View>
                    <Text style={{ color: theme.text, ...theme.type.captionBold }}>Voice</Text>
                    <Text style={caption}>Just say it</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.bottom, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 0) + 24 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save expense"
              accessibilityState={{ busy: save.isPending }}
              onPress={submit}
              style={({ pressed }) => [
                styles.save,
                { backgroundColor: theme.accent, opacity: save.isPending ? 0.6 : pressed ? 0.85 : 1 },
              ]}
            >
              {save.isPending ? (
                <ActivityIndicator color={theme.accentText} />
              ) : (
                <Text style={{ color: theme.accentText, ...theme.type.button1 }}>Save expense</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  avoid: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: {
    width: "100%",
    maxWidth: 430,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginTop: 8 },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    minHeight: 56,
    textAlignVertical: "top",
  },
  preview: { borderRadius: 24, paddingTop: 14, paddingBottom: 16, paddingHorizontal: 16, gap: 12 },
  label: { flexDirection: "row", alignItems: "center", gap: 6 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconTile: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rice: { width: 38, height: 38 },
  bigDot: { width: 20, height: 20, borderRadius: 10 },
  meta: { flex: 1, gap: 2 },
  chips: { flexDirection: "row", gap: 8 },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 40,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipScroll: { marginHorizontal: -24, paddingLeft: 24 },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 8,
    borderRadius: 40,
    borderWidth: 1,
  },
  altRow: { flexDirection: "row", gap: 12 },
  alt: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  altTile: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  altIcon: { width: 34, height: 34 },
  bottom: { paddingHorizontal: 24, paddingTop: 12 },
  save: { paddingVertical: 12, minHeight: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
