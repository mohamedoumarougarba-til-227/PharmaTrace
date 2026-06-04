import { Link, Stack } from "expo-router";
import { Text, View, TouchableOpacity } from "react-native";
import { FAIcon } from "../constants/icons";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page non trouvée" }} />
      <View className="flex-1 items-center justify-center p-6 bg-[#F7F9FC]">
        <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-6">
          <FAIcon name="triangle-exclamation" size={40} color="#C0392B" />
        </View>
        <Text className="text-2xl font-bold text-navy text-center mb-2">
          Page non trouvée
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8 max-w-[280px]">
          Désolé, l'adresse que vous cherchez n'existe pas ou a été déplacée.
        </Text>
        <Link href="/" asChild>
          <TouchableOpacity className="bg-blue py-3 px-6 rounded-xl shadow-md active:opacity-90">
            <Text className="text-white text-base font-semibold text-center">
              Retourner à l'accueil
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}
