import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Toggle } from "@/components/Toggle";
import { formatIdr, parseAmount } from "@/lib/money";
import { dateLabel } from "@/lib/receipt";
import { rowTitle, type Row } from "@/lib/quickAddRows";
import { useTheme } from "@/theme/Theme";
import { categoryLabels } from "@/theme/tokens";
import Mark from "../../assets/svg/review-mark.svg";
import Close from "../../assets/svg/sheet-x.svg";

const rice = require("../../assets/icons/3d-rice.png");

type Props = {
  rows: Row[];
  /** Save everything as one expense with the rows as its items. */
  asOne: boolean;
  onAsOne: (value: boolean) => void;
  onPickCategory: (key: string) => void;
  onRemove: (key: string) => void;
  onAmount: (key: string, total: number | null) => void;
};

/** The "Notarik understood N expenses" card of Quick add: one line per expense. */
export function QuickAddRows({ rows, asOne, onAsOne, onPickCategory, onRemove, onAmount }: Props) {
  const theme = useTheme();
  const total = rows.reduce((sum, row) => sum + (row.total ?? 0), 0);
  const caption = { color: theme.muted, ...theme.type.captionSmall };

  return (
    <View style={[styles.card, { backgroundColor: theme.bg }]}>
      <View style={styles.head}>
        <View style={styles.label}>
          <Mark />
          <Text style={{ color: theme.accent, ...theme.type.captionSmallBold }}>
            Notarik understood {rows.length} expenses
          </Text>
        </View>
        <Text style={{ color: theme.text, ...theme.type.captionBold }}>{formatIdr(total)}</Text>
      </View>

      <View style={styles.list}>
        {rows.map((row) => (
          <Line
            key={row.key}
            row={row}
            onPickCategory={() => onPickCategory(row.key)}
            onRemove={() => onRemove(row.key)}
            onAmount={(value) => onAmount(row.key, value)}
          />
        ))}
      </View>

      <View style={[styles.switchRow, { borderTopColor: theme.border }]}>
        <View style={styles.switchText}>
          <Text style={{ color: theme.text, ...theme.type.captionBold }}>Save as one expense</Text>
          <Text style={caption}>
            {asOne ? "One expense with each line as an item" : `${rows.length} separate expenses`}
          </Text>
        </View>
        <Toggle label="Save as one expense" value={asOne} onChange={onAsOne} />
      </View>
    </View>
  );
}

function Line({
  row,
  onPickCategory,
  onRemove,
  onAmount,
}: {
  row: Row;
  onPickCategory: () => void;
  onRemove: () => void;
  onAmount: (total: number | null) => void;
}) {
  const theme = useTheme();
  const [typed, setTyped] = useState("");
  const title = rowTitle(row);
  const missing = row.total == null;
  // The words stay visible under a place that took the title; a date shows only when it is not today.
  const day = dateLabel(row.date);
  const subtitle = [
    row.merchant && row.description ? row.description : null,
    categoryLabels[row.category],
    day === "Today" ? null : day,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.line}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Change category of ${title}`}
        onPress={onPickCategory}
        style={styles.lineMain}
      >
        <View style={[styles.tile, { backgroundColor: theme.surface }]}>
          {row.category === "Dining" ? (
            <Image source={rice} style={styles.rice} resizeMode="contain" />
          ) : (
            <View style={[styles.dot, { backgroundColor: theme.category[row.category] }]} />
          )}
        </View>
        <View style={styles.meta}>
          <Text numberOfLines={1} style={{ color: theme.text, ...theme.type.captionBold }}>
            {title}
          </Text>
          <Text numberOfLines={1} style={{ color: theme.muted, ...theme.type.captionSmall }}>
            {subtitle}
          </Text>
        </View>
      </Pressable>

      {missing ? (
        <TextInput
          accessibilityLabel={`Amount of ${title}`}
          placeholder="Add amount"
          placeholderTextColor={theme.danger}
          keyboardType="numeric"
          autoCorrect={false}
          value={typed}
          onChangeText={(value) => {
            setTyped(value);
            onAmount(parseAmount(value));
          }}
          style={[styles.amountInput, { borderColor: theme.danger, color: theme.text, ...theme.type.captionBold }]}
        />
      ) : (
        <Text style={{ color: theme.text, ...theme.type.captionBold }}>{formatIdr(row.total ?? 0)}</Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${title}`}
        hitSlop={8}
        onPress={onRemove}
        style={[styles.remove, { backgroundColor: theme.surface }]}
      >
        <Close />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 16, gap: 12 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  label: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  list: { gap: 10 },
  line: { flexDirection: "row", alignItems: "center", gap: 10 },
  lineMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rice: { width: 30, height: 30 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  meta: { flex: 1, minWidth: 0 },
  amountInput: {
    width: 104,
    height: 36,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 0,
    textAlign: "right",
  },
  remove: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  switchText: { flex: 1, minWidth: 0 },
});
