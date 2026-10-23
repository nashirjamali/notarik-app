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

export function BottomNav() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname === path;
  
  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.text,
        bottom: theme.spacing[34],
      }
    ]}>
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/(app)/(tabs)/')}
      >
        {isActive('/(app)/(tabs)/') ? (
          <NavHomeActive width={32} height={32} />
        ) : (
          <NavHomeInactive width={32} height={32} />
        )}
      </Pressable>
      
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/(app)/(tabs)/transactions')}
      >
        {isActive('/(app)/(tabs)/transactions') ? (
          <NavTransactionsActive width={24} height={24} />
        ) : (
          <NavTransactionsInactive width={24} height={24} />
        )}
      </Pressable>
      
      <Pressable
        style={styles.addButton}
        onPress={() => router.push('/(app)/(tabs)/add')}
      >
        <NavPlusButton width={56} height={56} />
      </Pressable>
      
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/(app)/(tabs)/chat')}
      >
        {isActive('/(app)/(tabs)/chat') ? (
          <NavChatActive width={24} height={24} />
        ) : (
          <NavChatInactive width={24} height={24} />
        )}
      </Pressable>
      
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/(app)/(tabs)/settings')}
      >
        {isActive('/(app)/(tabs)/settings') ? (
          <NavSettingsActive width={24} height={24} />
        ) : (
          <NavSettingsInactive width={24} height={24} />
        )}
      </Pressable>
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
  addButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
