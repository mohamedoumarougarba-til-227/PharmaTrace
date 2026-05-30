import { Tabs } from "expo-router";
import { FAIcon } from "../../constants/icons";

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
          tabBarIcon: ({ color }) => <FAIcon name="chart-bar" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="lots"
        options={{
          title: "Mes Lots",
          tabBarLabel: "Lots",
          tabBarIcon: ({ color }) => <FAIcon name="box" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="nouveau-lot"
        options={{
          title: "Nouveau lot",
          tabBarLabel: "Créer",
          tabBarIcon: ({ color }) => <FAIcon name="plus" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="transferts"
        options={{
          title: "Transferts",
          tabBarLabel: "Transferts",
          tabBarIcon: ({ color }) => <FAIcon name="right-left" size={20} color={color} family="FontAwesome6" />,
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
      <Tabs.Screen
        name="nouveau-transfert"
        options={{
          href: null,
          tabBarItemStyle: { display: 'none' },
          title: 'Nouveau transfert',
        }}
      />
      <Tabs.Screen
        name="[id]"
        options={{
          href: null,
          tabBarItemStyle: { display: 'none' },
          title: 'Détail du lot',
        }}
      />
    </Tabs>
  );
}
