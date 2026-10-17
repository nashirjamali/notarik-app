import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { AddExpenseForm, type ExpenseDraft } from "@/features/AddExpenseForm";
import { ApiError, type FieldError } from "@/lib/api";
import { deleteTransaction, getTransaction, updateTransaction } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import type { TransactionInput, TransactionPage } from "@/lib/types";
import { useTheme } from "@/theme/Theme";

export default function TransactionDetail() {
  const theme = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);
  const query = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => getTransaction(id),
  });
  const update = useMutation({
    mutationFn: (input: TransactionInput) => updateTransaction(id, input),
    onSuccess: (saved) => {
      client.setQueryData(["transaction", id], saved);
      void client.invalidateQueries({ queryKey: ["transactions"] });
      setEditing(false);
    },
    onError: (error) => setServerErrors(error instanceof ApiError ? error.details : []),
  });
  const remove = useMutation({
    mutationFn: () => deleteTransaction(id),
    onSuccess: () => {
      client.setQueriesData<{ pages: TransactionPage[] }>(
        { queryKey: ["transactions", "list"] },
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((row) => row.id !== id),
                })),
              }
            : current,
      );
      void client.invalidateQueries({ queryKey: ["transactions"] });
      router.replace("/transactions");
    },
  });
  const row = query.data;
  const draft: ExpenseDraft | undefined = row
    ? {
        merchant: row.merchant,
        date: row.date,
        total: String(row.total_minor),
        category: row.category,
        items: row.items.map((item) => ({
          name: item.name,
          amount: String(item.line_total_minor),
        })),
      }
    : undefined;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Button label="Back" variant="ghost" onPress={() => router.replace("/transactions")} />
        {query.isPending ? <Text variant="muted">Loading</Text> : null}
        {query.isError ? <Text variant="muted">Transaction not found</Text> : null}
        {row && !editing ? (
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="display">{row.merchant}</Text>
            <Text>{formatIdr(row.total_minor)}</Text>
            <Text variant="muted">
              {row.date} · {row.category}
            </Text>
            {row.items.map((item) => (
              <Text key={item.id}>
                {item.name} · {formatIdr(item.line_total_minor)}
              </Text>
            ))}
            <Button label="Edit" variant="ghost" onPress={() => setEditing(true)} />
            {confirming ? (
              <Button label="Confirm delete" variant="danger" onPress={() => void remove.mutateAsync()} />
            ) : (
              <Button label="Delete" variant="ghost" onPress={() => setConfirming(true)} />
            )}
          </View>
        ) : null}
        {row && editing && draft ? (
          <AddExpenseForm
            initial={draft}
            submitLabel="Save changes"
            serverErrors={serverErrors}
            onSubmit={async (input) => {
              await update.mutateAsync(input);
            }}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
