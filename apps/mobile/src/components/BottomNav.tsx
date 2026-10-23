import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@/theme/Theme';

const HomeIcon = ({ active, color }: { active: boolean; color: string }) => (
  <View style={[
    styles.iconCircle,
    active && { backgroundColor: color }
  ]}>
    {!active && (
      <View style={[styles.homeIcon, { borderColor: color }]} />
    )}
  </View>
);

const TransactionsIcon = ({ color }: { color: string }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.listLine, { backgroundColor: color }]} />
    <View style={[styles.listLine, { backgroundColor: color }]} />
    <View style={[styles.listLine, { backgroundColor: color }]} />
  </View>
);

const ChatIcon = ({ color }: { color: string }) => (
  <View style={[styles.chatBubble, { borderColor: color }]} />
);

const SettingsIcon = ({ color }: { color: string }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.gear, { borderColor: color }]}>
      <View style={[styles.gearCenter, { backgroundColor: color }]} />
    </View>
  </View>
);

const PlusIcon = ({ color }: { color: string }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.plusH, { backgroundColor: color }]} />
    <View style={[styles.plusV, { backgroundColor: color }]} />
  </View>
);

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
        <HomeIcon 
          active={isActive('/(app)/(tabs)/')} 
          color={isActive('/(app)/(tabs)/') ? theme.accentText : theme.muted}
        />
      </Pressable>
      
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/(app)/(tabs)/transactions')}
      >
        <TransactionsIcon 
          color={isActive('/(app)/(tabs)/transactions') ? theme.accentText : theme.muted}
        />
      </Pressable>
      
      <Pressable
        style={[
          styles.addButton,
          { backgroundColor: theme.accent }
        ]}
        onPress={() => router.push('/(app)/(tabs)/add')}
      >
        <PlusIcon color={theme.accentText} />
      </Pressable>
      
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/(app)/(tabs)/chat')}
      >
        <ChatIcon 
          color={isActive('/(app)/(tabs)/chat') ? theme.accentText : theme.muted}
        />
      </Pressable>
      
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/(app)/(tabs)/settings')}
      >
        <SettingsIcon 
          color={isActive('/(app)/(tabs)/settings') ? theme.accentText : theme.muted}
        />
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
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIcon: {
    width: 20,
    height: 18,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listLine: {
    width: 20,
    height: 2.5,
    borderRadius: 1.25,
    marginVertical: 2,
  },
  chatBubble: {
    width: 22,
    height: 20,
    borderWidth: 2.5,
    borderRadius: 11,
    borderBottomLeftRadius: 2,
  },
  gear: {
    width: 20,
    height: 20,
    borderWidth: 2.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  plusH: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    position: 'absolute',
  },
  plusV: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
    position: 'absolute',
  },
});
