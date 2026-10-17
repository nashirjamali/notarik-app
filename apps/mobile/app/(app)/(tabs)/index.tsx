import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { listTransactions } from "@/lib/client";
import { useTheme } from "@/theme/Theme";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function HomeScreen() {
  const theme = useTheme();
  const month = currentMonth();
  const query = useQuery({
    queryKey: ["transactions", "summary", month],
    queryFn: () => listTransactions({ month, limit: 100 }),
  });
  const total = (query.data?.items ?? []).reduce((sum, row) => sum + row.total_minor, 0);
  return (
    <Screen style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
      <Text variant="display">This month</Text>
      {query.isPending ? <Text variant="muted">Loading</Text> : null}
      {query.isError ? <Text variant="muted">Could not load this month</Text> : null}
      {query.data ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Money minor={total} />
          <Text variant="muted">{query.data.items.length} expenses</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
