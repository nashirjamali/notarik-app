import { View, Text, Pressable, StyleSheet, Image, type ImageSourcePropType } from 'react-native';
import { useTheme } from '@/theme/Theme';

interface ShortcutTileProps {
  label: string;
  icon: ImageSourcePropType;
  onPress?: () => void;
}

export function ShortcutTile({ label, icon, onPress }: ShortcutTileProps) {
  const theme = useTheme();
  
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={[
        styles.iconTile,
        {
          backgroundColor: theme.bg,
          borderRadius: theme.radius[14],
        }
      ]}>
        <Image source={icon} style={styles.icon} resizeMode="contain" />
      </View>
      <Text style={[
        styles.label,
        {
          color: theme.text,
          ...theme.type.captionSmall,
        }
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    width: 72,
  },
  iconTile: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 48,
    height: 48,
  },
  label: {
    textAlign: 'center',
    fontWeight: '400',
  },
});
