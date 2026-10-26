import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { FieldError } from "@/lib/api";
import { formatIdr, parseAmount, totalsDiffer } from "@/lib/money";
import {
  dateLabel,
  draftToReview,
  flaggedItems,
  generalIssues,
  type ReviewItem,
} from "@/lib/receipt";
import type { ReceiptRun, TransactionInput } from "@/lib/types";
import { useTheme } from "@/theme/Theme";
import { categories, type Category } from "@/theme/tokens";
import Alert from "../../assets/svg/review-alert.svg";
import ChevronDown from "../../assets/svg/review-chevron-down.svg";
import ChevronLeft from "../../assets/svg/login-chevron-left.svg";
import Mark from "../../assets/svg/review-mark.svg";
import Note from "../../assets/svg/review-note.svg";
import Pencil from "../../assets/svg/review-pencil.svg";

const COLLAPSED_ITEMS = 3;

type Props = {
  run: ReceiptRun;
  imageSource?: { uri: string; headers?: Record<string, string> };
  serverErrors?: FieldError[];
  saving?: boolean;
  onSubmit: (value: TransactionInput) => Promise<void>;
  onRetake: () => void;
  onDiscard: () => void;
  onBack: () => void;
};

export function ReceiptReview({
  run,
  imageSource,
  serverErrors = [],
  saving = false,
  onSubmit,
  onRetake,
  onDiscard,
  onBack,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [initial] = useState(() => draftToReview(run.draft));
  const [merchant, setMerchant] = useState(initial.merchant);
  const [date, setDate] = useState(initial.date);
  const [total, setTotal] = useState(initial.total);
  const [category, setCategory] = useState<Category>(initial.category);
  const [items, setItems] = useState<ReviewItem[]>(initial.items);
  const [note, setNote] = useState("");
  const [editingTotal, setEditingTotal] = useState(initial.total === "");
  const [editingDate, setEditingDate] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFailed, setImageFailed] = useState(false);

  const flagged = flaggedItems(run.issues);
  const general = generalIssues(run.issues);
  const totalMinor = parseAmount(total);
  const itemSum = items.reduce((sum, item) => sum + (parseAmount(item.amount) ?? 0), 0);
  const mismatch =
    totalMinor != null &&
    items.length > 0 &&
    totalsDiffer(
      totalMinor,
      items.map((item) => ({ lineTotalMinor: parseAmount(item.amount) ?? 0 })),
    );
  const readByNotarik = Boolean(run.draft?.merchant && run.draft?.total_minor != null);
  const visibleItems = expanded ? items : items.slice(0, COLLAPSED_ITEMS);
  const hidden = items.length - visibleItems.length;

  function fieldError(loc: string) {
    return errors[loc] ?? serverErrors.find((error) => error.loc === loc)?.message;
  }

  function updateItem(index: number, patch: Partial<ReviewItem>) {
    setItems((current) =>
      current.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
  }

  async function submit() {
    const next: Record<string, string> = {};
    if (!merchant.trim()) next.merchant = "Enter a merchant";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = "Use YYYY-MM-DD";
    if (totalMinor == null) next.total_minor = "Enter an amount like 25000 or 25rb";
    const payloadItems: TransactionInput["items"] = [];
    items.forEach((item, index) => {
      const amount = parseAmount(item.amount);
      if (!item.name.trim()) next[`items.${index}.name`] = "Enter an item name";
      if (amount == null) next[`items.${index}.line_total_minor`] = "Enter an item amount";
      if (item.name.trim() && amount != null) {
        payloadItems.push({ name: item.name.trim(), qty: item.qty, line_total_minor: amount });
      }
    });
    setErrors(next);
    if (next.date) setEditingDate(true);
    if (next.total_minor) setEditingTotal(true);
    const itemError = Object.keys(next).find((key) => key.startsWith("items."));
    if (itemError) setEditingItem(Number(itemError.split(".")[1]));
    if (Object.keys(next).length > 0 || totalMinor == null) return;
    await onSubmit({
      merchant: merchant.trim(),
      date,
      total_minor: totalMinor,
      category,
      items: payloadItems,
      note: note.trim() || undefined,
    });
  }

  const subtle = { backgroundColor: theme.bg };
  const caption = { color: theme.muted, ...theme.type.captionSmall };

  return (
    <View style={[styles.root, { backgroundColor: theme.surface }]}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 47) + 5 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={[styles.back, { backgroundColor: theme.border }]}
        >
          <ChevronLeft />
        </Pressable>
        <Text style={{ color: theme.text, ...theme.type.body2Bold }}>Review receipt</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retake"
          onPress={onRetake}
          style={styles.retake}
        >
          <Text numberOfLines={1} style={{ color: theme.accent, ...theme.type.captionBold }}>
            Retake
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summary}>
            <View style={[styles.thumb, { borderColor: theme.border, backgroundColor: theme.bg }]}>
              {imageSource && !imageFailed ? (
                <Image
                  accessibilityLabel="Receipt photo"
                  source={imageSource}
                  style={styles.thumbImage}
                  resizeMode="cover"
                  onError={() => setImageFailed(true)}
                />
              ) : null}
            </View>
            <View style={styles.meta}>
              <TextInput
                accessibilityLabel="Merchant"
                placeholder="Merchant name"
                placeholderTextColor={theme.muted}
                value={merchant}
                onChangeText={setMerchant}
                style={[styles.merchant, { color: theme.text, ...theme.type.body2Bold }]}
              />
              {editingDate ? (
                <TextInput
                  accessibilityLabel="Date"
                  autoFocus
                  value={date}
                  onChangeText={setDate}
                  onBlur={() => setEditingDate(false)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.muted}
                  style={[styles.dateInput, { color: theme.text, ...theme.type.captionSmall }]}
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change date"
                  onPress={() => setEditingDate(true)}
                >
                  <Text style={caption}>{dateLabel(date)}</Text>
                </Pressable>
              )}
              {fieldError("date") ? (
                <Text style={{ color: theme.danger, ...theme.type.captionSmall }}>
                  {fieldError("date")}
                </Text>
              ) : null}
              {fieldError("merchant") ? (
                <Text style={{ color: theme.danger, ...theme.type.captionSmall }}>
                  {fieldError("merchant")}
                </Text>
              ) : null}
              <View style={[styles.chip, { backgroundColor: theme.accentSubtle }]}>
                {readByNotarik ? <Mark /> : <Alert />}
                <Text style={{ color: theme.accent, ...theme.type.captionSmallBold }}>
                  {readByNotarik ? "Read by Notarik" : "Fill in the details"}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ gap: 2 }}>
            <Text style={caption}>Total</Text>
            <View style={styles.amountRow}>
              {editingTotal ? (
                <TextInput
                  accessibilityLabel="Total"
                  autoFocus={initial.total !== ""}
                  keyboardType="numbers-and-punctuation"
                  placeholder="Rp 0"
                  placeholderTextColor={theme.muted}
                  value={total}
                  onChangeText={setTotal}
                  onBlur={() => totalMinor != null && setEditingTotal(false)}
                  style={[styles.amountInput, { color: theme.text, ...theme.type.headline.hero }]}
                />
              ) : (
                <Text
                  accessibilityLabel={`Total ${formatIdr(totalMinor ?? 0)}`}
                  style={[styles.amountText, { color: theme.text, ...theme.type.headline.hero }]}
                >
                  {formatIdr(totalMinor ?? 0)}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit total"
                onPress={() => setEditingTotal((value) => !value)}
                style={[styles.edit, subtle]}
              >
                <Pencil />
              </Pressable>
            </View>
            {fieldError("total_minor") ? (
              <Text style={{ color: theme.danger, ...theme.type.captionSmall }}>
                {fieldError("total_minor")}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={caption}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 24 }}
              style={styles.chips}
            >
              {categories.map((name) => {
                const selected = name === category;
                const color = theme.category[name];
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityLabel={name}
                    accessibilityState={{ selected }}
                    onPress={() => setCategory(name)}
                    style={[
                      styles.category,
                      selected
                        ? { backgroundColor: color, borderColor: color, borderWidth: 1.5 }
                        : { backgroundColor: theme.surface, borderColor: theme.borderStrong, borderWidth: 1 },
                    ]}
                  >
                    <View
                      style={[styles.dot, { backgroundColor: selected ? theme.accentText : color }]}
                    />
                    <Text
                      style={{
                        color: selected ? theme.accentText : theme.text,
                        ...(selected ? theme.type.captionBold : theme.type.caption),
                      }}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {general.length > 0 || mismatch ? (
            <View style={[styles.warning, { backgroundColor: theme.warningSubtle }]}>
              <Alert />
              <View style={{ flex: 1, gap: 2 }}>
                {general.map((issue, index) => (
                  // Validator text is rendered as plain text only.
                  <Text key={`${issue.code}-${index}`} style={{ color: theme.muted, ...theme.type.captionSmall }}>
                    {issue.detail}
                  </Text>
                ))}
                {mismatch ? (
                  <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>
                    Items add up to {formatIdr(itemSum)}, but the total is {formatIdr(totalMinor ?? 0)}.
                    Both are saved.
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {items.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={caption}>Items</Text>
              <View style={[styles.card, subtle]}>
                {visibleItems.map((item, index) => {
                  const issue = flagged.get(index);
                  const editing = editingItem === index;
                  return (
                    <Pressable
                      key={`${item.name}-${index}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.name}`}
                      onPress={() => setEditingItem(editing ? null : index)}
                      style={[
                        styles.item,
                        issue && { backgroundColor: theme.warningSubtle },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        {editing ? (
                          <TextInput
                            accessibilityLabel={`Item name ${index + 1}`}
                            value={item.name}
                            onChangeText={(name) => updateItem(index, { name })}
                            style={{ color: theme.text, ...theme.type.caption, padding: 0 }}
                          />
                        ) : (
                          <View style={styles.nameRow}>
                            <Text style={{ color: theme.text, ...theme.type.caption, flexShrink: 1 }}>
                              {item.name}
                            </Text>
                            {item.qty != null ? (
                              <Text style={{ color: theme.muted, ...theme.type.caption }}>
                                ×{item.qty}
                              </Text>
                            ) : null}
                          </View>
                        )}
                        {issue ? (
                          <View style={styles.nameRow}>
                            <Alert />
                            <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>
                              {issue.code === "ITEM_PRICE_IS_UNIT_PRICE"
                                ? "Looks like a unit price, please check"
                                : "Please check this price"}
                            </Text>
                          </View>
                        ) : null}
                        {fieldError(`items.${index}.name`) ? (
                          <Text style={{ color: theme.danger, ...theme.type.captionSmall }}>
                            {fieldError(`items.${index}.name`)}
                          </Text>
                        ) : null}
                        {fieldError(`items.${index}.line_total_minor`) ? (
                          <Text style={{ color: theme.danger, ...theme.type.captionSmall }}>
                            {fieldError(`items.${index}.line_total_minor`)}
                          </Text>
                        ) : null}
                      </View>
                      {editing ? (
                        <TextInput
                          accessibilityLabel={`Item amount ${index + 1}`}
                          keyboardType="numbers-and-punctuation"
                          value={item.amount}
                          onChangeText={(amount) => updateItem(index, { amount })}
                          style={[styles.itemAmountInput, { color: theme.text, ...theme.type.captionBold }]}
                        />
                      ) : (
                        <Text style={{ color: theme.text, ...theme.type.captionBold }}>
                          {formatIdr(parseAmount(item.amount) ?? 0)}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
                {items.length > COLLAPSED_ITEMS ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setExpanded((value) => !value)}
                    style={styles.more}
                  >
                    <Text style={{ color: theme.accent, ...theme.type.captionBold }}>
                      {expanded ? "Show fewer items" : `+ ${hidden} more items`}
                    </Text>
                    <View style={expanded && { transform: [{ rotate: "180deg" }] }}>
                      <ChevronDown />
                    </View>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={[styles.note, subtle]}>
            <Note />
            <TextInput
              accessibilityLabel="Note"
              placeholder="Add a note (optional)"
              placeholderTextColor={theme.muted}
              maxLength={500}
              value={note}
              onChangeText={setNote}
              style={[styles.noteInput, { color: theme.text, ...theme.type.caption }]}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.bottom,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 0) + 20,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save expense"
          accessibilityState={{ disabled: saving, busy: saving }}
          disabled={saving}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.save,
            { backgroundColor: theme.accent, opacity: saving ? 0.6 : pressed ? 0.85 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <Text style={{ color: theme.accentText, ...theme.type.button1 }}>Save expense</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Discard"
          onPress={onDiscard}
          style={styles.discard}
        >
          <Text style={{ color: theme.muted, ...theme.type.button1 }}>Discard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%", maxWidth: 430, alignSelf: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  retake: { minWidth: 48, alignItems: "flex-end" },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  summary: { flexDirection: "row", alignItems: "center", gap: 14 },
  thumb: { width: 56, height: 72, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
  meta: { flex: 1, gap: 4, alignItems: "flex-start" },
  merchant: { alignSelf: "stretch", padding: 0, minHeight: 24 },
  dateInput: { padding: 0, minWidth: 100 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 2,
    borderRadius: 40,
  },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  amountText: { flexShrink: 1 },
  amountInput: { flexShrink: 1, minWidth: 120, padding: 0 },
  edit: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { marginHorizontal: -24, paddingLeft: 24 },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 8,
    borderRadius: 40,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  warning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 16,
  },
  card: { padding: 6, borderRadius: 24 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  itemAmountInput: { minWidth: 80, textAlign: "right", padding: 0 },
  more: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  noteInput: { flex: 1, padding: 0 },
  bottom: { borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 24 },
  save: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  discard: { height: 44, alignItems: "center", justifyContent: "center" },
});
