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
  const arrowColor = variant === 'primary' ? theme.accentText : '#141718';
  const iconCircleBg = variant === 'primary' ? 'rgba(255, 255, 255, 0.2)' : theme.surface;
  
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
      <View style={styles.header}>
        <View style={[
          styles.iconCircle,
          { backgroundColor: iconCircleBg, borderRadius: 24 }
        ]}>
          {icon}
        </View>
        <View style={styles.arrowContainer}>
          <ArrowIcon width={20} height={20} color={arrowColor} />
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={[
          styles.title,
          {
            color: textColor,
            ...theme.type.body1Bold,
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    width: 20,
    height: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  title: {
    fontWeight: '600',
  },
  subtitle: {
    fontWeight: '400',
  },
});
