import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)/verify" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(fabricant)" />
        <Stack.Screen name="(pharmacie)" />
        <Stack.Screen name="(agent-dph)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

