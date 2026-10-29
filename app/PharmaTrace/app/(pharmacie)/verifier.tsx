import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { decideTransfer, workflowError } from '../../lib/businessWorkflows';
import { FAIcon } from '../../constants/icons';
import ConfirmModal from '../../components/ConfirmModal';
import VerificationNotice from '../../components/VerificationNotice';
import { verifyMedication, journalVerificationScan, findPendingVerificationTransfer, type VerificationSource } from '../../lib/verification';

type VerifyResult = { source?: VerificationSource } & (
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'authentique';
      identifier: string;
      data: {
        nom: string;
        num: string;
        dosage: string;
        fabricant: string;
        expiration: string;
        statut: string;
      };
      pendingTransfer?: {
        id: string;
        lotId: string;
        qte: number;
        expediteur: string;
      } | null;
    }
  | { status: 'not_found'; query: string }
  | { status: 'unavailable' | 'invalid_input' }
  | {
      status: 'expire' | 'archive';
      data: { nom: string; num: string; dosage: string; fabricant: string; expiration: string };
    }
);

export default function PharmacyScannerScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { transfertId, expectedLotId, expectedLotNum, expectedLotNom } = useLocalSearchParams();

  const [input, setInput] = useState('');
  const [result, setResult] = useState<VerifyResult>({ status: 'idle' });
  const [cameraActive, setCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const verificationRequest = useRef(0);
  const [journalFailed, setJournalFailed] = useState(false);
  const [transferLookupFailed, setTransferLookupFailed] = useState(false);
  const scannedRef = useRef(false);
  const [recepting, setRecepting] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    title: string;
    message: string;
    color: string;
    icon: string;
    onConfirm?: () => void;
  } | null>(null);

  // Déclencher la caméra automatiquement si on vient de la liste des transferts
  useEffect(() => {
    if (transfertId && expectedLotId) {
      activateCamera();
    }
  }, [transfertId, expectedLotId]);

  const activateCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setInfoModal({
          title: 'Caméra non autorisée',
          message: 'Veuillez autoriser l’accès à la caméra dans vos réglages.',
          color: '#C0392B',
          icon: 'triangle-exclamation',
        });
        return;
      }
    }
    scannedRef.current = false;
    setCameraActive(true);
  };

  const handleVerify = async (hashOrNum?: string) => {
    const request = ++verificationRequest.current;
    scannedRef.current = true;
    setCameraActive(false);
    setJournalFailed(false);
    setTransferLookupFailed(false);
    setResult({ status: 'loading' });

    const lookup = await verifyMedication(hashOrNum ?? input);
    if (request !== verificationRequest.current) return;
    if (lookup.status === 'INVALID_INPUT') {
      setResult({ status: 'invalid_input' });
      return;
    }
    if (lookup.status === 'UNAVAILABLE') {
      setResult({ status: 'unavailable', source: lookup.source });
      return;
    }

    const logScan = async () => {
      const journal = await journalVerificationScan(lookup, 'pharmacie');
      if (request === verificationRequest.current) setJournalFailed(journal === 'FAILED');
    };
    if (lookup.status === 'NOT_FOUND') {
      setResult({ status: 'not_found', query: lookup.identifier, source: lookup.source });
      await logScan();
      return;
    }

    const lot = lookup.lot;
    if ((expectedLotNum && lot.numero_lot !== expectedLotNum)
      || (lookup.source === 'demo' && expectedLotId && lot.id !== expectedLotId)) {
      setInfoModal({
        title: 'Erreur de lot',
        message: `Le lot scanné (${lot.nom_medicament} N° ${lot.numero_lot}) ne correspond pas au lot attendu pour cette réception (${expectedLotNom} N° ${expectedLotNum}).\n\nVeuillez scanner le bon code QR.`,
        color: '#C0392B', icon: 'triangle-exclamation',
      });
      setResult({ status: 'idle', source: lookup.source });
      await logScan();
      return;
    }

    const expDate = new Date(lot.date_expiration);
    if (lot.statut_actuel === 'archive' || lot.date_expiration < new Date().toISOString().slice(0, 10)) {
      setResult({
        status: lot.statut_actuel === 'archive' ? 'archive' : 'expire', source: lookup.source,
        data: {
          nom: lot.nom_medicament, num: lot.numero_lot, dosage: lot.dosage ?? '—',
          fabricant: lot.utilisateurs?.nom_entite ?? 'Inconnu',
          expiration: expDate.toLocaleDateString('fr-FR'),
        },
      });
      await logScan();
      return;
    }

    const found: Extract<VerifyResult, { status: 'authentique' }> = {
      status: 'authentique', source: lookup.source, identifier: lookup.identifier,
      data: {
        nom: lot.nom_medicament, num: lot.numero_lot, dosage: lot.dosage ?? '—',
        fabricant: lot.utilisateurs?.nom_entite ?? 'Inconnu',
        expiration: expDate.toLocaleDateString('fr-FR'),
        statut: lot.statut_actuel.replace(/_/g, ' '),
      },
      pendingTransfer: null,
    };
    setResult(found);
    // Neither journaling nor transfer enrichment may overwrite the established lot result.
    const loadPendingTransfer = async () => {
      try {
        const targetTransferId = typeof transfertId === 'string' ? transfertId : transfertId?.[0];
        const pendingTransfer = await findPendingVerificationTransfer(lookup, targetTransferId);
        if (expectedLotId && pendingTransfer && pendingTransfer.lotId !== expectedLotId) {
          throw new Error('Transfer does not match the expected business lot');
        }
        if (request === verificationRequest.current) setResult({ ...found, pendingTransfer });
      } catch {
        if (request === verificationRequest.current) setTransferLookupFailed(true);
      }
    };
    await Promise.all([logScan(), loadPendingTransfer()]);
  };

  const handleConfirmReception = async (transfertId: string) => {
    try {
      setRecepting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (result.status !== 'authentique') throw new Error('A matching verification is required');
      await decideTransfer(transfertId, 'receptionne', result.identifier);

      setInfoModal({
        title: 'Succès',
        message: 'Le lot a été réceptionné et ajouté à votre stock avec succès.',
        color: '#27AE60',
        icon: 'circle-check',
        onConfirm: () => router.replace('/(pharmacie)/stock'),
      });
      setResult({ status: 'idle' });
      setInput('');
    } catch (e) {
      console.error(e);
      setInfoModal({
        title: 'Erreur',
        message: workflowError(e),
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
    } finally {
      setRecepting(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    handleVerify(data);
  };

  const reset = () => {
    verificationRequest.current++;
    setJournalFailed(false);
    setTransferLookupFailed(false);
    setResult({ status: 'idle' });
    setInput('');
    scannedRef.current = false;
  };

  return (
    <ScrollView className="flex-1 bg-bg" keyboardShouldPersistTaps="handled">
      <View style={isDesktop ? { maxWidth: 840, width: '100%', alignSelf: 'center', padding: 24 } : { padding: 20 }}>
        <VerificationNotice source={result.source} journalFailed={journalFailed} />
        {transferLookupFailed && (
          <Text accessibilityRole="alert" className="text-navy bg-orange-50 p-3 rounded-xl mb-4">Lot trouvé. La recherche du transfert est indisponible.</Text>
        )}
        {/* Bannière Mode Réception si actif */}
        {expectedLotId && result.status === 'idle' && (
          <View className="bg-pharma-orange/10 border-l-4 border-pharma-orange p-3 rounded-r-xl mb-4">
            <Text className="text-pharma-orange font-bold text-xs uppercase tracking-wider">Mode Réception de Lot</Text>
            <Text className="text-navy font-semibold text-sm mt-1">Veuillez scanner le lot attendu :</Text>
            <Text className="text-text text-xs mt-0.5">{expectedLotNom} (N° {expectedLotNum})</Text>
          </View>
        )}

        {result.status === 'idle' && (
          <View style={isDesktop ? { flexDirection: 'row', gap: 16, alignItems: 'stretch', marginBottom: 16 } : undefined}>
            {/* Zone Caméra (colonne gauche sur desktop) */}
            <View style={isDesktop ? { flex: 1.2, marginBottom: 0 } : { width: '100%', marginBottom: 24 }}>
              {cameraActive && permission?.granted ? (
                <View style={[styles.cameraFrame, isDesktop ? { height: '100%', minHeight: 280 } : undefined]}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                  <View style={styles.scanLine} />
                  <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={handleBarcodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  />
                  <TouchableOpacity onPress={() => setCameraActive(false)} style={styles.cancelBtn}>
                    <Text className="text-white text-xs font-bold">Annuler</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={activateCamera}
                  style={[styles.cameraFramePlaceholder, isDesktop ? { height: '100%', minHeight: 240 } : undefined]}
                  className="bg-white border border-blue-light rounded-2xl items-center justify-center p-6 w-full"
                  activeOpacity={0.8}
                >
                  <FAIcon name="camera" size={48} color="#27AE60" family="FontAwesome6" />
                  <Text className="text-navy font-bold text-base mt-4">Activer la caméra</Text>
                  <Text className="text-muted text-xs mt-2 text-center">
                    Scannez le code QR sur la boîte pour authentifier ou réceptionner le lot
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Saisie Manuelle (colonne droite sur desktop) */}
            <View style={isDesktop ? { flex: 1 } : undefined} className="bg-white border border-blue-light rounded-2xl p-5 justify-center shadow-sm">
              <Text className="text-navy font-bold text-sm mb-2">Saisie manuelle du lot</Text>
              <TextInput
                className="bg-bg border border-blue-light rounded-xl h-12 px-4 text-sm text-navy mb-3"
                placeholder="Ex : FAB-2026-049"
                placeholderTextColor="#bbb"
                value={input}
                onChangeText={setInput}
                autoCapitalize="characters"
                onSubmitEditing={() => handleVerify()}
              />
              <TouchableOpacity
                onPress={() => handleVerify()}
                disabled={!input.trim()}
                className="h-12 bg-navy rounded-xl items-center justify-center"
                style={{ opacity: !input.trim() ? 0.6 : 1 }}
              >
                <Text className="text-white font-bold text-sm">Vérifier le lot</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Résultat : Chargement */}
        {result.status === 'loading' && (
          <View style={isDesktop ? { maxWidth: 500, alignSelf: 'center', width: '100%' } : undefined}>
            <View className="items-center justify-center py-20 bg-white rounded-2xl border border-blue-light p-6 shadow-sm">
              <ActivityIndicator size="large" color="#27AE60" />
              <Text className="text-navy font-bold text-base mt-4">Vérification en cours...</Text>
            </View>
          </View>
        )}

        {/* Résultat : Authentique */}
        {result.status === 'authentique' && (
          <View style={isDesktop ? { maxWidth: 540, alignSelf: 'center', width: '100%' } : undefined}>
            <View className="bg-white rounded-2xl border border-blue-light p-5 shadow-sm">
              <View className="flex-row items-center gap-3 mb-4 bg-green-50 p-3 rounded-xl">
                <View className="w-8 h-8 rounded-full bg-pharma-green items-center justify-center">
                  <FAIcon name="check" size={14} color="#fff" family="FontAwesome6" />
                </View>
                <View>
                  <Text className="text-pharma-green font-black text-sm uppercase tracking-wider">Médicament Authentique</Text>
                  <Text className="text-muted text-[10px] mt-0.5">Enregistré sur PharmaTrace</Text>
                </View>
              </View>

              <Text className="text-navy font-black text-lg mb-4">{result.data.nom}</Text>
              
              <ResultRow label="Numéro de lot" value={result.data.num} />
              <ResultRow label="Dosage" value={result.data.dosage} />
              <ResultRow label="Fabricant" value={result.data.fabricant} />
              <ResultRow label="Date d'expiration" value={result.data.expiration} />
              <ResultRow label="Statut actuel" value={result.data.statut} isStatus />

              {/* Bouton de Réception s'il y a un transfert en attente */}
              {result.pendingTransfer ? (
                <View className="bg-pharma-orange/10 border border-pharma-orange/30 rounded-xl p-4 mt-5">
                  <View className="flex-row items-center gap-2 mb-2">
                    <FAIcon name="truck-ramp-box" size={14} color="#E67E22" family="FontAwesome6" />
                    <Text className="text-pharma-orange font-bold text-sm">Transfert en attente trouvé</Text>
                  </View>
                  <Text className="text-muted text-xs mb-3">
                    Ce lot vous a été expédié par {result.pendingTransfer.expediteur} (Quantité: {result.pendingTransfer.qte} unités).
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleConfirmReception(result.pendingTransfer!.id)}
                    disabled={recepting}
                    className="w-full h-11 bg-pharma-green rounded-xl items-center justify-center flex-row gap-2"
                  >
                    {recepting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <FAIcon name="check" size={12} color="#fff" family="FontAwesome6" />
                        <Text className="text-white font-bold text-sm">Réceptionner ce lot</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity onPress={reset} className="mt-6 w-full h-12 bg-navy rounded-xl items-center justify-center">
                <Text className="text-white font-bold text-sm">Scanner un autre médicament</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Résultat : Expire */}
        {(result.status === 'expire' || result.status === 'archive') && (
          <View style={isDesktop ? { maxWidth: 540, alignSelf: 'center', width: '100%' } : undefined}>
            <View className="bg-white rounded-2xl border border-blue-light p-5 shadow-sm">
              <View className="flex-row items-center gap-3 mb-4 bg-orange-50 p-3 rounded-xl">
                <View className="w-8 h-8 rounded-full bg-pharma-orange items-center justify-center">
                  <FAIcon name="triangle-exclamation" size={14} color="#fff" family="FontAwesome6" />
                </View>
                <View>
                  <Text className="text-pharma-orange font-black text-sm uppercase tracking-wider">{result.status === 'archive' ? 'Lot archivé' : 'Lot Expiré'}</Text>
                  <Text className="text-muted text-[10px] mt-0.5">{result.status === 'archive' ? 'La correspondance existe, mais le lot est archivé.' : 'Ce produit a dépassé sa date limite'}</Text>
                </View>
              </View>

              <Text className="text-navy font-black text-lg mb-4">{result.data.nom}</Text>
              
              <ResultRow label="Numéro de lot" value={result.data.num} />
              <ResultRow label="Dosage" value={result.data.dosage} />
              <ResultRow label="Fabricant" value={result.data.fabricant} />
              <ResultRow label={result.status === 'archive' ? 'Expiration' : 'Expiré le'} value={result.data.expiration} />

              <View className="bg-red-50 p-4 rounded-xl border border-red-100 mt-4 items-center">
                <Text className="text-pharma-red font-bold text-sm">{result.status === 'archive' ? 'STATUT ARCHIVÉ' : 'INTERDICTION DE VENTE'}</Text>
                <Text className="text-muted text-xs mt-1 text-center">{result.status === 'archive' ? 'Vérifiez la situation du lot avant toute réception.' : 'Ce lot doit être retiré du stock et retourné pour destruction.'}</Text>
              </View>

              <TouchableOpacity onPress={reset} className="mt-6 w-full h-12 bg-navy rounded-xl items-center justify-center">
                <Text className="text-white font-bold text-sm">Scanner un autre médicament</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(result.status === 'not_found' || result.status === 'unavailable' || result.status === 'invalid_input') && (
          <View style={isDesktop ? { maxWidth: 540, alignSelf: 'center', width: '100%' } : undefined}>
            <View className="bg-white rounded-2xl border border-blue-light p-5 shadow-sm">
              <Text accessibilityRole="header" className="text-navy font-black text-lg mb-4">
                {result.status === 'unavailable' ? 'Vérification indisponible' : result.status === 'invalid_input' ? 'Code invalide' : 'Lot non trouvé'}
              </Text>
              <Text className="text-muted text-sm">
                {result.status === 'unavailable'
                  ? 'La recherche n’a pas pu aboutir. Réessayez plus tard ; aucune conclusion sur le lot ne peut être établie.'
                  : result.status === 'invalid_input'
                    ? 'Saisissez un numéro de lot ou un code QR valide (100 caractères maximum pour le code).'
                    : 'Aucun lot correspondant à ce code n’a été trouvé dans la source consultée.'}
              </Text>
              {result.status === 'not_found' && <Text className="text-navy font-mono mt-4">{result.query}</Text>}
              <TouchableOpacity onPress={reset} className="mt-6 w-full h-12 bg-navy rounded-xl items-center justify-center">
                <Text className="text-white font-bold text-sm">Revenir à la vérification</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Info/Success/Error Modal */}
      <ConfirmModal
        visible={!!infoModal}
        title={infoModal?.title ?? ''}
        message={infoModal?.message ?? ''}
        confirmText="OK"
        confirmColor={infoModal?.color}
        icon={infoModal?.icon}
        onConfirm={async () => {
          if (infoModal?.onConfirm) {
            infoModal.onConfirm();
          }
          setInfoModal(null);
        }}
      />
    </ScrollView>
  );
}

function ResultRow({ label, value, isStatus }: { label: string; value: string; isStatus?: boolean }) {
  return (
    <View className="flex-row justify-between py-2.5 border-b border-bg">
      <Text className="text-muted text-xs">{label}</Text>
      {isStatus ? (
        <View className="bg-[#E8F8EC] px-2 py-0.5 rounded-full">
          <Text className="text-[#27AE60] text-xs font-bold uppercase">{value}</Text>
        </View>
      ) : (
        <Text className="text-navy font-semibold text-xs text-right flex-1 ml-4">{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cameraFrame: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cameraFramePlaceholder: {
    height: 240,
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#27AE60',
    zIndex: 10,
  },
  cornerTL: { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: 'rgba(39,174,96,0.6)',
    zIndex: 10,
  },
  cancelBtn: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
    zIndex: 20,
  },
});
