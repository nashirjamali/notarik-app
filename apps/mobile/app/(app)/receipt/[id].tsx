import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { AddExpenseForm } from "@/features/AddExpenseForm";
import { ApiError, type FieldError } from "@/lib/api";
import { confirmReceipt, getReceipt } from "@/lib/client";
import { draftToForm } from "@/lib/receipt";
import type { TransactionInput } from "@/lib/types";
import { useTheme } from "@/theme/Theme";

export default function ReceiptReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);
  const run = useQuery({ queryKey: ["receipt", id], queryFn: () => getReceipt(id) });
  const confirm = useMutation({
    mutationFn: (input: TransactionInput) => confirmReceipt(id, input),
    onSuccess: (saved) => {
      void client.invalidateQueries({ queryKey: ["transactions"] });
      router.replace(`/transactions/${saved.transaction_id}`);
    },
    onError: (error) => setServerErrors(error instanceof ApiError ? error.details : []),
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Text variant="display">Check your receipt</Text>
        {run.isPending ? <ActivityIndicator /> : null}
        {run.error ? (
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="muted">Could not load this receipt.</Text>
            <Button label="Try again" variant="ghost" onPress={() => void run.refetch()} />
          </View>
        ) : null}
        {run.data ? (
          <>
            {run.data.issues?.length ? (
              <View style={{ gap: theme.spacing.xs }}>
                <Text variant="label">Please double-check</Text>
                {run.data.issues.map((issue, index) => (
                  // Issue text comes from the validator, but is shown as plain text only.
                  <Text key={`${issue.code}-${index}`} variant="muted">
                    {issue.detail}
                  </Text>
                ))}
              </View>
            ) : null}
            <AddExpenseForm
              initial={draftToForm(run.data.draft)}
              serverErrors={serverErrors}
              submitLabel="Save expense"
              onSubmit={async (input) => {
                await confirm.mutateAsync(input);
              }}
            />
          </>
        ) : null}
        <Button label="Scan another" variant="ghost" onPress={() => router.replace("/snap")} />
      </ScrollView>
    </Screen>
  );
}
