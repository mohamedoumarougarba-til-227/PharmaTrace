import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect, useLocalSearchParams, Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import { VERIFICATION_BASE_URL } from '../../constants/config';

function formatDate(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
}

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [lot, setLot] = useState<any | null>(null);

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

  const onShareQR = async () => {
    try {
      const qrValue = lot.qr_code_url && lot.qr_code_url.includes('api.qrserver.com')
        ? decodeURIComponent(lot.qr_code_url.split('data=')[1] || '')
        : lot.qr_code_url || `${VERIFICATION_BASE_URL}?hash=${lot.hash_sha256}`;
        
      if (!qrValue) { Alert.alert('QR absent'); return; }
      await Share.share({ message: `QR code du lot ${lot.numero_lot} — ${lot.nom_medicament}\n${qrValue}` });
    } catch (e) { console.error(e); }
  };

  const onPrint = () => {
    Alert.alert('Imprimer', 'Impression non implémentée dans cette démo.');
  };

  return (
    <ScrollView className="flex-1 bg-bg">
      <View className="p-4">
        <View className="bg-white rounded-xl p-6 items-center mb-4">
          <Text className="text-muted text-xs uppercase mb-3">QR code de traçabilité</Text>
          <View style={{ width: 220, height: 220, borderRadius: 12, borderWidth: 1, borderColor: '#E6EEF8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fff' }}>
            {lot.qr_code_url || lot.hash_sha256 ? (
              <QRCode
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
            <TouchableOpacity onPress={onShareQR} className="w-full bg-white border border-blue-light rounded-xl py-3 items-center mb-3 flex-row justify-center gap-2">
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
