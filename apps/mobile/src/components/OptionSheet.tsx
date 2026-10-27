import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/Theme";

export type Option<T extends string> = { value: T; label: string; color?: string };

/** A small bottom sheet that lets someone pick one option from a list. */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option<T>[];
  selected?: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close"
        accessibilityRole="button"
        onPress={onClose}
        style={[styles.scrim, { backgroundColor: theme.scrim }]}
      />
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <Text accessibilityRole="header" style={{ color: theme.text, ...theme.type.body2Bold }}>
            {title}
          </Text>
          {options.map((option) => {
            const active = option.value === selected;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                aria-checked={active}
                onPress={() => onSelect(option.value)}
                style={[styles.option, active && { backgroundColor: theme.bg }]}
              >
                {option.color ? <View style={[styles.dot, { backgroundColor: option.color }]} /> : null}
                <Text style={{ color: theme.text, ...(active ? theme.type.captionBold : theme.type.caption) }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill },
  wrap: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: {
    width: "100%",
    maxWidth: 430,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 4,
  },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginBottom: 12 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
