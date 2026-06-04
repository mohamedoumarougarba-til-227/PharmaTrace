import { Tabs, router } from "expo-router";
import { Text, TouchableOpacity, Alert, ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";
import { FontAwesome6 } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { FAIcon } from "../../constants/icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace("/(auth)/login");
          return;
        }

        const isDemo = await AsyncStorage.getItem('pt_demo_mode') === 'true';
        let role = null;
        if (isDemo) {
          role = await AsyncStorage.getItem('pt_demo_role');
        } else {
          const { data: profile } = await supabase
            .from("utilisateurs")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();
          role = profile?.role;
        }

        if (role !== "agent_dph") {
          router.replace("/(auth)/login");
        } else {
          setLoading(false);
        }
      } catch (err) {
        router.replace("/(auth)/login");
      }
    };

    checkAccess();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#8E44AD" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

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
