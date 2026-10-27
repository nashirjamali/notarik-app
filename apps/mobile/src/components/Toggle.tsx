import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "@/theme/Theme";

/** The 44 x 26 switch from the Settings design. */
export function Toggle({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onChange?: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      aria-checked={value}
      disabled={disabled}
      onPress={() => onChange?.(!value)}
      style={[
        styles.track,
        { backgroundColor: value ? theme.accent : theme.border, opacity: disabled ? 0.6 : 1 },
        value ? styles.on : styles.off,
      ]}
    >
      <View style={[styles.knob, { backgroundColor: theme.surface }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 13, justifyContent: "center", paddingHorizontal: 3 },
  on: { alignItems: "flex-end" },
  off: { alignItems: "flex-start" },
  knob: { width: 20, height: 20, borderRadius: 10 },
});
