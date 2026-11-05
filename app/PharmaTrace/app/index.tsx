import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { BUSINESS_ROUTES, getBusinessAccess } from "../lib/businessRole";

/**
 * Point d'entrée — vérifie la session Supabase.
 * - Connecté → redirige vers le bon dashboard selon le rôle
 * - Non connecté → page scan patient publique
 */
export default function Index() {
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const access = await getBusinessAccess();
      if (access.status === 'AUTHORIZED') router.replace(BUSINESS_ROUTES[access.role]);
      else if (access.status === 'ANONYMOUS') router.replace("/(public)/verify");
      else router.replace("/(auth)/login");
    } catch {
      router.replace("/(public)/verify");
    }
  };

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1A3A5C",
      }}
    >
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}
