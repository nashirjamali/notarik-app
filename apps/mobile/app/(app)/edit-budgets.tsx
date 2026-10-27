import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api";
import { getBudget, getCategoryBudgets, putBudget, putCategoryBudget } from "@/lib/client";
import { formatIdr, parseAmount } from "@/lib/money";
import { currentMonth, monthLabel } from "@/lib/months";
import type { Budget, CategoryBudget } from "@/lib/types";
import { useTheme } from "@/theme/Theme";
import { categories, categoryLabels, type Category } from "@/theme/tokens";

// Web only: the border already shows focus, so drop the browser ring.
const noOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;

type Props = {
  month: string;
  budget: Budget;
  rows: CategoryBudget[];
  onClose: () => void;
};

/** The fields start from what is saved. It is only rendered once that has loaded. */
function BudgetForm({ month, budget, rows, onClose }: Props) {
  const theme = useTheme();
  const client = useQueryClient();
  const insets = useSafeAreaInsets();
  const [total, setTotal] = useState(budget.limit_minor ? String(budget.limit_minor) : "");
  const [limits, setLimits] = useState<Partial<Record<Category, string>>>(() => {
    const initial: Partial<Record<Category, string>> = {};
    for (const row of rows) if (row.limit_minor != null) initial[row.category] = String(row.limit_minor);
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    // Empty means no limit; anything else has to be an amount.
    const parsedTotal = total.trim() === "" ? 0 : parseAmount(total);
    if (parsedTotal == null) {
      setError("Enter the monthly budget like 4000000 or 4jt");
      return;
    }
    const changes: { category: Category; value: number | null }[] = [];
    for (const category of categories) {
      const raw = (limits[category] ?? "").trim();
      const saved = rows.find((row) => row.category === category)?.limit_minor ?? null;
      const value = raw === "" ? null : parseAmount(raw);
      if (raw !== "" && value == null) {
        setError(`Enter ${categoryLabels[category]} like 500000 or 500rb`);
        return;
      }
      if (value !== saved) changes.push({ category, value });
    }
    setError(null);
    setSaving(true);
    try {
      if (parsedTotal !== (budget.limit_minor ?? 0)) await putBudget(month, parsedTotal);
      for (const change of changes) await putCategoryBudget(month, change.category, change.value);
      await client.invalidateQueries({ queryKey: ["transactions"] });
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not reach the API");
      setSaving(false);
    }
  }

  const input = [styles.input, { backgroundColor: theme.bg, color: theme.text, ...theme.type.caption }, noOutline];

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text accessibilityRole="header" style={{ color: theme.text, ...theme.type.body1Bold }}>
              Edit budgets
            </Text>
            <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>{monthLabel(month)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: theme.bg }]}
          >
            <Text style={{ color: theme.text, ...theme.type.captionBold }}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>Monthly budget</Text>
          <TextInput
            accessibilityLabel="Monthly budget"
            keyboardType="numbers-and-punctuation"
            placeholder="No limit"
            placeholderTextColor={theme.muted}
            value={total}
            onChangeText={setTotal}
            style={input}
          />
        </View>
        <Text style={{ color: theme.muted, ...theme.type.captionSmallBold }}>By category</Text>
        {categories.map((category) => {
          const raw = limits[category] ?? "";
          const parsed = raw === "" ? null : parseAmount(raw);
          return (
            <View key={category} style={styles.field}>
              <View style={styles.label}>
                <View style={[styles.dot, { backgroundColor: theme.category[category] }]} />
                <Text style={{ color: theme.text, ...theme.type.caption }}>{categoryLabels[category]}</Text>
              </View>
              <TextInput
                accessibilityLabel={`${categoryLabels[category]} budget`}
                keyboardType="numbers-and-punctuation"
                placeholder="No limit"
                placeholderTextColor={theme.muted}
                value={raw}
                onChangeText={(value) => setLimits((current) => ({ ...current, [category]: value }))}
                style={input}
              />
              {parsed != null ? (
                <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>{formatIdr(parsed)}</Text>
              ) : null}
            </View>
          );
        })}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: theme.danger, ...theme.type.caption }}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 0) + 24 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save budgets"
          accessibilityState={{ busy: saving }}
          onPress={() => void save()}
          style={[styles.save, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <Text style={{ color: theme.accentText, ...theme.type.button1 }}>Save budgets</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

export default function EditBudgetsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ month?: string }>();
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth();
  const budget = useQuery({ queryKey: ["transactions", "budget", month], queryFn: () => getBudget(month) });
  const rows = useQuery({
    queryKey: ["transactions", "budget-categories", month],
    queryFn: () => getCategoryBudgets(month),
  });

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/recap");
  }

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={close}
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.avoid}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { height: Math.min(680, height - 120), backgroundColor: theme.surface }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          {budget.data && rows.data ? (
            <BudgetForm month={month} budget={budget.data} rows={rows.data} onClose={close} />
          ) : (
            <ActivityIndicator style={{ marginTop: 48 }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  avoid: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 430, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden" },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginTop: 8 },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  field: { gap: 6 },
  label: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  input: { height: 48, borderRadius: 16, paddingHorizontal: 16, padding: 0 },
  bottom: { paddingHorizontal: 24, paddingTop: 12 },
  save: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
});
