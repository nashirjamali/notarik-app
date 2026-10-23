import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/Theme';
import ArrowIcon from '../../assets/svg/icon-arrow-up-right.svg';

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
  const arrowColor = variant === 'primary' ? theme.accentText : theme.text;
  
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
      <View style={styles.arrowContainer}>
        <ArrowIcon width={20} height={20} color={arrowColor} />
      </View>
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
  arrowContainer: {
    alignSelf: 'flex-end',
  },
});
