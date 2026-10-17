import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { parseAmount, totalsDiffer } from "@/lib/money";
import type { FieldError } from "@/lib/api";
import type { TransactionInput } from "@/lib/types";
import { useTheme } from "@/theme/Theme";
import { categories, type Category } from "@/theme/tokens";

export type ExpenseDraft = {
  merchant: string;
  date: string;
  total: string;
  category: Category;
  items: { name: string; amount: string }[];
};

export function emptyDraft(date = new Date().toISOString().slice(0, 10)): ExpenseDraft {
  return { merchant: "", date, total: "", category: "Dining", items: [] };
}

export function AddExpenseForm({
  initial,
  serverErrors = [],
  submitLabel = "Save",
  onSubmit,
}: {
  initial?: ExpenseDraft;
  serverErrors?: FieldError[];
  submitLabel?: string;
  onSubmit: (value: TransactionInput) => Promise<void>;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState<ExpenseDraft>(initial ?? emptyDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warning, setWarning] = useState<string | null>(null);

  function fieldError(loc: string): string | undefined {
    return errors[loc] ?? serverErrors.find((error) => error.loc === loc)?.message;
  }

  async function submit() {
    const next: Record<string, string> = {};
    if (!draft.merchant.trim()) next.merchant = "Enter a merchant";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) next.date = "Use YYYY-MM-DD";
    const total = parseAmount(draft.total);
    if (total == null) next.total_minor = "Enter an amount like 25000 or 25rb";
    const items: { name: string; line_total_minor: number }[] = [];
    draft.items.forEach((item, index) => {
      if (!item.name.trim()) next[`items.${index}.name`] = "Enter an item name";
      const amount = parseAmount(item.amount);
      if (amount == null) next[`items.${index}.line_total_minor`] = "Enter an item amount";
      if (item.name.trim() && amount != null) {
        items.push({ name: item.name.trim(), line_total_minor: amount });
      }
    });
    setErrors(next);
    if (Object.keys(next).length > 0 || total == null) return;
    setWarning(
      totalsDiffer(total, items.map((item) => ({ lineTotalMinor: item.line_total_minor })))
        ? "Line items don't add up to the total. Both amounts are saved."
        : null,
    );
    await onSubmit({
      merchant: draft.merchant.trim(),
      date: draft.date,
      total_minor: total,
      category: draft.category,
      items,
    });
  }

  const inputStyle = {
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    color: theme.text,
    backgroundColor: theme.bg,
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text variant="label">Merchant</Text>
      <TextInput
        accessibilityLabel="Merchant"
        value={draft.merchant}
        onChangeText={(merchant) => setDraft({ ...draft, merchant })}
        style={inputStyle}
      />
      {fieldError("merchant") ? <Text variant="muted">{fieldError("merchant")}</Text> : null}
      <Text variant="label">Date</Text>
      <TextInput
        accessibilityLabel="Date"
        value={draft.date}
        onChangeText={(date) => setDraft({ ...draft, date })}
        style={inputStyle}
      />
      {fieldError("date") ? <Text variant="muted">{fieldError("date")}</Text> : null}
      <Text variant="label">Category</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
        {categories.map((category) => {
          const selected = draft.category === category;
          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityLabel={category}
              onPress={() => setDraft({ ...draft, category })}
              style={{
                minHeight: 44,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.md,
                justifyContent: "center",
                backgroundColor: selected ? theme.accent : theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: selected ? theme.accentText : theme.text }}>{category}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="label">Total</Text>
      <TextInput
        accessibilityLabel="Total"
        value={draft.total}
        onChangeText={(total) => setDraft({ ...draft, total })}
        style={inputStyle}
      />
      <Text variant="muted">
        The total is what you type. If line items add up differently, both numbers are saved.
      </Text>
      {fieldError("total_minor") ? <Text variant="muted">{fieldError("total_minor")}</Text> : null}
      {warning ? <Text variant="muted">{warning}</Text> : null}
      {draft.items.map((item, index) => (
        <View key={index} style={{ gap: theme.spacing.sm }}>
          <TextInput
            accessibilityLabel="Item name"
            value={item.name}
            onChangeText={(name) => {
              const items = [...draft.items];
              items[index] = { ...item, name };
              setDraft({ ...draft, items });
            }}
            style={inputStyle}
          />
          <TextInput
            accessibilityLabel="Item amount"
            value={item.amount}
            onChangeText={(amount) => {
              const items = [...draft.items];
              items[index] = { ...item, amount };
              setDraft({ ...draft, items });
            }}
            style={inputStyle}
          />
          <Button
            label="Remove item"
            variant="ghost"
            onPress={() =>
              setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })
            }
          />
        </View>
      ))}
      <Button
        label="Add item"
        variant="ghost"
        onPress={() => setDraft({ ...draft, items: [...draft.items, { name: "", amount: "" }] })}
      />
      <Button label={submitLabel} onPress={() => void submit()} />
    </View>
  );
}
