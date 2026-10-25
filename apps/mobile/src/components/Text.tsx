import { Text as NativeText, type TextProps, type TextStyle } from "react-native";

import { useTheme } from "@/theme/Theme";

type Variant = "display" | "title" | "body" | "label" | "muted";

export function Text({
  variant = "body",
  style,
  ...props
}: TextProps & { variant?: Variant }) {
  const theme = useTheme();
  const variantStyle: TextStyle = {
    display: {
      color: theme.text,
      fontSize: theme.type.display,
      fontFamily: "serif",
    },
    title: { color: theme.text, fontSize: theme.type.title, fontWeight: "600" as const },
    body: { color: theme.text, fontSize: theme.type.body },
    label: { color: theme.text, fontSize: theme.type.label, fontWeight: "600" as const },
    muted: { color: theme.muted, fontSize: theme.type.label },
  }[variant];
  return <NativeText {...props} style={[variantStyle, style]} />;
}
