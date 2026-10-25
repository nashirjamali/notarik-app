import { Text } from "@/components/Text";
import { formatIdr } from "@/lib/money";

export function Money({ minor }: { minor: number }) {
  return (
    <Text
      variant="title"
      style={{ fontVariant: ["tabular-nums"], fontFamily: undefined }}
    >
      {formatIdr(minor)}
    </Text>
  );
}
