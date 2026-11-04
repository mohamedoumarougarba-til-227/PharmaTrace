import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { getBusinessAccess } from "../../lib/businessRole";
import { FAIcon } from '../../constants/icons';
import { verifyMedication, journalVerificationScan, type VerificationSource } from '../../lib/verification';
import VerificationNotice from '../../components/VerificationNotice';

type VerifyResult = { source?: VerificationSource } & (
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "authentique";
      data: {
        nom: string;
        fabricant: string;
        expiration: string;
        statut: string;
      };
    }
  | { status: "not_found" | "unavailable" | "invalid_input" }
  | {
      status: "expire" | "archive";
      data: { nom: string; fabricant: string; expiration: string };
    }
);

export default function VerifyScreen() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<VerifyResult>({ status: "idle" });
  const [cameraActive, setCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const verificationRequest = useRef(0);
  const [journalFailed, setJournalFailed] = useState(false);
  const scannedRef = useRef(false); // évite les doubles scans
  const [userRole, setUserRole] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const access = await getBusinessAccess();
        setUserRole(access.status === 'AUTHORIZED' ? access.role : null);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  // ─── Vérification (manuelle ou QR) ───────────────────────────────────────
  const handleVerify = async (hash?: string) => {
    const request = ++verificationRequest.current;
    scannedRef.current = true;
    setCameraActive(false);
    setJournalFailed(false);
    setResult({ status: "loading" });

    const lookup = await verifyMedication(hash ?? input);
    if (request !== verificationRequest.current) return;
    if (lookup.status === 'INVALID_INPUT') {
      setResult({ status: 'invalid_input' });
      return;
    }
    if (lookup.status === 'UNAVAILABLE') {
      setResult({ status: 'unavailable', source: lookup.source });
      return;
    }
    if (lookup.status === 'NOT_FOUND') {
      setResult({ status: 'not_found', source: lookup.source });
    } else {
      const lot = lookup.lot;
      const expDate = new Date(lot.date_expiration);
      if (lot.statut_actuel === 'archive' || expDate < new Date()) {
        setResult({
          status: lot.statut_actuel === 'archive' ? 'archive' : 'expire', source: lookup.source,
          data: {
            nom: lot.nom_medicament,
            fabricant: lot.utilisateurs?.nom_entite ?? 'Inconnu',
            expiration: expDate.toLocaleDateString('fr-FR'),
          },
        });
      } else {
        setResult({
          status: 'authentique', source: lookup.source,
          data: {
            nom: lot.nom_medicament,
            fabricant: lot.utilisateurs?.nom_entite ?? 'Inconnu',
            expiration: expDate.toLocaleDateString('fr-FR'),
            statut: lot.statut_actuel.replace(/_/g, ' '),
          },
        });
      }
    }
    // The result is already visible; failure of this secondary effect cannot replace it.
    const journal = await journalVerificationScan(lookup, 'public');
    if (request === verificationRequest.current) setJournalFailed(journal === 'FAILED');
  };

  const reset = () => {
    verificationRequest.current++;
    setJournalFailed(false);
    setResult({ status: "idle" });
    setInput("");
    scannedRef.current = false;
    setCameraActive(false);
  };

  // ─── Activer la caméra ────────────────────────────────────────────────────
  const activateCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          "Caméra non autorisée",
          "Allez dans Paramètres → Applications → PharmaTrace → Autorisations → Caméra",
        );
        return;
      }
    }
    scannedRef.current = false;
    setCameraActive(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    handleVerify(data);
  };

  if (result.status === 'unavailable' || result.status === 'invalid_input' || result.status === 'not_found') {
    const title = result.status === 'unavailable' ? 'Vérification indisponible'
      : result.status === 'invalid_input' ? 'Code invalide' : 'Lot non trouvé';
    const message = result.status === 'unavailable'
      ? 'La recherche n’a pas pu aboutir. Réessayez plus tard ; aucune conclusion sur le lot ne peut être établie.'
      : result.status === 'invalid_input'
        ? 'Saisissez un numéro de lot ou un code QR valide (100 caractères maximum pour le code).'
        : 'Aucun lot correspondant à ce code n’a été trouvé dans la source consultée.';
    return (
      <View style={{ flex: 1, backgroundColor: '#F7F9FC', padding: 24, justifyContent: 'center' }}>
        <StatusBar style="dark" />
        <View style={{ width: '100%', maxWidth: 540, alignSelf: 'center' }}>
          <VerificationNotice source={result.source} journalFailed={journalFailed} />
          <Text accessibilityRole="header" style={{ color: '#1A3A5C', fontWeight: '800', fontSize: 24 }}>{title}</Text>
          <Text style={{ color: '#333', marginTop: 16, lineHeight: 24 }}>{message}</Text>
          <TouchableOpacity onPress={reset} style={{ backgroundColor: '#1A3A5C', borderRadius: 12, padding: 16, marginTop: 24 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Revenir à la vérification</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Résultat : correspondance au registre ────────────────────────────────────────────────
  if (result.status === "authentique") {
    return (
      <View style={{ flex: 1, backgroundColor: "#27AE60" }}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: "center" }}
          style={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 }}
        >
          <View className="w-full max-w-[540px] flex-1 flex flex-col justify-start">
            <VerificationNotice source={result.source} journalFailed={journalFailed} />
            <View
              style={{ alignItems: "center", marginTop: 16, marginBottom: 24 }}
            >
              <View
                style={{
                  width: 96,
                  height: 96,
                  backgroundColor: "white",
                  borderRadius: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FAIcon name="check" size={48} color="#27AE60" family="FontAwesome6" />
              </View>
            </View>
            <Text
              style={{
                color: "white",
                fontWeight: "900",
                fontSize: 28,
                textAlign: "center",
                letterSpacing: 4,
              }}
            >
              LOT TROUVÉ
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 13,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Correspondance trouvée dans le registre
            </Text>

            <View
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                padding: 24,
                marginTop: 24,
                shadowOpacity: 0.1,
                shadowRadius: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#DCE6F0",
                }}
              >
                <View
                  style={{
                    backgroundColor: "rgba(39,174,96,0.1)",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 100,
                  }}
                >
                  <Text
                    style={{
                      color: "#27AE60",
                      fontSize: 11,
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    ENREGISTRÉ
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: "#1A3A5C",
                  fontWeight: "900",
                  fontSize: 20,
                  marginBottom: 12,
                }}
              >
                {result.data.nom}
              </Text>
              {(
                [
                  ["Fabricant", result.data.fabricant],
                  ["Expiration", result.data.expiration],
                  ["Statut", result.data.statut],
                ] as [string, string][]
              ).map(([label, value]) => (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F7F9FC",
                  }}
                >
                  <Text
                    style={{
                      color: "#666",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      color: "#1A1A1A",
                      fontWeight: "600",
                      fontSize: 13,
                      textAlign: "right",
                      flex: 1,
                      marginLeft: 16,
                    }}
                  >
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={reset}
              style={{
                marginTop: 24,
                height: 56,
                backgroundColor: "rgba(255,255,255,0.2)",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.4)",
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                Vérifier un autre médicament
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Résultat EXPIRÉ ─────────────────────────────────────────────────────
  if (result.status === "expire" || result.status === "archive") {
    return (
      <View style={{ flex: 1, backgroundColor: "#E67E22" }}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: "center" }}
          style={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 }}
        >
          <View className="w-full max-w-[540px] flex-1 flex flex-col justify-start">
            <VerificationNotice source={result.source} journalFailed={journalFailed} />
            <View
              style={{ alignItems: "center", marginTop: 16, marginBottom: 24 }}
            >
              <View
                style={{
                  width: 96,
                  height: 96,
                  backgroundColor: "white",
                  borderRadius: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 40 }}>⏰</Text>
              </View>
            </View>
            <Text
              style={{
                color: "white",
                fontWeight: "900",
                fontSize: 28,
                textAlign: "center",
                letterSpacing: 2,
              }}
            >
              {result.status === 'archive' ? 'Lot archivé' : 'EXPIRÉ'}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 14,
                textAlign: "center",
                marginTop: 8,
                fontWeight: "600",
              }}
            >
              {result.status === 'archive' ? 'La correspondance existe, mais le lot est archivé.' : "Ce médicament a dépassé sa date d'expiration"}
            </Text>
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                padding: 24,
                marginTop: 24,
              }}
            >
              <Text
                style={{
                  color: "#1A3A5C",
                  fontWeight: "900",
                  fontSize: 18,
                  marginBottom: 8,
                }}
              >
                {result.data.nom}
              </Text>
              <Text style={{ color: "#666", fontSize: 13 }}>
                Fabricant : {result.data.fabricant}
              </Text>
              <Text
                style={{
                  color: "#C0392B",
                  fontWeight: "700",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                {result.status === 'archive' ? 'Expiration : ' : 'Expiré le : '}{result.data.expiration}
              </Text>
              <View
                style={{
                  backgroundColor: "#FEF4E0",
                  borderRadius: 10,
                  padding: 16,
                  marginTop: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#E67E22", fontWeight: "900", fontSize: 15 }}
                >
                  {result.status === 'archive' ? 'STATUT ARCHIVÉ' : 'NE PAS CONSOMMER'}
                </Text>
                <Text
                  style={{
                    color: "#E67E22",
                    fontSize: 12,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {result.status === 'archive' ? 'Demandez conseil à un pharmacien.' : 'Retournez ce médicament à la pharmacie'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={reset}
              style={{
                marginTop: 24,
                height: 56,
                backgroundColor: "rgba(255,255,255,0.2)",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.4)",
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                Vérifier un autre médicament
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Écran principal (idle / loading) ────────────────────────────────────
  const cameraSize = isDesktop ? 340 : 280;

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1A" }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: "center" }}
        className="px-6 py-4 md:py-2"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-5xl flex-1 flex flex-col justify-start">
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: isDesktop ? 32 : 56,
              paddingBottom: 8,
              width: "100%",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 20 }}>
              PharmaTrace
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={{ color: "#2E6DA4", fontSize: 14 }}>Se connecter</Text>
            </TouchableOpacity>
          </View>

          {/* Zone de contenu adaptatif Split-Screen */}
          <View className="flex-col md:flex-row md:items-center md:justify-center md:gap-16 w-full mt-6 md:mt-8 flex-1">
            
            {/* Colonne Gauche : QR Scanner */}
            <View 
              className="flex-1 items-center md:max-w-md"
              style={{ alignItems: "center" }}
            >
              {/* Zone caméra */}
              <View style={{ alignItems: "center", marginBottom: 8, width: "100%" }}>
                {cameraActive && permission?.granted ? (
                  /* ── Caméra active ── */
                  <View style={[styles.cameraFrame, { width: cameraSize, height: cameraSize, alignSelf: "center" }]}>
                    {/* Coins décoratifs */}
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                    {/* Ligne de scan animée */}
                    <View style={styles.scanLine} />
                    {/* CameraView */}
                    <CameraView
                      style={StyleSheet.absoluteFillObject}
                      facing="back"
                      onBarcodeScanned={handleBarcodeScanned}
                      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    />
                    {/* Bouton annuler */}
                    <TouchableOpacity
                      onPress={() => setCameraActive(false)}
                      style={styles.cancelBtn}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <FAIcon name="xmark" size={12} color="#fff" family="FontAwesome6" />
                        <Text
                          style={{ color: "white", fontSize: 12, fontWeight: "600" }}
                        >
                          Annuler
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* ── Bouton activer caméra ── */
                  <TouchableOpacity
                    onPress={activateCamera}
                    style={[styles.cameraFrame, { width: cameraSize, height: cameraSize, alignSelf: "center" }]}
                    activeOpacity={0.85}
                  >
                    <FAIcon name="camera" size={52} color="#2E6DA4" family="FontAwesome6" />
                    <Text
                      style={{
                        color: "#2E6DA4",
                        fontWeight: "600",
                        fontSize: 15,
                        marginTop: 12,
                      }}
                    >
                      {result.status === "loading"
                        ? "Vérification..."
                        : "Activer la caméra"}
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: 12,
                        marginTop: 6,
                        textAlign: "center",
                        paddingHorizontal: 24,
                      }}
                    >
                      Pointez vers le QR code du médicament
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Titre et Description en bas du cadre QR */}
              <View 
                style={{ 
                  marginTop: 16, 
                  alignItems: "center",
                  width: '100%'
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "700",
                    fontSize: 20,
                    textAlign: "center",
                    lineHeight: 28,
                  }}
                >
                  Vérifiez votre médicament
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    textAlign: "center",
                    marginTop: 6,
                  }}
                >
                  Scannez le QR code sur l'emballage
                </Text>
              </View>
            </View>

            {/* Divider (Uniquement mobile) */}
            <View
              className="flex md:hidden flex-row items-center gap-12 my-6 w-full"
            >
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "rgba(255,255,255,0.1)",
                }}
              />
              <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                ou saisir manuellement
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "rgba(255,255,255,0.1)",
                }}
              />
            </View>

            {/* Colonne Droite : Saisie manuelle */}
            <View className="flex-1 w-full md:max-w-md md:justify-center">
              {/* Titre Saisie manuelle (Desktop uniquement) */}
              <Text className="hidden md:flex text-white font-bold text-lg mb-6">
                Saisie manuelle du code
              </Text>

              <TextInput
                style={{
                  width: "100%",
                  height: 56,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  color: "white",
                  fontSize: 14,
                  marginBottom: 16,
                }}
                placeholder="Ex : FAB-2026-049"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={input}
                onChangeText={setInput}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={() => handleVerify()}
              />
              <TouchableOpacity
                onPress={() => handleVerify()}
                disabled={result.status === "loading" || !input.trim()}
                style={{
                  width: "100%",
                  height: 56,
                  backgroundColor: "#2E6DA4",
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: !input.trim() || result.status === "loading" ? 0.5 : 1,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                  {result.status === "loading" ? "Vérification..." : "Vérifier →"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Mentions */}
          <Text
            style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: 12,
              textAlign: "center",
              marginTop: isDesktop ? 24 : 48,
              marginBottom: 16,
            }}
          >
            Android & iOS — aucune application à installer
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const FRAME_SIZE = 280;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  cameraFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(46,109,164,0.4)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#2E6DA4",
    zIndex: 10,
  },
  cornerTL: {
    top: 12,
    left: 12,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 12,
    right: 12,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 12,
    left: 12,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 12,
    right: 12,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 6,
  },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: "rgba(192,57,43,0.7)",
    zIndex: 10,
  },
  cancelBtn: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
    zIndex: 20,
  },
});
