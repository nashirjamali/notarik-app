import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";

import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { AddExpenseForm, emptyDraft, type ExpenseDraft } from "@/features/AddExpenseForm";
import { ApiError, type FieldError } from "@/lib/api";
import { createTransaction } from "@/lib/client";
import type { TransactionInput, TransactionPage } from "@/lib/types";
import { useTheme } from "@/theme/Theme";

export default function AddScreen() {
  const theme = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const [draft] = useState<ExpenseDraft>(emptyDraft());
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);
  const mutation = useMutation({
    mutationFn: (input: TransactionInput) => createTransaction(input),
    onSuccess: (created) => {
      const month = created.date.slice(0, 7);
      client.setQueryData<{ pages: TransactionPage[]; pageParams: (string | null)[] }>(
        ["transactions", "list", month],
        (current) => {
          const page = { items: [created], next_cursor: null };
          if (!current) return { pages: [page], pageParams: [null] };
          const [first, ...rest] = current.pages;
          return {
            ...current,
            pages: [{ ...first, items: [created, ...first.items] }, ...rest],
          };
        },
      );
      void client.invalidateQueries({ queryKey: ["transactions"] });
      router.replace(`/transactions/${created.id}`);
    },
    onError: (error) => {
      setServerErrors(error instanceof ApiError ? error.details : []);
    },
  });
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Text variant="display">Add expense</Text>
        <AddExpenseForm
          initial={draft}
          serverErrors={serverErrors}
          onSubmit={async (input) => {
            await mutation.mutateAsync(input);
          }}
        />
      </ScrollView>
    </Screen>
  );
}
