import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "@/components/Text";
import { useTheme } from "@/theme/Theme";

export function Button({
  label,
  variant = "primary",
  style,
  ...props
}: PressableProps & { label: string; variant?: "primary" | "ghost" | "danger" }) {
  const theme = useTheme();
  const background = {
    primary: theme.accent,
    ghost: theme.surface,
    danger: theme.danger,
  }[variant];
  const color = variant === "ghost" ? theme.text : theme.accentText;
  const buttonStyle: StyleProp<ViewStyle> = [
    {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: background,
      borderWidth: variant === "ghost" ? 1 : 0,
      borderColor: theme.border,
    },
    style as StyleProp<ViewStyle>,
  ];
  return (
    <Pressable accessibilityRole="button" style={buttonStyle} {...props}>
      <Text style={{ color, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
