import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { ApiError } from "@/lib/api";
import { getBudget, getCategoryBudgets, putBudget, putCategoryBudget } from "@/lib/client";
import { formatIdr, parseAmount } from "@/lib/money";
import { currentMonth, monthLabel } from "@/lib/months";
import { useTheme } from "@/theme/Theme";
import { categories, categoryLabels, type Category } from "@/theme/tokens";

// Web only: the border already shows focus, so drop the browser ring.
const noOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;

export default function EditBudgetsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const params = useLocalSearchParams<{ month?: string }>();
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth();
  const budget = useQuery({ queryKey: ["transactions", "budget", month], queryFn: () => getBudget(month) });
  const rows = useQuery({
    queryKey: ["transactions", "budget-categories", month],
    queryFn: () => getCategoryBudgets(month),
  });

  // Only what the person typed is kept here; a field they did not touch shows what is saved.
  // An empty string is an edit too: it clears the limit.
  const [totalEdit, setTotalEdit] = useState<string | null>(null);
  const [limitEdits, setLimitEdits] = useState<Partial<Record<Category, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loaded = budget.data != null && rows.data != null;
  const savedTotal = budget.data?.limit_minor ?? null;
  const savedLimit = (category: Category) =>
    rows.data?.find((row) => row.category === category)?.limit_minor ?? null;
  const total = totalEdit ?? (savedTotal ? String(savedTotal) : "");
  const limitText = (category: Category) =>
    limitEdits[category] ?? (savedLimit(category) != null ? String(savedLimit(category)) : "");

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace("/recap");
  }

  async function save(close: () => void) {
    if (saving || !loaded) return;
    // Empty means no limit; anything else has to be an amount.
    const parsedTotal = total.trim() === "" ? 0 : parseAmount(total);
    if (parsedTotal == null) {
      setError("Enter the monthly budget like 4000000 or 4jt");
      return;
    }
    const changes: { category: Category; value: number | null }[] = [];
    for (const category of categories) {
      const raw = limitText(category).trim();
      const value = raw === "" ? null : parseAmount(raw);
      if (raw !== "" && value == null) {
        setError(`Enter ${categoryLabels[category]} like 500000 or 500rb`);
        return;
      }
      if (value !== savedLimit(category)) changes.push({ category, value });
    }
    setError(null);
    setSaving(true);
    try {
      if (parsedTotal !== (savedTotal ?? 0)) await putBudget(month, parsedTotal);
      for (const change of changes) await putCategoryBudget(month, change.category, change.value);
      await client.invalidateQueries({ queryKey: ["transactions"] });
      close();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not reach the API");
      setSaving(false);
    }
  }

  const input = [styles.input, { backgroundColor: theme.bg, color: theme.text, ...theme.type.caption }, noOutline];

  return (
    <BottomSheet
      title="Edit budgets"
      subtitle={monthLabel(month)}
      onClosed={leave}
      gap={14}
      footer={
        loaded
          ? ({ close }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save budgets"
                accessibilityState={{ busy: saving }}
                onPress={() => void save(close)}
                style={[styles.save, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}
              >
                {saving ? (
                  <ActivityIndicator color={theme.accentText} />
                ) : (
                  <Text style={{ color: theme.accentText, ...theme.type.button1 }}>Save budgets</Text>
                )}
              </Pressable>
            )
          : undefined
      }
    >
      {loaded ? (
        <>
          <View style={styles.field}>
            <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>Monthly budget</Text>
            <TextInput
              accessibilityLabel="Monthly budget"
              keyboardType="numbers-and-punctuation"
              placeholder="No limit"
              placeholderTextColor={theme.muted}
              value={total}
              onChangeText={setTotalEdit}
              style={input}
            />
          </View>
          <Text style={{ color: theme.muted, ...theme.type.captionSmallBold }}>By category</Text>
          {categories.map((category) => {
            const raw = limitText(category);
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
                  onChangeText={(value) => setLimitEdits((current) => ({ ...current, [category]: value }))}
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
        </>
      ) : (
        <ActivityIndicator style={styles.loading} />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  input: { height: 48, borderRadius: 16, paddingHorizontal: 16, padding: 0 },
  save: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  loading: { marginVertical: 32 },
});
