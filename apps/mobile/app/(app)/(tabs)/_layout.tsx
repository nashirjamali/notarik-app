import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";

import { BottomNav } from "@/components/BottomNav";

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Home" }} />
          <Tabs.Screen name="transactions" options={{ title: "Transactions" }} />
          <Tabs.Screen name="chat" options={{ title: "Chat" }} />
          <Tabs.Screen name="settings" options={{ title: "Settings" }} />
        </Tabs>
        <BottomNav />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F3F5F7',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    position: 'relative',
  },
});
