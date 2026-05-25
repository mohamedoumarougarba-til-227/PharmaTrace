import { Tabs } from "expo-router";
import { Text } from "react-native";

function Icon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export default function FabricantLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#1A3A5C" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#DCE6F0",
          height: 64,
        },
        tabBarActiveTintColor: "#1A3A5C",
        tabBarInactiveTintColor: "#999",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tableau de bord",
          tabBarLabel: "Accueil",
          tabBarIcon: () => <Icon label="📊" />,
        }}
      />
      <Tabs.Screen
        name="lots"
        options={{
          title: "Mes Lots",
          tabBarLabel: "Lots",
          tabBarIcon: () => <Icon label="📦" />,
        }}
      />
      <Tabs.Screen
        name="nouveau-lot"
        options={{
          title: "Nouveau lot",
          tabBarLabel: "Créer",
          tabBarIcon: () => <Icon label="➕" />,
        }}
      />
      <Tabs.Screen
        name="transferts"
        options={{
          title: "Transferts",
          tabBarLabel: "Transferts",
          tabBarIcon: () => <Icon label="🔄" />,
        }}
      />
      <Tabs.Screen
        name="compte"
        options={{
          title: "Mon Compte",
          tabBarLabel: "Compte",
          tabBarIcon: () => <Icon label="👤" />,
        }}
      />
    </Tabs>
  );
}
