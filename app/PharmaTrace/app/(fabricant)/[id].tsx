import React, { useCallback, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Share, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect, useLocalSearchParams, Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import { VERIFICATION_BASE_URL } from '../../constants/config';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

function formatDate(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
}

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [lot, setLot] = useState<any | null>(null);
  const qrRef = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (!id) return;
      const { data, error } = await supabase
        .from('lots_avec_fabricant')
        .select('id, numero_lot, nom_medicament, dosage, quantite_initiale, quantite_actuelle, date_fabrication, date_expiration, qr_code_url, hash_sha256, statut_actuel, fabricant_nom')
        .eq('id', id)
        .single();
      if (error) throw error;
      setLot(data ?? null);
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', "Impossible de charger le lot.");
      setLot(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => { load(); }, [load])
  );

  if (loading) return (<View className="flex-1 items-center justify-center bg-bg"><ActivityIndicator size="large" color="#1A3A5C"/></View>);
  if (!lot) return (<View className="flex-1 items-center justify-center bg-bg"><Text>Aucun lot trouvé.</Text></View>);

  const expired = lot.date_expiration ? new Date(lot.date_expiration) < new Date() : false;

  const onDownloadQR = async () => {
    if (!qrRef.current) {
      Alert.alert('Erreur', 'QR code non disponible pour téléchargement.');
      return;
    }

    qrRef.current.toDataURL(async (base64Data: string) => {
      try {
        if (Platform.OS === 'android') {
          // Android : Utiliser le Storage Access Framework pour enregistrer directement dans le dossier choisi (ex: Downloads)
          const { StorageAccessFramework } = FileSystem;
          const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
          
          if (permissions.granted) {
            const directoryUri = permissions.directoryUri;
            const fileUri = await StorageAccessFramework.createFileAsync(
              directoryUri, 
              `QR_${lot.numero_lot}`, 
              'image/png'
            );
            
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            Alert.alert('Succès', 'Le QR code a été téléchargé et enregistré dans votre dossier.');
          } else {
            // Si l'utilisateur refuse la sélection de dossier, on fallback sur le partage natif pour ne pas le bloquer
            const filename = `${FileSystem.cacheDirectory}QR_${lot.numero_lot}.png`;
            await FileSystem.writeAsStringAsync(filename, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            await Sharing.shareAsync(filename, {
              mimeType: 'image/png',
              dialogTitle: `Télécharger le QR Code du lot ${lot.numero_lot}`,
              UTI: 'public.png',
            });
          }
        } else {
          // iOS : Utiliser le partage natif (qui intègre l'option "Enregistrer l'image" dans Photos de façon native)
          const filename = `${FileSystem.cacheDirectory}QR_${lot.numero_lot}.png`;
          await FileSystem.writeAsStringAsync(filename, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          await Sharing.shareAsync(filename, {
            mimeType: 'image/png',
            dialogTitle: `Télécharger le QR Code du lot ${lot.numero_lot}`,
            UTI: 'public.png',
          });
        }
      } catch (e) {
        console.error(e);
        Alert.alert('Erreur', 'Le téléchargement a échoué.');
      }
    });
  };

  const onPrint = () => {
    if (!qrRef.current) {
      Alert.alert('Erreur', 'QR code non disponible pour impression.');
      return;
    }

    qrRef.current.toDataURL(async (base64Data: string) => {
      try {
        const html = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
              <style>
                body {
                  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  padding: 40px;
                  color: #1A3A5C;
                  background-color: #fff;
                  text-align: center;
                }
                .header {
                  font-size: 28px;
                  font-weight: 800;
                  letter-spacing: 1px;
                  margin-bottom: 5px;
                  color: #1A3A5C;
                }
                .tagline {
                  font-size: 12px;
                  color: #6B7D90;
                  text-transform: uppercase;
                  letter-spacing: 2px;
                  margin-bottom: 30px;
                  font-weight: bold;
                }
                .qr-container {
                  border: 2px solid #E6EEF8;
                  border-radius: 20px;
                  padding: 20px;
                  background-color: #fff;
                  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                  margin-bottom: 30px;
                  display: inline-block;
                }
                .qr-image {
                  width: 250px;
                  height: 250px;
                }
                .lot-number {
                  font-size: 22px;
                  font-weight: bold;
                  margin-bottom: 5px;
                  color: #1A3A5C;
                }
                .med-name {
                  font-size: 16px;
                  color: #6B7D90;
                  margin-bottom: 25px;
                }
                .info-box {
                  width: 100%;
                  max-width: 400px;
                  border-top: 1px solid #E6EEF8;
                  padding-top: 20px;
                  margin-bottom: 25px;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 8px;
                  font-size: 13px;
                }
                .info-label {
                  color: #9AA9B8;
                }
                .info-value {
                  font-weight: 600;
                  color: #1A3A5C;
                }
                .signature-container {
                  background-color: #F7F9FC;
                  border-radius: 12px;
                  padding: 12px 20px;
                  width: 100%;
                  max-width: 400px;
                  border: 1px solid #E6EEF8;
                }
                .signature-title {
                  font-size: 10px;
                  font-weight: bold;
                  color: #9AA9B8;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  margin-bottom: 5px;
                }
                .signature-hash {
                  font-size: 11px;
                  font-family: monospace;
                  color: #1A3A5C;
                  word-break: break-all;
                }
              </style>
            </head>
            <body>
              <div class="header">PharmaTrace</div>
              <div class="tagline">Certificat de Traçabilité Immuable</div>
              
              <div class="qr-container">
                <img class="qr-image" src="data:image/png;base64,${base64Data}" />
              </div>
              
              <div class="lot-number">LOT ${lot.numero_lot}</div>
              <div class="med-name">${lot.nom_medicament} ${lot.dosage ? `(${lot.dosage})` : ''}</div>
              
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Fabricant :</span>
                  <span class="info-value">${lot.fabricant_nom || 'Laboratoire Agréé'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Date de Fabrication :</span>
                  <span class="info-value">${formatDate(lot.date_fabrication)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Date d'Expiration :</span>
                  <span class="info-value">${formatDate(lot.date_expiration)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Quantité Initiale :</span>
                  <span class="info-value">${lot.quantite_initiale?.toLocaleString?.() ?? lot.quantite_initiale} unités</span>
                </div>
              </div>
              
              <div class="signature-container">
                <div class="signature-title">Signature Numérique SHA-256</div>
                <div class="signature-hash">${lot.hash_sha256}</div>
              </div>
            </body>
          </html>
        `;
        
        // Android/iOS crash fix: print directly via generated PDF file instead of passing raw HTML to print manager
        const { uri } = await Print.printToFileAsync({ html });
        await Print.printAsync({ uri });
      } catch (error) {
        console.error(error);
        Alert.alert('Erreur', "L'impression a échoué.");
      }
    });
  };

  return (
    <ScrollView className="flex-1 bg-bg">
      <View className="p-4">
        <View className="bg-white rounded-xl p-6 items-center mb-4">
          <Text className="text-muted text-xs uppercase mb-3">QR code de traçabilité</Text>
          <View style={{ width: 220, height: 220, borderRadius: 12, borderWidth: 1, borderColor: '#E6EEF8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fff' }}>
            {lot.qr_code_url || lot.hash_sha256 ? (
              <QRCode
                getRef={(c) => (qrRef.current = c)}
                value={
                  lot.qr_code_url && lot.qr_code_url.includes('api.qrserver.com')
                    ? decodeURIComponent(lot.qr_code_url.split('data=')[1] || '')
                    : lot.qr_code_url || `${VERIFICATION_BASE_URL}?hash=${lot.hash_sha256}`
                }
                size={200}
              />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <FAIcon name="qrcode" size={64} color="#ccc" family="FontAwesome6" />
                <Text className="text-muted text-xs mt-2">QR non disponible</Text>
              </View>
            )}
          </View>
 
          <Text className="text-navy font-semibold text-base mt-3">{lot.numero_lot}</Text>
          <Text className="text-muted text-sm">{lot.nom_medicament}</Text>
 
          <View style={{ width: '100%', marginTop: 16 }}>
            <TouchableOpacity onPress={onDownloadQR} className="w-full bg-white border border-blue-light rounded-xl py-3 items-center mb-3 flex-row justify-center gap-2">
              <FAIcon name="download" size={14} color="#1A3A5C" family="FontAwesome6" />
              <Text className="text-navy font-semibold">Télécharger</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onPrint} className="w-full bg-white border border-blue-light rounded-xl py-3 items-center flex-row justify-center gap-2">
              <FAIcon name="print" size={14} color="#1A3A5C" family="FontAwesome6" />
              <Text className="text-navy font-semibold">Imprimer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-navy font-bold text-sm mb-3">Détails du lot</Text>
          <View className="flex-row justify-between py-2 border-b border-bg"><Text className="text-muted">Médicament</Text><Text className="font-semibold">{lot.nom_medicament}</Text></View>
          <View className="flex-row justify-between py-2 border-b border-bg"><Text className="text-muted">N° de lot</Text><Text className="text-blue font-semibold">{lot.numero_lot}</Text></View>
          <View className="flex-row justify-between py-2 border-b border-bg"><Text className="text-muted">Quantité</Text><Text className="font-semibold">{lot.quantite_initiale?.toLocaleString?.() ?? lot.quantite_initiale} unités</Text></View>
          <View className="flex-row justify-between py-2 border-b border-bg"><Text className="text-muted">Fabrication</Text><Text className="font-semibold">{formatDate(lot.date_fabrication)}</Text></View>
          <View className="flex-row justify-between py-2 border-b border-bg"><Text className="text-muted">Expiration</Text><Text className={`font-semibold ${expired ? 'text-pharma-orange' : 'text-green-600'}`}>{formatDate(lot.date_expiration)}</Text></View>
          <View className="flex-row justify-between py-2"><Text className="text-muted">Statut</Text><View style={{ backgroundColor: lot.statut_actuel === 'en_pharmacie' ? '#E8F8EC' : '#EEF4FB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }}><Text style={{ color: lot.statut_actuel === 'en_pharmacie' ? '#27AE60' : '#2E6DA4', fontWeight: '700' }}>{(lot.statut_actuel ?? '').replace('_', ' ')}</Text></View></View>
        </View>

        <View className="bg-navy/90 rounded-xl p-4 mb-6">
          <View className="flex-row items-center gap-2">
            <FAIcon name="lock" size={11} color="rgba(255,255,255,0.8)" family="FontAwesome6" />
            <Text className="text-xs text-white/80">Empreinte SHA-256</Text>
          </View>
          <Text className="text-white font-mono mt-2">{String(lot.hash_sha256).slice(0, 12)}...</Text>
          <Text className="text-white/70 text-xs mt-2">Immuable — ne peut jamais être falsifiée</Text>
        </View>

        <Link href={{ pathname: '/(fabricant)/nouveau-transfert', params: { lotId: String(lot.id) } }} asChild>
          <TouchableOpacity className="w-full bg-navy rounded-xl py-4 items-center mb-8">
            <Text className="text-white font-bold">Initier un transfert →</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}
