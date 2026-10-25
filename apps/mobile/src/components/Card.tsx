import { View, type ViewProps } from "react-native";

import { useTheme } from "@/theme/Theme";

export function Card({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.border,
        },
        style,
      ]}
    />
  );
}
