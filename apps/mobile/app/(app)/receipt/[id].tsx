import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ReceiptReview } from "@/features/ReceiptReview";
import { API_URL, ApiError, type FieldError } from "@/lib/api";
import { confirmReceipt, getReceipt } from "@/lib/client";
import { getSession } from "@/lib/session";
import type { TransactionInput } from "@/lib/types";
import { useTheme } from "@/theme/Theme";

export default function ReceiptReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const run = useQuery({ queryKey: ["receipt", id], queryFn: () => getReceipt(id) });
  const confirm = useMutation({
    mutationFn: (input: TransactionInput) => confirmReceipt(id, input),
    onSuccess: (saved) => {
      void client.invalidateQueries({ queryKey: ["transactions"] });
      router.replace(`/transactions/${saved.transaction_id}`);
    },
    onError: (error) => {
      setServerErrors(error instanceof ApiError ? error.details : []);
      setSaveError(error instanceof ApiError ? error.message : "Could not reach the API");
    },
  });

  const home = () => router.dismissTo("/");
  const token = getSession()?.accessToken;

  if (!run.data) {
    return (
      <Screen style={{ padding: theme.spacing.lg, gap: theme.spacing.lg, justifyContent: "center" }}>
        {run.error ? (
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="muted">Could not load this receipt.</Text>
            <Button label="Try again" variant="ghost" onPress={() => void run.refetch()} />
            <Button label="Back to home" variant="ghost" onPress={home} />
          </View>
        ) : (
          <ActivityIndicator />
        )}
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <ReceiptReview
        // Re-initialise the form only if the draft itself changes, not on every refetch.
        key={JSON.stringify(run.data.draft)}
        run={run.data}
        imageSource={
          run.data.content_type.startsWith("image/") && token
            ? { uri: `${API_URL}/receipts/${id}/image`, headers: { Authorization: `Bearer ${token}` } }
            : undefined
        }
        serverErrors={serverErrors}
        saving={confirm.isPending}
        onSubmit={async (input) => {
          setSaveError(null);
          await confirm.mutateAsync(input).catch(() => undefined);
        }}
        onRetake={() => router.replace("/snap")}
        onDiscard={home}
        onBack={() => (router.canGoBack() ? router.back() : home())}
      />
      {saveError ? (
        <Text
          accessibilityRole="alert"
          variant="muted"
          style={{ position: "absolute", left: 24, right: 24, bottom: 150, color: theme.danger, textAlign: "center" }}
        >
          {saveError}
        </Text>
      ) : null}
    </View>
  );
}
