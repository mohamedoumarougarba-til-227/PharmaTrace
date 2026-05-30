import { Tabs } from "expo-router";
import { FAIcon } from "../../constants/icons";

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
