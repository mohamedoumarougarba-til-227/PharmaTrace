import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/(public)/verify");
        return;
      }

      // Session active → récupérer le rôle
      const { data: user } = await supabase
        .from("utilisateurs")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (user?.role === "fabricant") router.replace("/(fabricant)");
      else if (user?.role === "pharmacie") router.replace("/(pharmacie)");
      else if (user?.role === "agent_dph") router.replace("/(agent-dph)");
      else router.replace("/(public)/verify");
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
