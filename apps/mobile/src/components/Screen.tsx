import { View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/theme/Theme";

export function Screen({ children, style, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} {...props}>
      <View style={{ flex: 1, alignItems: "center" }}>
        <View style={[{ flex: 1, width: "100%", maxWidth: 430 }, style]}>{children}</View>
      </View>
    </SafeAreaView>
  );
}
