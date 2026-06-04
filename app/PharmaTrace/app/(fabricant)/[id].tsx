import React, { useCallback, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Share, Platform, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect, useLocalSearchParams, Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import { VERIFICATION_BASE_URL } from '../../constants/config';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as MediaLibrary from 'expo-media-library';

function formatDate(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
}

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [lot, setLot] = useState<any | null>(null);
  const qrRef = useRef<any>(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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

  const saveToGallery = async (base64Data: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', "L'accès à la galerie photo est requis pour enregistrer le code QR.");
        return;
      }

      const filename = `${FileSystem.cacheDirectory}QR_${lot.numero_lot}.png`;
      await FileSystem.writeAsStringAsync(filename, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const asset = await MediaLibrary.createAssetAsync(filename);
      const album = await MediaLibrary.getAlbumAsync('PharmaTrace');
      if (album === null) {
        await MediaLibrary.createAlbumAsync('PharmaTrace', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      Alert.alert('Succès', 'Le QR code a été enregistré avec succès dans votre Galerie Photo (Album PharmaTrace).');
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', "Impossible d'enregistrer dans la galerie.");
    }
  };

  const saveToCustomFolder = async (base64Data: string) => {
    try {
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
        
        Alert.alert('Succès', 'Le QR code a été enregistré avec succès.');
      }
    } catch (e: any) {
      console.error(e);
      const errMsg = (e.message || String(e) || '').toLowerCase();
      if (errMsg.includes("writable") || errMsg.includes("write") || errMsg.includes("permission") || errMsg.includes("saf") || errMsg.includes("downloads")) {
        Alert.alert(
          'Dossier protégé',
          "Android interdit l'écriture directe à la racine de Téléchargements. Veuillez créer ou sélectionner un sous-dossier (ex: créez un dossier 'PharmaTrace' et sélectionnez-le).",
          [
            { text: 'Enregistrer dans la Galerie', onPress: () => saveToGallery(base64Data) },
            { text: 'Partager / Envoyer', onPress: () => saveToCacheAndShare(base64Data) },
            { text: 'Retour', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Erreur', "Impossible d'enregistrer dans le dossier.");
      }
    }
  };

  const saveToCacheAndShare = async (base64Data: string) => {
    try {
      const filename = `${FileSystem.cacheDirectory}QR_${lot.numero_lot}.png`;
      await FileSystem.writeAsStringAsync(filename, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(filename, {
        mimeType: 'image/png',
        dialogTitle: `Télécharger le QR Code du lot ${lot.numero_lot}`,
        UTI: 'public.png',
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Le partage a échoué.');
    }
  };

  const onDownloadQR = async () => {
    if (!qrRef.current) {
      Alert.alert('Erreur', 'QR code non disponible pour téléchargement.');
      return;
    }

    qrRef.current.toDataURL(async (base64Data: string) => {
      try {
        if (Platform.OS === 'android') {
          Alert.alert(
            'Télécharger le QR Code',
            'Choisissez où enregistrer l\'image du code QR :',
            [
              {
                text: 'Dans la Galerie Photo',
                onPress: () => saveToGallery(base64Data),
              },
              {
                text: 'Dans un Dossier (Downloads)',
                onPress: () => saveToCustomFolder(base64Data),
              },
              {
                text: 'Annuler',
                style: 'cancel',
              }
            ]
          );
        } else {
          await saveToCacheAndShare(base64Data);
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
      const qrImageUrl = `data:image/png;base64,${base64Data}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                padding: 20px;
                color: #1A3A5C;
                background-color: #fff;
                text-align: center;
              }
              .header {
                font-size: 24px;
                font-weight: 800;
                letter-spacing: 1px;
                margin-bottom: 5px;
                color: #1A3A5C;
              }
              .tagline {
                font-size: 11px;
                color: #6B7D90;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 25px;
                font-weight: bold;
                text-align: center;
              }
              .qr-container {
                border: 2px solid #E6EEF8;
                border-radius: 20px;
                padding: 20px;
                background-color: #fff;
                box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                margin: 20px auto;
                display: inline-block;
              }
              .qr-image {
                width: 200px;
                height: 200px;
                display: block;
              }
              .lot-number {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 5px;
                color: #1A3A5C;
                text-align: center;
              }
              .med-name {
                font-size: 15px;
                color: #6B7D90;
                margin-bottom: 25px;
                text-align: center;
              }
              .info-table {
                width: 100%;
                max-width: 360px;
                margin: 0 auto 25px auto;
                border-top: 1px solid #E6EEF8;
                padding-top: 15px;
                border-collapse: collapse;
              }
              .info-table tr {
                height: 28px;
              }
              .info-label {
                text-align: left;
                font-size: 13px;
                color: #9AA9B8;
              }
              .info-value {
                text-align: right;
                font-size: 13px;
                font-weight: 600;
                color: #1A3A5C;
              }
              .signature-container {
                background-color: #F7F9FC;
                border-radius: 12px;
                padding: 12px 20px;
                margin: 0 auto;
                max-width: 360px;
                border: 1px solid #E6EEF8;
                box-sizing: border-box;
              }
              .signature-title {
                font-size: 9px;
                font-weight: bold;
                color: #9AA9B8;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 5px;
                text-align: center;
              }
              .signature-hash {
                font-size: 10px;
                font-family: monospace;
                color: #1A3A5C;
                word-break: break-all;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">PharmaTrace</div>
            <div class="tagline">Certificat de Traçabilité Immuable</div>
            
            <div class="qr-container">
              <img class="qr-image" src="${qrImageUrl}" />
            </div>
            
            <div class="lot-number">LOT ${lot.numero_lot}</div>
            <div class="med-name">${lot.nom_medicament} ${lot.dosage ? `(${lot.dosage})` : ''}</div>
            
            <table class="info-table">
              <tr>
                <td class="info-label">Fabricant :</td>
                <td class="info-value">${lot.fabricant_nom || 'Laboratoire Agréé'}</td>
              </tr>
              <tr>
                <td class="info-label">Date de Fabrication :</td>
                <td class="info-value">${formatDate(lot.date_fabrication)}</td>
              </tr>
              <tr>
                <td class="info-label">Date d'Expiration :</td>
                <td class="info-value">${formatDate(lot.date_expiration)}</td>
              </tr>
              <tr>
                <td class="info-label">Quantité Initiale :</td>
                <td class="info-value">${lot.quantite_initiale?.toLocaleString?.() ?? lot.quantite_initiale} unités</td>
              </tr>
            </table>
            
            <div class="signature-container">
              <div class="signature-title">Signature Numérique SHA-256</div>
              <div class="signature-hash">${lot.hash_sha256}</div>
            </div>
          </body>
        </html>
      `;

      try {
        // 1. Tenter l'impression directe (avec le HTML simplifié et sans flexbox)
        await Print.printAsync({ html });
      } catch (printErr) {
        console.error("Direct printing failed, falling back to PDF sharing:", printErr);
        try {
          // 2. Fallback : Générer un fichier PDF, le copier sous un nom propre et ouvrir le partage
          const printResult = await Print.printToFileAsync({ html });
          const cleanUri = `${FileSystem.cacheDirectory}Certificat_Lot_${lot.numero_lot}.pdf`;
          
          // Copier vers un nom de fichier lisible au lieu du UUID temporaire
          await FileSystem.copyAsync({
            from: printResult.uri,
            to: cleanUri
          });

          await Sharing.shareAsync(cleanUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Certificat du lot ${lot.numero_lot}`,
            UTI: 'com.adobe.pdf',
          });
        } catch (err) {
          console.error("Error during fallback PDF generation or sharing:", err);
          Alert.alert('Erreur', "L'impression ou le partage a échoué.");
        }
      }
    });
  };

  // ─── Shared sub-components ────────────────────────────────────────
  const qrSize = isDesktop ? 160 : 200;
  const qrContainerSize = isDesktop ? 180 : 220;

  const qrSection = (
    <View className="bg-white rounded-xl items-center" style={isDesktop ? { flex: 1, padding: 16 } : { padding: 24, marginBottom: 16 }}>
      <Text className="text-muted text-xs uppercase mb-2">QR code de traçabilité</Text>
      <View style={{ width: qrContainerSize, height: qrContainerSize, borderRadius: 12, borderWidth: 1, borderColor: '#E6EEF8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fff' }}>
        {lot.qr_code_url || lot.hash_sha256 ? (
          <QRCode
            getRef={(c) => (qrRef.current = c)}
            value={
              lot.qr_code_url && lot.qr_code_url.includes('api.qrserver.com')
                ? decodeURIComponent(lot.qr_code_url.split('data=')[1] || '')
                : lot.qr_code_url || `${VERIFICATION_BASE_URL}?hash=${lot.hash_sha256}`
            }
            size={qrSize}
          />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <FAIcon name="qrcode" size={64} color="#ccc" family="FontAwesome6" />
            <Text className="text-muted text-xs mt-2">QR non disponible</Text>
          </View>
        )}
      </View>

      <Text className="text-navy font-semibold text-sm mt-2">{lot.numero_lot}</Text>
      <Text className="text-muted text-xs">{lot.nom_medicament}</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, width: '100%' }}>
        <TouchableOpacity onPress={onDownloadQR} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E6EEF8', backgroundColor: '#fff' }}>
          <FAIcon name="download" size={12} color="#1A3A5C" family="FontAwesome6" />
          <Text style={{ color: '#1A3A5C', fontWeight: '600', fontSize: 12 }}>Télécharger</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onPrint} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E6EEF8', backgroundColor: '#fff' }}>
          <FAIcon name="print" size={12} color="#1A3A5C" family="FontAwesome6" />
          <Text style={{ color: '#1A3A5C', fontWeight: '600', fontSize: 12 }}>Imprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const detailsSection = (
    <View className="bg-white rounded-xl" style={isDesktop ? { flex: 1, padding: 14 } : { padding: 16, marginBottom: 16 }}>
      <Text className="text-navy font-bold text-sm mb-2">Détails du lot</Text>
      <View className="flex-row justify-between py-1.5 border-b border-bg"><Text className="text-muted text-sm">Médicament</Text><Text className="font-semibold text-sm">{lot.nom_medicament}</Text></View>
      <View className="flex-row justify-between py-1.5 border-b border-bg"><Text className="text-muted text-sm">N° de lot</Text><Text className="text-blue font-semibold text-sm">{lot.numero_lot}</Text></View>
      <View className="flex-row justify-between py-1.5 border-b border-bg"><Text className="text-muted text-sm">Quantité</Text><Text className="font-semibold text-sm">{lot.quantite_initiale?.toLocaleString?.() ?? lot.quantite_initiale} unités</Text></View>
      <View className="flex-row justify-between py-1.5 border-b border-bg"><Text className="text-muted text-sm">Fabrication</Text><Text className="font-semibold text-sm">{formatDate(lot.date_fabrication)}</Text></View>
      <View className="flex-row justify-between py-1.5 border-b border-bg"><Text className="text-muted text-sm">Expiration</Text><Text className={`font-semibold text-sm ${expired ? 'text-pharma-orange' : 'text-green-600'}`}>{formatDate(lot.date_expiration)}</Text></View>
      <View className="flex-row justify-between py-1.5"><Text className="text-muted text-sm">Statut</Text><View style={{ backgroundColor: lot.statut_actuel === 'en_pharmacie' ? '#E8F8EC' : '#EEF4FB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 }}><Text style={{ color: lot.statut_actuel === 'en_pharmacie' ? '#27AE60' : '#2E6DA4', fontWeight: '700', fontSize: 12 }}>{(lot.statut_actuel ?? '').replace('_', ' ')}</Text></View></View>
    </View>
  );

  const bottomSection = (
    <View style={isDesktop ? { flexDirection: 'row', gap: 12, alignItems: 'stretch' } : undefined}>
      <View className="bg-navy/90 rounded-xl" style={isDesktop ? { flex: 1, padding: 12 } : { padding: 16, marginBottom: 16 }}>
        <View className="flex-row items-center gap-2">
          <FAIcon name="lock" size={10} color="rgba(255,255,255,0.8)" family="FontAwesome6" />
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Empreinte SHA-256</Text>
        </View>
        <Text className="text-white font-mono" style={{ fontSize: 12, marginTop: 4 }}>{String(lot.hash_sha256).slice(0, 20)}...</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 3 }}>Immuable — ne peut jamais être falsifiée</Text>
      </View>

      <Link href={{ pathname: '/(fabricant)/nouveau-transfert', params: { lotId: String(lot.id) } }} asChild>
        <TouchableOpacity className="bg-navy rounded-xl items-center justify-center" style={isDesktop ? { flex: 1, paddingVertical: 12 } : { width: '100%', paddingVertical: 16, marginBottom: 32 }}>
          <Text className="text-white font-bold" style={{ fontSize: 13 }}>Initier un transfert →</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-bg">
      <View style={isDesktop ? { padding: 16 } : { padding: 16 }}>
        {isDesktop ? (
          <>
            {/* Desktop: two columns */}
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}>
              {qrSection}
              {detailsSection}
            </View>
            {/* Bottom: SHA + Transfer button side by side */}
            {bottomSection}
          </>
        ) : (
          <>
            {/* Mobile: stacked layout */}
            {qrSection}
            {detailsSection}
            {bottomSection}
          </>
        )}
      </View>
    </ScrollView>
  );
}
