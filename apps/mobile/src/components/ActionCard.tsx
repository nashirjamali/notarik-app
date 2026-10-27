import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/Theme';
import ArrowLight from '../../assets/svg/icon-arrow-up-right.svg';
import ArrowDark from '../../assets/svg/icon-arrow-up-right-dark.svg';

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  variant: 'primary' | 'subtle';
  onPress?: () => void;
  style?: ViewStyle;
}

export function ActionCard({ title, subtitle, icon, variant, onPress, style }: ActionCardProps) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: primary ? theme.accent : theme.bg,
          borderRadius: theme.radius[24],
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: primary ? theme.glass : theme.surface },
          ]}
        >
          {icon}
        </View>
        {primary ? <ArrowLight /> : <ArrowDark />}
      </View>

      <View style={styles.content}>
        <Text style={[{ color: primary ? theme.accentText : theme.text, ...theme.type.body1Bold }]}>
          {title}
        </Text>
        <Text
          style={[
            {
              color: primary ? theme.accentText : theme.muted,
              ...theme.type.captionSmall,
            },
            primary && styles.onAccentSubtitle,
          ]}
        >
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 224,
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: 6,
  },
  // Figma: white at 95% on the purple card.
  onAccentSubtitle: {
    opacity: 0.95,
  },
});
