import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useDeferredValue, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryIcon } from "@/components/CategoryIcon";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { getRecap, listTransactions } from "@/lib/client";
import { groupWithTotals } from "@/lib/group";
import { formatIdr } from "@/lib/money";
import { currentMonth, dayHeading, timeOf } from "@/lib/months";
import { localToday } from "@/lib/receipt";
import type { Transaction } from "@/lib/types";
import { TopBar, TopBarButton } from "@/components/TopBar";
import { useTheme } from "@/theme/Theme";
import { categoryLabels, type Category } from "@/theme/tokens";
import Mark from "../../../assets/svg/review-mark.svg";
import Search from "../../../assets/svg/list-search.svg";

const FILTERS: Category[] = ["Dining", "Groceries", "Transport", "Bills", "Shopping", "Other"];

// Web only: the border already shows focus, so drop the browser ring.
const noOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;

export default function TransactionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth);
  const [category, setCategory] = useState<Category | null>(null);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const term = useDeferredValue(search.trim());

  const query = useInfiniteQuery({
    queryKey: ["transactions", "list", month, category, term],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      listTransactions({ month, category: category ?? undefined, q: term, cursor: pageParam, limit: 50 }),
    getNextPageParam: (page) => page.next_cursor,
  });
  const recap = useQuery({ queryKey: ["transactions", "recap", month], queryFn: () => getRecap(month) });
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const groups = groupWithTotals(rows);
  const today = localToday();
  const filtered = category != null || term !== "";

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar
        align="start"
        title="Transactions"
        right={
          <TopBarButton
            label={searching ? "Close search" : "Search"}
            onPress={() => {
              setSearching((value) => !value);
              if (searching) setSearch("");
            }}
          >
            <Search />
          </TopBarButton>
        }
      />

      {searching ? (
        <View style={[styles.searchBox, { backgroundColor: theme.bg }]}>
          <TextInput
            accessibilityLabel="Search expenses"
            autoFocus
            placeholder="Search merchant, note or item"
            placeholderTextColor={theme.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.text, ...theme.type.caption }, noOutline]}
          />
        </View>
      ) : null}

      <View style={styles.monthRow}>
        <MonthSwitcher month={month} onChange={setMonth} />
        <View style={styles.total}>
          <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>Spent</Text>
          <Text style={{ color: theme.text, ...theme.type.captionBold }}>
            {formatIdr(recap.data?.total_minor ?? 0)}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chips}
      >
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel="All"
          aria-checked={category === null}
          onPress={() => setCategory(null)}
          style={[
            styles.chip,
            category === null
              ? { backgroundColor: theme.text, borderColor: theme.text }
              : { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text
            style={{
              color: category === null ? theme.surface : theme.text,
              ...(category === null ? theme.type.captionBold : theme.type.caption),
            }}
          >
            All
          </Text>
        </Pressable>
        {FILTERS.map((name) => {
          const active = category === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityLabel={categoryLabels[name]}
              aria-checked={active}
              onPress={() => setCategory(active ? null : name)}
              style={[
                styles.chip,
                styles.chipWithDot,
                active
                  ? { backgroundColor: theme.category[name], borderColor: theme.category[name] }
                  : { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View
                style={[styles.dot, { backgroundColor: active ? theme.accentText : theme.category[name] }]}
              />
              <Text
                style={{
                  color: active ? theme.accentText : theme.text,
                  ...(active ? theme.type.captionBold : theme.type.caption),
                }}
              >
                {categoryLabels[name]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={groups}
        keyExtractor={(group) => group.date}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator style={{ marginTop: 32 }} />
          ) : query.isError ? (
            <Text style={[styles.empty, { color: theme.muted, ...theme.type.caption }]}>
              Could not load transactions
            </Text>
          ) : (
            <Text style={[styles.empty, { color: theme.muted, ...theme.type.caption }]}>
              {filtered ? "No matching expenses" : "No expenses this month"}
            </Text>
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ marginTop: 12 }} /> : undefined}
        renderItem={({ item: group }) => (
          <View style={styles.day}>
            <View style={styles.dayHeader}>
              <Text style={{ color: theme.muted, ...theme.type.captionSmallBold }}>
                {dayHeading(group.date, today)}
              </Text>
              <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>{formatIdr(group.total)}</Text>
            </View>
            {group.items.map((row: Transaction) => (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityLabel={`${row.merchant}, ${formatIdr(row.total_minor)}`}
                onPress={() => router.push(`/transactions/${row.id}`)}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
              >
                <CategoryIcon category={row.category} />
                <View style={styles.meta}>
                  <View style={styles.titleRow}>
                    <Text numberOfLines={1} style={[{ color: theme.text, ...theme.type.captionBold }, styles.merchant]}>
                      {row.merchant}
                    </Text>
                    {row.source === "photo" || row.source === "pdf" ? (
                      <View style={[styles.badge, { backgroundColor: theme.accentSubtle }]}>
                        <Mark width={12} height={10.235} />
                        <Text style={{ color: theme.accent, ...theme.type.captionSmallBold }}>From receipt</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>
                    {categoryLabels[row.category]} · {timeOf(row.created_at)}
                  </Text>
                </View>
                <Text style={{ color: theme.text, ...theme.type.captionBold }}>{formatIdr(row.total_minor)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchBox: { marginHorizontal: 24, marginBottom: 12, paddingHorizontal: 16, borderRadius: 16 },
  searchInput: { height: 44, padding: 0 },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  total: { alignItems: "flex-end" },
  // A fixed height: on iOS a horizontal ScrollView above a FlatList is otherwise squeezed.
  chipScroll: { flexGrow: 0, flexShrink: 0, height: 52 },
  chips: { gap: 8, paddingHorizontal: 24, paddingBottom: 12 },
  chip: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 40,
    borderWidth: 1,
  },
  chipWithDot: { gap: 8, paddingLeft: 12, paddingRight: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  list: { paddingHorizontal: 24, paddingBottom: 140, gap: 20 },
  empty: { textAlign: "center", marginTop: 32 },
  day: { width: "100%" },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  meta: { flex: 1, gap: 2, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  merchant: { flexShrink: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 2,
    borderRadius: 40,
  },
});
