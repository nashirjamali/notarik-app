import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/Theme";

/** A small bottom sheet that shows a few lines of read-only text. */
export function InfoSheet({
  visible,
  title,
  lines,
  onClose,
}: {
  visible: boolean;
  title: string;
  lines: string[];
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
          {lines.map((line) => (
            <Text key={line} style={{ color: theme.muted, ...theme.type.caption }}>
              {line}
            </Text>
          ))}
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
    padding: 24,
    paddingBottom: 40,
    gap: 12,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
});
