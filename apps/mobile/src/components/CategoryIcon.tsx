import { Image, StyleSheet, View } from "react-native";

import { useTheme } from "@/theme/Theme";
import type { Category } from "@/theme/tokens";

const icons: Partial<Record<Category, number>> = {
  Dining: require("../../assets/icons/3d-coffee.png"),
  Groceries: require("../../assets/icons/3d-groceries.png"),
  Transport: require("../../assets/icons/3d-transport.png"),
  Bills: require("../../assets/icons/3d-bills.png"),
};

/**
 * The 3D icon tile for a category. Shopping and Other have no 3D icon in the design,
 * so they show their colour instead.
 */
export function CategoryIcon({
  category,
  tile = 48,
  icon = 36,
  radius = 14,
}: {
  category: Category;
  tile?: number;
  icon?: number;
  radius?: number;
}) {
  const theme = useTheme();
  const source = icons[category];
  return (
    <View
      style={[
        styles.tile,
        { width: tile, height: tile, borderRadius: radius, backgroundColor: theme.bg },
      ]}
    >
      {source ? (
        <Image source={source} style={{ width: icon, height: icon }} resizeMode="contain" />
      ) : (
        <View
          style={{
            width: icon * 0.5,
            height: icon * 0.5,
            borderRadius: icon * 0.25,
            backgroundColor: theme.category[category],
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center" },
});
