import type { ComponentType } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@/theme/Theme';
import NavHomeActive from '../../assets/svg/nav-home-active_26a5.svg';
import NavHomeInactive from '../../assets/svg/nav-home-inactive_d13a.svg';
import NavTransactionsActive from '../../assets/svg/nav-transactions-active_6b2f.svg';
import NavTransactionsInactive from '../../assets/svg/nav-transactions-inactive_9f4d.svg';
import NavChatActive from '../../assets/svg/nav-chat-active_46a5.svg';
import NavChatInactive from '../../assets/svg/nav-chat-inactive_5c78.svg';
import NavSettingsActive from '../../assets/svg/nav-settings-active_8816.svg';
import NavSettingsInactive from '../../assets/svg/nav-settings-inactive_4cb0.svg';
import NavPlusButton from '../../assets/svg/nav-plus-button_a419.svg';

function isActive(pathname: string, path: string) {
  if (path === '/') return pathname === '/' || pathname === '/index';
  return pathname === path || pathname.startsWith(`${path}/`);
}

function TabButton({
  label,
  active,
  onPress,
  ActiveIcon,
  InactiveIcon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  ActiveIcon: ComponentType<{ width: number; height: number }>;
  InactiveIcon: ComponentType<{ width: number; height: number }>;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={styles.navItem}
      onPress={onPress}
    >
      {active ? (
        <View style={styles.activeCircle}>
          <ActiveIcon width={24} height={24} />
        </View>
      ) : (
        <InactiveIcon width={24} height={24} />
      )}
    </Pressable>
  );
}

export function BottomNav() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.text,
        bottom: theme.spacing[34],
      }
    ]}>
      <TabButton
        label="Home"
        active={isActive(pathname, '/')}
        onPress={() => router.push('/(app)/(tabs)/')}
        ActiveIcon={NavHomeActive}
        InactiveIcon={NavHomeInactive}
      />
      <TabButton
        label="Transactions"
        active={isActive(pathname, '/transactions')}
        onPress={() => router.push('/(app)/(tabs)/transactions')}
        ActiveIcon={NavTransactionsActive}
        InactiveIcon={NavTransactionsInactive}
      />
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="Add"
        style={styles.addButton}
        onPress={() => router.push('/(app)/(tabs)/add')}
      >
        <NavPlusButton width={56} height={56} />
      </Pressable>
      <TabButton
        label="Chat"
        active={isActive(pathname, '/chat')}
        onPress={() => router.push('/(app)/(tabs)/chat')}
        ActiveIcon={NavChatActive}
        InactiveIcon={NavChatInactive}
      />
      <TabButton
        label="Settings"
        active={isActive(pathname, '/settings')}
        onPress={() => router.push('/(app)/(tabs)/settings')}
        ActiveIcon={NavSettingsActive}
        InactiveIcon={NavSettingsInactive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navItem: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEFEFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
