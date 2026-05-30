import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { FAIcon } from '../../constants/icons';
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Connexion échouée", error.message);
      return;
    }

    const { data: user } = await supabase
      .from("utilisateurs")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (user?.role === "fabricant") {
      router.replace("/(fabricant)");
      return;
    }
    if (user?.role === "pharmacie") {
      router.replace("/(pharmacie)");
      return;
    }
    if (user?.role === "agent_dph") {
      router.replace("/(agent-dph)");
      return;
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-navy"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="px-5"
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo + image médicament */}
        <View className="items-center mb-10">
          <Text className="text-white font-black text-4xl">PharmaTrace</Text>
          <Text className="text-white/50 text-sm text-center mt-2 max-w-xs leading-relaxed">
            Réservé aux acteurs agréés de la chaîne pharmaceutique nigérienne
          </Text>
          {/* Image médicament */}
          <Image
            source={require("../../assets/images/medicament.png")}
            style={{ width: 100, height: 100, marginTop: 20 }}
            resizeMode="contain"
          />
        </View>

        {/* Carte formulaire */}
        <View className="bg-white rounded-2xl p-6 shadow-lg">
          <Text className="text-navy font-black text-2xl mb-1">Connexion</Text>
          <Text className="text-muted text-sm mb-6">
            Accédez à votre espace
          </Text>

          {/* Email */}
          <Text className="text-text font-semibold text-sm mb-1">
            Adresse email
          </Text>
          <TextInput
            className="w-full h-12 border border-blue-light rounded-lg px-4 text-sm text-text mb-4"
            placeholder="votre@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Mot de passe */}
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-text font-semibold text-sm">
              Mot de passe
            </Text>
            <TouchableOpacity>
              <Text className="text-blue text-xs">Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </View>
          <View className="relative mb-6">
            <TextInput
              className="w-full h-12 border border-blue-light rounded-lg px-4 text-sm text-text pr-12"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPwd}
            />
            <TouchableOpacity
              className="absolute right-4 top-3"
              onPress={() => setShowPwd((p) => !p)}
            >
              <FAIcon name={showPwd ? 'eye-slash' : 'eye'} size={16} color="#999" family="FontAwesome6" />
            </TouchableOpacity>
          </View>

          {/* Bouton connexion */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="w-full h-12 bg-navy rounded-lg items-center justify-center"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            <Text className="text-white font-bold text-base">
              {loading ? "Connexion..." : "Se connecter"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Note accès restreint */}
        <View className="bg-navy/30 rounded-xl p-4 mt-5 mx-1">
          <View className="flex-row items-start gap-2">
            <FAIcon name="lock" size={12} color="rgba(255,255,255,0.5)" family="FontAwesome6" />
            <Text className="text-white/50 text-xs text-center leading-relaxed flex-1">
              L'accès est validé manuellement par l'administrateur. Seuls les
              acteurs agréés peuvent se connecter.
            </Text>
          </View>
        </View>

        {/* Bouton scanner — pour les patients qui arrivent par erreur ici */}
        <TouchableOpacity
          onPress={() => router.replace("/(public)/verify")}
          className="mt-6 mb-8 h-14 border-2 border-white/30 rounded-xl items-center justify-center flex-row gap-3"
        >
          <FAIcon name="camera" size={16} color="#fff" family="FontAwesome6" />
          <Text className="text-white/80 font-semibold text-sm">
            Scanner un médicament sans se connecter
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
