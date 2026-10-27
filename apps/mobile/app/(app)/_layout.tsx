import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="edit-budgets"
        options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }}
      />
      <Stack.Screen
        name="quick-add"
        options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }}
      />
    </Stack>
  );
}
