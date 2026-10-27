import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { CategoryIcon } from "@/components/CategoryIcon";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { getBudget, getCategoryBudgets, getRecap } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { currentMonth } from "@/lib/months";
import { TopBar } from "@/components/TopBar";
import { useTheme } from "@/theme/Theme";
import { categoryLabels } from "@/theme/tokens";
import AvatarMark from "../../assets/svg/chat-avatar-mark.svg";

const RING = 112;
const STROKE = 12;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function BudgetRing({ percent, color, track }: { percent: number | null; color: string; track: string }) {
  const filled = Math.min(Math.max(percent ?? 0, 0), 100) / 100;
  return (
    <Svg width={RING} height={RING}>
      <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke={track} strokeWidth={STROKE} fill="none" />
      {filled > 0 ? (
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE * filled} ${CIRCUMFERENCE}`}
          rotation={-90}
          originX={RING / 2}
          originY={RING / 2}
        />
      ) : null}
    </Svg>
  );
}

export default function RecapScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(currentMonth);
  const recap = useQuery({ queryKey: ["transactions", "recap", month], queryFn: () => getRecap(month) });
  const budget = useQuery({ queryKey: ["transactions", "budget", month], queryFn: () => getBudget(month) });
  const categories = useQuery({
    queryKey: ["transactions", "budget-categories", month],
    queryFn: () => getCategoryBudgets(month),
  });

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const loading = recap.isPending || budget.isPending || categories.isPending;
  const failed = recap.isError || budget.isError || categories.isError;
  const total = recap.data?.total_minor ?? 0;
  const limit = budget.data?.limit_minor ?? null;
  const percent = limit ? budget.data?.percent_used ?? 0 : null;
  const over = (percent ?? 0) > 100;
  const daysLeft = budget.data?.days_left ?? 0;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar title="Recap & Budget" onBack={back} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.monthRow}>
          <MonthSwitcher month={month} onChange={setMonth} />
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 32 }} /> : null}
        {failed ? (
          <Text style={[styles.message, { color: theme.muted, ...theme.type.caption }]}>
            Could not load this month
          </Text>
        ) : null}

        {recap.data?.insight ? (
          <View style={[styles.insight, { backgroundColor: theme.accentSubtle }]}>
            <View style={[styles.avatar, { backgroundColor: theme.surface }]}>
              <AvatarMark />
            </View>
            <Text style={[styles.insightText, { color: theme.text, ...theme.type.caption }]}>
              {recap.data.insight.text}
            </Text>
          </View>
        ) : null}

        {budget.data && recap.data ? (
          <View style={[styles.card, { backgroundColor: theme.bg }]}>
            <View style={styles.ring}>
              <BudgetRing
                percent={percent}
                color={over ? theme.warning : theme.accent}
                track={theme.surface}
              />
              <View style={styles.ringCenter}>
                {percent == null ? (
                  <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>No budget</Text>
                ) : (
                  <>
                    <Text style={{ color: theme.text, ...theme.type.body2Bold }}>{percent}%</Text>
                    <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>used</Text>
                  </>
                )}
              </View>
            </View>
            <View style={styles.meta}>
              <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>Spent this month</Text>
              <Text style={{ color: theme.text, ...theme.type.body1Bold }}>{formatIdr(total)}</Text>
              <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>
                {limit ? `of ${formatIdr(limit)}` : "No monthly budget set"}
              </Text>
              {daysLeft > 0 ? (
                <View style={[styles.chip, { backgroundColor: theme.surface }]}>
                  <Text style={{ color: theme.text, ...theme.type.captionSmallBold }}>
                    {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={{ color: theme.muted, ...theme.type.captionSmallBold }}>By category</Text>
          {categories.data && categories.data.length === 0 ? (
            <Text style={[styles.message, { color: theme.muted, ...theme.type.caption }]}>
              No spending this month yet
            </Text>
          ) : null}
          {categories.data?.map((row) => {
            const isOver = (row.over_minor ?? 0) > 0;
            const ratio = row.limit_minor
              ? Math.min(row.spent_minor / row.limit_minor, 1)
              : total > 0
                ? row.spent_minor / total
                : 0;
            return (
              <View key={row.category} style={styles.category}>
                <CategoryIcon category={row.category} tile={44} icon={32} />
                <View style={styles.categoryBody}>
                  <View style={styles.categoryTop}>
                    <Text style={{ color: theme.text, ...theme.type.captionBold }}>
                      {categoryLabels[row.category]}
                    </Text>
                    <View style={styles.amounts}>
                      <Text style={{ color: theme.text, ...theme.type.captionSmallBold }}>
                        {formatIdr(row.spent_minor)}
                      </Text>
                      {isOver ? (
                        <View style={[styles.overChip, { backgroundColor: theme.warningSubtle }]}>
                          <Text style={{ color: theme.warning, ...theme.type.captionSmallBold }}>
                            {formatIdr(row.over_minor ?? 0)} over
                          </Text>
                        </View>
                      ) : row.limit_minor ? (
                        <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>
                          of {formatIdr(row.limit_minor)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={[styles.track, { backgroundColor: theme.bg }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${Math.round(ratio * 100)}%`,
                          backgroundColor: isOver ? theme.warning : theme.category[row.category],
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 0) + 24 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit budgets"
          onPress={() => router.push({ pathname: "/edit-budgets", params: { month } })}
          style={[styles.edit, { backgroundColor: theme.bg }]}
        >
          <Text style={{ color: theme.text, ...theme.type.button1 }}>Edit budgets</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 16 },
  monthRow: { alignItems: "center" },
  message: { textAlign: "center", marginTop: 16 },
  insight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  insightText: { flex: 1 },
  card: { flexDirection: "row", alignItems: "center", gap: 20, padding: 20, borderRadius: 24 },
  ring: { width: RING, height: RING },
  ringCenter: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  meta: { flex: 1, gap: 2, minWidth: 0 },
  chip: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 40 },
  section: { gap: 4 },
  category: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  categoryBody: { flex: 1, gap: 8, minWidth: 0 },
  categoryTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  amounts: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  overChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 40 },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  bottom: { paddingHorizontal: 24, paddingTop: 12 },
  edit: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
});
