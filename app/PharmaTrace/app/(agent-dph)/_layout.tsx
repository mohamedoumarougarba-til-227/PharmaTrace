import { Tabs } from "expo-router";
import { Text, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { FontAwesome6 } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { FAIcon } from "../../constants/icons";

function LogoutButton() {
  const handleLogout = () => {
    Alert.alert("Se déconnecter", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
      <FontAwesome6 name="arrow-right-from-bracket" size={20} color="rgba(255,255,255,0.85)" />
    </TouchableOpacity>
  );
}

export default function AgentDPHLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#8E44AD" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerRight: () => <LogoutButton />,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#DCE6F0",
          height: 64,
        },
        tabBarActiveTintColor: "#8E44AD",
        tabBarInactiveTintColor: "#999",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Surveillance nationale",
          tabBarLabel: "Accueil",
          tabBarIcon: ({ color }) => <FAIcon name="gopuram" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="alertes"
        options={{
          title: "Alertes",
          tabBarLabel: "Alertes",
          tabBarIcon: ({ color }) => <FAIcon name="triangle-exclamation" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="lots"
        options={{
          title: "Tous les lots",
          tabBarLabel: "Lots",
          tabBarIcon: ({ color }) => <FAIcon name="box" size={20} color={color} family="FontAwesome6" />,
        }}
      />
    </Tabs>
  );
}
