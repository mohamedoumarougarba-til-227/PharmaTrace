import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function PharmacieLayout() {
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
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="transferts"
        options={{
          title: "Transferts entrants",
          tabBarLabel: "Entrants",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📥</Text>,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Mon Stock",
          tabBarLabel: "Stock",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📦</Text>,
        }}
      />
      <Tabs.Screen
        name="verifier"
        options={{
          title: "Vérification",
          tabBarLabel: "Scanner",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🔍</Text>,
        }}
      />
      <Tabs.Screen
        name="compte"
        options={{
          title: "Mon Compte",
          tabBarLabel: "Compte",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
