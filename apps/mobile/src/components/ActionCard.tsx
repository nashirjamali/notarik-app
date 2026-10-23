import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/Theme';

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
  
  const backgroundColor = variant === 'primary' ? theme.accent : theme.bg;
  const textColor = variant === 'primary' ? theme.accentText : theme.text;
  const subtitleColor = variant === 'primary' ? theme.accentText : theme.muted;
  
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor,
          borderRadius: theme.radius[24],
          padding: theme.spacing[16],
        },
        style,
      ]}
    >
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <View style={styles.content}>
        <Text style={[
          styles.title,
          {
            color: textColor,
            ...theme.type.body2Bold,
          }
        ]}>
          {title}
        </Text>
        <Text style={[
          styles.subtitle,
          {
            color: subtitleColor,
            ...theme.type.caption,
          }
        ]}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.arrow, { borderColor: textColor }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontWeight: '500',
  },
  subtitle: {
    fontWeight: '400',
  },
  arrow: {
    width: 16,
    height: 16,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
    alignSelf: 'flex-end',
  },
});
