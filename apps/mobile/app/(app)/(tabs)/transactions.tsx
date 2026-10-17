import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { listTransactions } from "@/lib/client";
import { groupByDay } from "@/lib/group";
import { formatIdr } from "@/lib/money";
import type { Transaction } from "@/lib/types";
import { useTheme } from "@/theme/Theme";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, value - 1 + delta, 1));
  return next.toISOString().slice(0, 7);
}

export default function TransactionsScreen() {
  const theme = useTheme();
  const [month, setMonth] = useState(currentMonth);
  const query = useInfiniteQuery({
    queryKey: ["transactions", "list", month],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      return listTransactions({ month, cursor: pageParam, limit: 20 });
    },
    getNextPageParam: (page) => page.next_cursor,
  });
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const groups = groupByDay(rows);
  return (
    <Screen>
      <FlatList
        data={groups}
        keyExtractor={(group) => group.date}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="display">Transactions</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
              <Button label="Previous month" variant="ghost" onPress={() => setMonth(shiftMonth(month, -1))} />
              <Text>{month}</Text>
              <Button label="Next month" variant="ghost" onPress={() => setMonth(shiftMonth(month, 1))} />
            </View>
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <Text variant="muted">Loading</Text>
          ) : query.isError ? (
            <Text variant="muted">Could not load transactions</Text>
          ) : (
            <Text variant="muted">No expenses this month</Text>
          )
        }
        renderItem={({ item: group }) => (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label">{group.date}</Text>
            {group.items.map((row: Transaction) => (
              <Link key={row.id} href={`/transactions/${row.id}`} asChild>
                <Pressable>
                  <Card style={{ gap: theme.spacing.xs }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: theme.category[row.category],
                        }}
                      />
                      <Text style={{ flex: 1 }}>{row.merchant}</Text>
                      <Text>{formatIdr(row.total_minor)}</Text>
                    </View>
                  </Card>
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      />
    </Screen>
  );
}
