import { useEffect, useState } from "react";
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
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { FAIcon } from '../../constants/icons';
import { StatusBar } from "expo-status-bar";
import { getSupabase } from "../../lib/supabase";
import { BUSINESS_ROUTES, getBusinessAccess, UNPROVISIONED_MESSAGE } from "../../lib/businessRole";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getBusinessAccess().then(access => {
      if (!active) return;
      if (access.status === 'UNPROVISIONED') setAccessMessage(UNPROVISIONED_MESSAGE);
      else if (access.status === 'UNAVAILABLE') setAccessMessage('Impossible de vérifier les droits du compte. Réessayez plus tard.');
    });
    return () => { active = false; };
  }, []);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleQuickLogin = async (role: "fabricant" | "pharmacie" | "agent_dph") => {
    setLoading(true);
    try {
      await AsyncStorage.setItem("pt_demo_mode", "true");
      await AsyncStorage.setItem("pt_demo_role", role);
      if (role === "fabricant") router.replace("/(fabricant)");
      else if (role === "pharmacie") router.replace("/(pharmacie)");
      else if (role === "agent_dph") router.replace("/(agent-dph)");
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'activer le mode démo.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setAccessMessage(null);
    try {
      await AsyncStorage.setItem("pt_demo_mode", "false");
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert("Connexion échouée", error.message);
        return;
      }
      const access = await getBusinessAccess();
      if (access.status === 'AUTHORIZED') router.replace(BUSINESS_ROUTES[access.role]);
      else if (access.status === 'UNPROVISIONED') setAccessMessage(UNPROVISIONED_MESSAGE);
      else setAccessMessage('Impossible de vérifier les droits du compte. Réessayez plus tard.');
    } catch {
      setAccessMessage('Connexion indisponible. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-navy"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
        className="px-5 py-4 md:py-2"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-col md:flex-row md:items-start md:justify-between md:gap-16 w-full max-w-5xl">
          {/* Bloc Gauche : Logo + Infos + Scanner (desktop) */}
          <View 
            className="flex-1 mb-8 md:mb-0 md:max-w-md items-center"
            style={{ alignItems: 'center' }}
          >
            <Text 
              className="text-white font-black text-4xl text-center"
              style={{ textAlign: 'center', alignSelf: 'center' }}
            >
              PharmaTrace
            </Text>
            <Text 
              className="text-white/50 text-sm mt-2 max-w-xs leading-relaxed text-center"
              style={{ textAlign: 'center', alignSelf: 'center' }}
            >
              Réservé aux acteurs agréés de la chaîne pharmaceutique nigérienne
            </Text>
            
            {/* Image médicament */}
            <Image
              source={require("../../assets/images/medicament.png")}
              style={{ width: 120, height: 120, marginTop: 24, alignSelf: 'center' }}
              resizeMode="contain"
            />

            {/* Bouton scanner (Desktop uniquement) */}
            <TouchableOpacity
              onPress={() => router.replace("/(public)/verify")}
              className="hidden md:flex mt-8 w-full max-w-xs h-14 border-2 border-white/30 rounded-xl items-center justify-center flex-row gap-3 active:bg-white/10"
              style={{ alignSelf: 'center' }}
            >
              <FAIcon name="camera" size={16} color="#fff" family="FontAwesome6" />
              <Text className="text-white/85 font-semibold text-sm">
                Scanner un médicament
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bloc Droite : Connexion + Note restriction + Scanner (mobile) */}
          <View className="flex-1 w-full md:max-w-md">
            {/* Carte formulaire */}
            <View className="bg-white rounded-2xl p-5 shadow-lg">
              <Text className="text-navy font-black text-2xl mb-0.5 text-center">Connexion</Text>
              {accessMessage && (
                <Text accessibilityRole="alert" className="text-navy bg-orange-50 p-3 rounded-xl my-3">{accessMessage}</Text>
              )}
              <Text className="text-muted text-sm mb-4 text-center">
                Accédez à votre espace
              </Text>

              {/* Email */}
              <Text className="text-text font-semibold text-sm mb-1">
                Adresse email
              </Text>
              <TextInput
                className="w-full h-12 border border-blue-light rounded-lg px-4 text-sm text-text mb-3"
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
              <View className="relative mb-4">
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
                className="w-full h-12 bg-navy rounded-lg items-center justify-center mb-3"
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                <Text className="text-white font-bold text-base">
                  {loading ? "Connexion..." : "Se connecter"}
                </Text>
              </TouchableOpacity>

              {/* Séparateur pour Démo */}
              <View className="flex-row items-center gap-2 my-1">
                <View className="flex-1 h-px bg-blue-light" />
                <Text className="text-muted text-[10px] font-bold uppercase tracking-wider">Accès Démo (Jury)</Text>
                <View className="flex-1 h-px bg-blue-light" />
              </View>

              {/* Boutons démo */}
              <View className="flex-row justify-between gap-1.5 mt-1">
                <TouchableOpacity
                  onPress={() => handleQuickLogin("fabricant")}
                  className="flex-1 bg-navy/5 border border-navy/10 py-2 rounded-lg items-center justify-center"
                >
                  <FAIcon name="industry" size={12} color="#1A3A5C" family="FontAwesome6" />
                  <Text className="text-navy font-bold text-[10px] mt-1 text-center">Fabricant</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleQuickLogin("pharmacie")}
                  className="flex-1 bg-pharma-green/5 border border-pharma-green/10 py-2 rounded-lg items-center justify-center"
                >
                  <FAIcon name="prescription-bottle-medical" size={12} color="#27AE60" family="FontAwesome6" />
                  <Text className="text-pharma-green font-bold text-[10px] mt-1 text-center">Pharmacie</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleQuickLogin("agent_dph")}
                  className="flex-1 bg-pharma-purple/5 border border-pharma-purple/10 py-2 rounded-lg items-center justify-center"
                >
                  <FAIcon name="shield-halved" size={12} color="#8E44AD" family="FontAwesome6" />
                  <Text className="text-pharma-purple font-bold text-[10px] mt-1 text-center">Agent DPH</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Note accès restreint */}
            <View className="bg-navy/30 rounded-xl p-3 mt-3">
              <View 
                className="flex-row items-center justify-center gap-2"
                style={{ flexWrap: 'wrap' }}
              >
                <FAIcon name="lock" size={12} color="rgba(255,255,255,0.5)" family="FontAwesome6" />
                <Text 
                  className="text-white/50 text-xs leading-relaxed text-center"
                  style={{ textAlign: 'center' }}
                >
                  L'accès est validé manuellement par l'administrateur. Seuls les
                  acteurs agréés peuvent se connecter.
                </Text>
              </View>
            </View>

            {/* Bouton scanner (Mobile uniquement) */}
            <TouchableOpacity
              onPress={() => router.replace("/(public)/verify")}
              className="flex md:hidden mt-6 mb-2 h-14 border-2 border-white/30 rounded-xl items-center justify-center flex-row gap-3 active:bg-white/10"
            >
              <FAIcon name="camera" size={16} color="#fff" family="FontAwesome6" />
              <Text className="text-white/80 font-semibold text-sm">
                Scanner un médicament sans se connecter
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
