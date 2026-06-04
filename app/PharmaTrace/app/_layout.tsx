import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";
import "../global.css";

export default function RootLayout() {
  if (Platform.OS === "web") {
    return (
      <>
        <StatusBar style="light" />
        <View className="flex-1 w-full h-full min-h-screen bg-[#0b132b] flex items-center justify-center p-0 md:p-6">
          <View className="w-full h-screen md:w-[420px] md:h-[840px] md:max-h-[90vh] md:rounded-[40px] md:border-[12px] md:border-[#1a2d42] md:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] md:overflow-hidden bg-[#F7F9FC] flex flex-col">
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(public)/verify" />
              <Stack.Screen name="(auth)/login" />
              <Stack.Screen name="(fabricant)" />
              <Stack.Screen name="(pharmacie)" />
              <Stack.Screen name="(agent-dph)" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </View>
        </View>
      </>
    );
  }

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

