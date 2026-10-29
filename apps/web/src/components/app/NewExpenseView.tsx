"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/lib/client";
import { useClock } from "@/lib/useClock";
import { TransactionForm } from "./TransactionForm";
import { Card, PageTitle, Skeleton } from "./ui";

export function NewExpenseView() {
  const router = useRouter();
  const client = useQueryClient();
  const clock = useClock();
  const create = useMutation({
    mutationFn: createTransaction,
    onSuccess: async () => {
      // Totals, recap, budget and projection all change with a new expense.
      await client.invalidateQueries();
      router.push("/app/transactions");
    },
  });

  return (
    <>
      <PageTitle>Add expense</PageTitle>
      <Card className="max-w-xl">
        {clock ? (
          <TransactionForm
            today={clock.today}
            submitLabel="Save expense"
            busy={create.isPending}
            error={create.error?.message ?? null}
            onSubmit={(values) => create.mutate({ ...values, items: [] })}
            onCancel={() => router.back()}
          />
        ) : (
          <Skeleton className="h-96" />
        )}
      </Card>
    </>
  );
}
