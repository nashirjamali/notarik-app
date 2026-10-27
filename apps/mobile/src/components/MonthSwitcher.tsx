import { Pressable, StyleSheet, Text, View } from "react-native";

import { monthLabel, shiftMonth } from "@/lib/months";
import { useTheme } from "@/theme/Theme";
import ChevronLeft from "../../assets/svg/list-chevron-left.svg";
import ChevronRight from "../../assets/svg/list-chevron-right.svg";

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const theme = useTheme();
  const button = [styles.button, { backgroundColor: theme.bg }];
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        onPress={() => onChange(shiftMonth(month, -1))}
        style={button}
      >
        <ChevronLeft />
      </Pressable>
      <Text accessibilityRole="header" style={{ color: theme.text, ...theme.type.body2Bold }}>
        {monthLabel(month)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next month"
        onPress={() => onChange(shiftMonth(month, 1))}
        style={button}
      >
        <ChevronRight />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  button: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
