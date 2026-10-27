import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/Theme';
import ChevronLeft from '../../assets/svg/login-chevron-left.svg';

type TopBarProps = {
  /** A string is set as the screen heading; pass a node for anything richer. */
  title?: ReactNode;
  onBack?: () => void;
  /** Replaces the back button, for bars that start with something else (the Home logo). */
  left?: ReactNode;
  /** The 48 px slot on the right: a TopBarButton, a text action, or nothing. */
  right?: ReactNode;
  /** `center` is the back / title / action bar; `start` puts a large title on the left. */
  align?: 'center' | 'start';
  style?: StyleProp<ViewStyle>;
};

/**
 * The top bar every screen shares (Figma "Top Bar"): 96 high, 24 px of padding around a 48 px
 * round button on each side. Put it under the safe area; the screen decides how far its content
 * sits below it.
 */
export function TopBar({ title, onBack, left, right, align = 'center', style }: TopBarProps) {
  const theme = useTheme();
  const start = align === 'start';

  const heading =
    typeof title === 'string' ? (
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{ color: theme.text, ...(start ? theme.type.body1Bold : theme.type.body2Bold) }}
      >
        {title}
      </Text>
    ) : (
      title
    );

  const leading =
    left ??
    (onBack ? (
      <TopBarButton label="Back" onPress={onBack}>
        <ChevronLeft />
      </TopBarButton>
    ) : null);

  if (start) {
    return (
      <View style={[styles.bar, style]}>
        {leading}
        <View style={styles.startTitle}>{heading}</View>
        {right}
      </View>
    );
  }

  return (
    <View style={[styles.bar, style]}>
      <View style={styles.slotStart}>{leading}</View>
      <View style={styles.centerTitle}>{heading}</View>
      <View style={styles.slotEnd}>{right}</View>
    </View>
  );
}

type TopBarButtonProps = {
  label: string;
  onPress?: () => void;
  children: ReactNode;
};

/** The round 48 px button used on both sides of the bar. */
export function TopBarButton({ label, onPress, children }: TopBarButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotStart: { width: 48, alignItems: 'flex-start' },
  slotEnd: { width: 48, alignItems: 'flex-end' },
  centerTitle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  startTitle: { flex: 1 },
});
