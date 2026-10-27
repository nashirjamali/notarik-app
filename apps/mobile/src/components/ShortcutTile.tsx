import { View, Text, Pressable, StyleSheet, Image, Platform, type ImageSourcePropType } from 'react-native';
import { useTheme } from '@/theme/Theme';

interface ShortcutTileProps {
  label: string;
  icon: ImageSourcePropType;
  tintColor: string;
  onPress?: () => void;
}

/** One of the four equal shortcuts on Home (Figma "Menu Tiles"): a 60 tile and a one line label. */
const web = Platform.OS === 'web';
const webLabel = { whiteSpace: 'nowrap', alignSelf: 'center' } as object;

export function ShortcutTile({ label, icon, tintColor, onPress }: ShortcutTileProps) {
  const theme = useTheme();

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.container}>
      <View
        style={[
          styles.iconTile,
          {
            backgroundColor: tintColor,
            borderRadius: theme.radius[12],
          },
        ]}
      >
        <Image source={icon} style={styles.icon} resizeMode="contain" />
      </View>
      {/* One line, like the design. On a phone a long label shrinks a little instead of breaking; the
          browser cannot shrink text to fit, so there it stays on one line and may reach past its column. */}
      <Text
        numberOfLines={web ? undefined : 1}
        adjustsFontSizeToFit={!web}
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.2}
        style={[styles.label, web && webLabel, { color: theme.text, ...theme.type.captionSmallBold }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 8,
  },
  iconTile: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 46,
    height: 46,
  },
  label: {
    alignSelf: 'stretch',
    textAlign: 'center',
  },
});
