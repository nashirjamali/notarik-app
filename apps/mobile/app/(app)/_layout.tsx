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
        // The sheet fades its scrim and slides itself, so the stack adds no animation of its own.
        options={{ presentation: "transparentModal", animation: "none", contentStyle: { backgroundColor: "transparent" } }}
      />
    </Stack>
  );
}
