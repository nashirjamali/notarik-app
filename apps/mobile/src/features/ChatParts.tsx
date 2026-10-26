import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { monthLabel, splitAmounts, type PendingAction } from "@/lib/chat";
import { formatIdr, parseAmount } from "@/lib/money";
import { dateLabel } from "@/lib/receipt";
import { useTheme } from "@/theme/Theme";
import { categories, categoryLabels, type Category } from "@/theme/tokens";
import AvatarMark from "../../assets/svg/chat-avatar-mark.svg";

const coffee = require("../../assets/icons/3d-coffee.png");
const rice = require("../../assets/icons/3d-rice.png");

export type CardState = "open" | "saving" | "approved" | "rejected" | "expired";

export function Avatar() {
  const theme = useTheme();
  return (
    <View style={[styles.avatar, { backgroundColor: theme.accentSubtle }]}>
      <AvatarMark />
    </View>
  );
}

export function AiBubble({ text, children }: { text?: string; children?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.aiRow}>
      <Avatar />
      <View style={styles.aiColumn}>
        {text != null ? (
          <View style={[styles.aiBubble, { backgroundColor: theme.bg }]}>
            <Text style={{ color: theme.text, ...theme.type.body2 }}>
              {splitAmounts(text).map((part, index) =>
                part.amount ? (
                  <Text key={index} style={theme.type.body2Bold}>
                    {part.text}
                  </Text>
                ) : (
                  part.text
                ),
              )}
            </Text>
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

export function UserBubble({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.userRow}>
      <View style={[styles.userBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.text, ...theme.type.body2 }}>{text}</Text>
      </View>
    </View>
  );
}

export function TypingBubble() {
  const theme = useTheme();
  return (
    <AiBubble>
      <View
        accessibilityLabel="Notarik is typing"
        style={[styles.aiBubble, styles.typing, { backgroundColor: theme.bg }]}
      >
        <ActivityIndicator size="small" color={theme.muted} />
      </View>
    </AiBubble>
  );
}

function titleOf(pending: PendingAction): string {
  if (pending.kind === "create_expense") {
    return pending.payload.merchant || pending.payload.items[0]?.name || "Expense";
  }
  if (pending.kind === "delete_expense") return `Delete ${pending.payload.merchant ?? "this expense"}?`;
  return `${monthLabel(pending.payload.month)} budget`;
}

type CardProps = {
  pending: PendingAction;
  state: CardState;
  at: Date;
  error?: string | null;
  onApprove: () => void;
  onReject: () => void;
  onEdit: (payload: Record<string, unknown>) => void;
};

/** The proposal the assistant wants confirmed; nothing is saved until Save is tapped. */
export function ProposalCard({ pending, state, at, error, onApprove, onReject, onEdit }: CardProps) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const isExpense = pending.kind === "create_expense";
  const expense = isExpense ? pending.payload : null;
  const title = titleOf(pending);
  const [name, setName] = useState(isExpense ? (expense?.merchant ?? expense?.items[0]?.name ?? "") : "");
  const [amount, setAmount] = useState(
    expense?.total_minor != null ? String(expense.total_minor) : "",
  );
  const [category, setCategory] = useState<Category>(expense?.category ?? "Other");
  const [editError, setEditError] = useState<string | null>(null);

  const total =
    pending.kind === "create_expense"
      ? pending.payload.total_minor
      : pending.kind === "set_budget"
        ? pending.payload.total_minor
        : null;
  const shownCategory = editing ? category : (expense?.category ?? "Other");
  const subtitle = expense?.merchant && expense.items[0]?.name ? expense.items[0].name : null;
  const dateChip = (() => {
    if (!expense?.date) return null;
    const label = dateLabel(expense.date);
    if (label !== "Today") return label;
    const pad = (value: number) => String(value).padStart(2, "0");
    return `Today, ${pad(at.getHours())}:${pad(at.getMinutes())}`;
  })();
  const useCoffee = /\b(kopi|coffee|latte|americano|teh)\b/i.test(title);
  const decided = state === "approved" || state === "rejected" || state === "expired";
  const busy = state === "saving";

  function saveEdit() {
    const parsed = parseAmount(amount);
    if (parsed == null) {
      setEditError("Enter an amount like 25000 or 25rb");
      return;
    }
    setEditError(null);
    onEdit({
      merchant: name.trim() || null,
      total_minor: parsed,
      category,
      // The total changed by hand, so the original line items no longer describe it.
      items: [],
    });
  }

  const primaryLabel =
    pending.kind === "create_expense" ? "Save" : pending.kind === "delete_expense" ? "Delete" : "Set budget";
  const secondaryLabel = pending.kind === "create_expense" ? (editing ? "Cancel" : "Edit") : "Cancel";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.tile, { backgroundColor: theme.warningSubtle }]}>
          {isExpense && useCoffee ? (
            <Image source={coffee} style={styles.tileImage} resizeMode="contain" />
          ) : isExpense && shownCategory === "Dining" ? (
            <Image source={rice} style={styles.tileImage} resizeMode="contain" />
          ) : (
            <View style={[styles.bigDot, { backgroundColor: theme.category[shownCategory] }]} />
          )}
        </View>
        <View style={styles.meta}>
          {editing ? (
            <TextInput
              accessibilityLabel="Merchant"
              value={name}
              onChangeText={setName}
              placeholder="Merchant"
              placeholderTextColor={theme.muted}
              autoCorrect={false}
              style={[styles.nameInput, { color: theme.text, ...theme.type.body2Bold }]}
            />
          ) : (
            <Text numberOfLines={1} style={{ color: theme.text, ...theme.type.body2Bold }}>
              {title}
            </Text>
          )}
          {subtitle && !editing ? (
            <Text numberOfLines={1} style={{ color: theme.muted, ...theme.type.captionSmall }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {editing ? (
          <TextInput
            accessibilityLabel="Amount"
            keyboardType="numbers-and-punctuation"
            value={amount}
            onChangeText={setAmount}
            placeholder="Rp 0"
            placeholderTextColor={theme.muted}
            style={[styles.amountInput, { color: theme.text, ...theme.type.body1Bold }]}
          />
        ) : total != null ? (
          <Text style={{ color: theme.text, ...theme.type.body1Bold }}>{formatIdr(total)}</Text>
        ) : null}
      </View>

      {isExpense ? (
        editing ? (
          <View style={styles.chipsWrap}>
            {categories.map((name_) => {
              const selected = name_ === category;
              return (
                <Pressable
                  key={name_}
                  accessibilityRole="radio"
                  accessibilityLabel={categoryLabels[name_]}
                  aria-checked={selected}
                  onPress={() => setCategory(name_)}
                  style={[
                    styles.chip,
                    { backgroundColor: selected ? theme.category[name_] : theme.bg },
                  ]}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: selected ? theme.accentText : theme.category[name_] },
                    ]}
                  />
                  <Text
                    style={{
                      color: selected ? theme.accentText : theme.text,
                      ...theme.type.captionSmallBold,
                    }}
                  >
                    {categoryLabels[name_]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: theme.bg }]}>
              <View style={[styles.dot, { backgroundColor: theme.category[shownCategory] }]} />
              <Text style={{ color: theme.text, ...theme.type.captionSmallBold }}>
                {categoryLabels[shownCategory]}
              </Text>
            </View>
            {dateChip ? (
              <View style={[styles.chip, { backgroundColor: theme.bg }]}>
                <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>{dateChip}</Text>
              </View>
            ) : null}
          </View>
        )
      ) : null}

      {editError || error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger, ...theme.type.captionSmall }}>
          {editError ?? error}
        </Text>
      ) : null}

      {decided ? (
        <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>
          {state === "approved" ? "Saved" : state === "rejected" ? "Not saved" : "Replaced by a newer request"}
        </Text>
      ) : (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            disabled={busy}
            onPress={() => {
              if (pending.kind !== "create_expense") onReject();
              else setEditing((value) => !value);
            }}
            style={[styles.action, { backgroundColor: theme.bg, opacity: busy ? 0.6 : 1 }]}
          >
            <Text style={{ color: theme.text, ...theme.type.button2 }}>{secondaryLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            accessibilityState={{ busy }}
            disabled={busy}
            onPress={() => (editing ? saveEdit() : onApprove())}
            style={[
              styles.action,
              {
                backgroundColor: pending.kind === "delete_expense" ? theme.danger : theme.accent,
                opacity: busy ? 0.6 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <Text style={{ color: theme.accentText, ...theme.type.button2 }}>{primaryLabel}</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  aiRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  aiColumn: { flex: 1, gap: 8, alignItems: "flex-start" },
  aiBubble: { maxWidth: 264, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  typing: { minHeight: 48, justifyContent: "center" },
  userRow: { flexDirection: "row", justifyContent: "flex-end" },
  userBubble: {
    maxWidth: 264,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
  },
  card: {
    alignSelf: "stretch",
    padding: 16,
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#141717",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tile: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tileImage: { width: 40, height: 40 },
  bigDot: { width: 20, height: 20, borderRadius: 10 },
  meta: { flex: 1, gap: 2, minWidth: 0 },
  nameInput: { padding: 0 },
  amountInput: { minWidth: 100, textAlign: "right", padding: 0 },
  chips: { flexDirection: "row", gap: 8 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 40,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: "row", gap: 8 },
  action: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
