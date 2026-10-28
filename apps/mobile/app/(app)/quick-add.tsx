import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, type FieldError } from "@/lib/api";
import { createTransaction, createTransactionsBatch } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { MAX_ROWS, parseQuickAdd, splitEntries } from "@/lib/quickAdd";
import {
  applyEdit,
  oneExpense,
  rowIndexFromLoc,
  rowsFromText,
  rowTitle,
  toInput,
  type Row,
  type RowEdit,
} from "@/lib/quickAddRows";
import { dateLabel } from "@/lib/receipt";
import type { TransactionInput } from "@/lib/types";
import { BottomSheet } from "@/components/BottomSheet";
import { OptionSheet } from "@/components/OptionSheet";
import { QuickAddRows } from "@/features/QuickAddRows";
import { useTheme } from "@/theme/Theme";
import { categoryLabels, type Category } from "@/theme/tokens";
import Mark from "../../assets/svg/review-mark.svg";

const camera = require("../../assets/icons/3d-camera.png");
const mic = require("../../assets/icons/3d-mic.png");
const rice = require("../../assets/icons/3d-rice.png");

// Web only: the accent border already shows focus, so drop the browser ring.
const noOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;

// The field has 12 of padding above and below its text.
const INPUT_PADDING = 24;
const MIN_INPUT_HEIGHT = 48;

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
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Category | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);

  const entries = useMemo(() => rowsFromText(text), [text]);
  const cutOff = useMemo(() => splitEntries(text).length > MAX_ROWS, [text]);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [removed, setRemoved] = useState<Record<string, true>>({});
  const [asOne, setAsOne] = useState(false);
  const [pickingKey, setPickingKey] = useState<string | null>(null);
  const rows = useMemo(
    () => entries.filter((row) => !removed[row.key]).map((row) => applyEdit(row, edits[row.key])),
    [entries, removed, edits],
  );
  // One expense (or none) is the single-expense sheet exactly as it was.
  const many = rows.length > 1;
  const missingAmount = many && rows.some((row) => row.total == null);
  const allRemoved = entries.length > 0 && rows.length === 0;
  const parsed = rows[0] ?? parseQuickAdd(allRemoved ? "" : text);
  const category = picked ?? parsed.category;
  const typed = text.trim().length > 0;
  const now = new Date();
  const pickingRow = rows.find((row) => row.key === pickingKey);

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

  const saveMany = useMutation({
    mutationFn: (inputs: TransactionInput[]) => createTransactionsBatch({ transactions: inputs }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["transactions"] });
      router.replace("/(app)/(tabs)/transactions");
    },
    onError: (error) => {
      setServerErrors(error instanceof ApiError ? error.details : []);
      if (!(error instanceof ApiError)) {
        setMessage("Could not reach the API");
        return;
      }
      // The API names the row that failed ("transactions.2.total_minor"); say which one it was.
      const detail = error.details[0];
      const index = detail ? rowIndexFromLoc(detail.loc) : null;
      setMessage(detail && index != null && rows[index] ? `${rowTitle(rows[index])}: ${detail.message}` : error.message);
    },
  });
  const busy = save.isPending || saveMany.isPending;

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function submit() {
    if (busy) return;
    setServerErrors([]);
    if (many) {
      if (missingAmount) {
        setMessage("Add an amount to the highlighted expenses, or remove them");
        return;
      }
      setMessage(null);
      const complete = rows.filter((row): row is Row & { total: number } => row.total != null);
      if (asOne) save.mutate(oneExpense(complete));
      else saveMany.mutate(complete.map(toInput));
      return;
    }
    if (allRemoved) {
      setMessage("Nothing left to save");
      return;
    }
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

  const saveLabel = many ? (asOne ? "Save as one expense" : `Save ${rows.length} expenses`) : "Save expense";
  const caption = { color: theme.muted, ...theme.type.captionSmall };
  const title = parsed.merchant ?? (parsed.description || "Expense");
  const subtitle = parsed.merchant ? parsed.description || categoryLabels[category] : categoryLabels[category];
  const fieldMessage = serverErrors[0]?.message;

  return (
    <>
      <BottomSheet
        title="Add expense"
        onClosed={leave}
        footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saveLabel}
          accessibilityState={{ busy, disabled: missingAmount }}
          onPress={submit}
          style={({ pressed }) => [
            styles.save,
            { backgroundColor: theme.accent, opacity: busy ? 0.6 : missingAmount ? 0.5 : pressed ? 0.85 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <Text style={{ color: theme.accentText, ...theme.type.button1 }}>{saveLabel}</Text>
          )}
        </Pressable>
        }
      >
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
                  setInputHeight(Math.max(MIN_INPUT_HEIGHT, event.nativeEvent.contentSize.height + INPUT_PADDING))
          }
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.accent, backgroundColor: theme.surface, ...theme.type.body2 },
            noOutline,
            Platform.OS !== "web" && { height: inputHeight },
          ]}
        />

        {many ? (
          <QuickAddRows
            rows={rows}
            asOne={asOne}
            onAsOne={setAsOne}
            onPickCategory={setPickingKey}
            onRemove={(key) => setRemoved((current) => ({ ...current, [key]: true }))}
            onAmount={(key, total) => setEdits((current) => ({ ...current, [key]: { ...current[key], total } }))}
          />
        ) : typed && parsed.total != null ? (
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

        {cutOff ? <Text style={caption}>Only the first {MAX_ROWS} expenses are used.</Text> : null}

        {!many ? (
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
        ) : null}

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
      </BottomSheet>
      <OptionSheet<Category>
        visible={pickingKey != null}
        title="Category"
        options={CATEGORY_ORDER.map((name) => ({ value: name, label: categoryLabels[name], color: theme.category[name] }))}
        selected={pickingRow?.category}
        onClose={() => setPickingKey(null)}
        onSelect={(value) => {
          if (pickingKey) {
            setEdits((current) => ({ ...current, [pickingKey]: { ...current[pickingKey], category: value } }));
          }
          setPickingKey(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
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
  save: { paddingVertical: 12, minHeight: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
