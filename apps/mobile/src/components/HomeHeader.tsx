import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/Theme';
import { Logo } from './Logo';
import BellIcon from '@/assets/svg/icon-bell.svg';

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
        <BellIcon width={24} height={24} />
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
});
