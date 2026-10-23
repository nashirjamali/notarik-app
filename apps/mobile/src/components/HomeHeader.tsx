import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/Theme';
import { Logo } from './Logo';

export function HomeHeader({ onNotificationPress }: { onNotificationPress?: () => void }) {
  const theme = useTheme();
  
  return (
    <View style={[styles.header, { paddingHorizontal: theme.spacing[24] }]}>
      <Logo />
      <Pressable 
        onPress={onNotificationPress}
        style={[
          styles.notificationButton,
          {
            width: theme.buttonHeights.icon,
            height: theme.buttonHeights.icon,
            backgroundColor: theme.surface,
            borderRadius: theme.buttonHeights.icon / 2,
            borderWidth: 1,
            borderColor: theme.border,
          }
        ]}
      >
        <View style={[styles.bellIcon, { borderColor: theme.text }]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
  },
  notificationButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
});
