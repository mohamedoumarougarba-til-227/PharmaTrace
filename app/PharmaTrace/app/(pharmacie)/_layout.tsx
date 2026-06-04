import { Tabs, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { FAIcon } from "../../constants/icons";
import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PharmacieLayout() {
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

        if (role !== "pharmacie") {
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#27AE60" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#27AE60" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#DCE6F0",
          height: 64,
        },
        tabBarActiveTintColor: "#27AE60",
        tabBarInactiveTintColor: "#999",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tableau de bord",
          tabBarLabel: "Accueil",
          tabBarIcon: ({ color }) => <FAIcon name="chart-bar" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="transferts"
        options={{
          title: "Transferts entrants",
          tabBarLabel: "Entrants",
          tabBarIcon: ({ color }) => <FAIcon name="inbox" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Mon Stock",
          tabBarLabel: "Stock",
          tabBarIcon: ({ color }) => <FAIcon name="box" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="verifier"
        options={{
          title: "Vérification",
          tabBarLabel: "Scanner",
          tabBarIcon: ({ color }) => <FAIcon name="magnifying-glass" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="compte"
        options={{
          title: "Mon Compte",
          tabBarLabel: "Compte",
          tabBarIcon: ({ color }) => <FAIcon name="user" size={20} color={color} family="FontAwesome6" />,
        }}
      />
    </Tabs>
  );
}
