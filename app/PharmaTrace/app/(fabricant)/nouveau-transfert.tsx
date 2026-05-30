import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';

type PharmacieOption = {
  id: string;
  nom_entite: string;
  adresse: string | null;
  ville: string | null;
};

type LotInfo = {
  id: string;
  numero_lot: string;
  nom_medicament: string;
  quantite_initiale: number;
  quantite_actuelle: number | null;
};

export default function NouveauTransfertScreen() {
  const { lotId } = useLocalSearchParams<{ lotId?: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pharmacies, setPharmacies] = useState<PharmacieOption[]>([]);
  const [selectedPharmacieId, setSelectedPharmacieId] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [quantite, setQuantite] = useState('1');
  const [notes, setNotes] = useState('');
  const [lot, setLot] = useState<LotInfo | null>(null);

  const availableQty = useMemo(() => {
    if (!lot) return 0;
    return lot.quantite_actuelle ?? lot.quantite_initiale;
  }, [lot]);

  const selectedPharmacie = useMemo(
    () => pharmacies.find((p) => p.id === selectedPharmacieId) ?? null,
    [pharmacies, selectedPharmacieId],
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      const [pharmaciesRes, lotRes] = await Promise.all([
        supabase
          .from('utilisateurs')
          .select('id, nom_entite, adresse, ville')
          .eq('role', 'pharmacie')
          .eq('statut', 'actif')
          .order('nom_entite', { ascending: true }),
        lotId
          ? supabase
              .from('lots_medicaments')
              .select('id, numero_lot, nom_medicament, quantite_initiale, quantite_actuelle')
              .eq('id', lotId)
              .eq('fabricant_id', session.user.id)
              .single()
          : Promise.resolve({ data: null, error: null } as any),
      ]);

      if (pharmaciesRes.error) throw pharmaciesRes.error;
      if (lotRes?.error) throw lotRes.error;

      const dataPharmacies = (pharmaciesRes.data ?? []) as PharmacieOption[];
      setPharmacies(dataPharmacies);
      if (!selectedPharmacieId && dataPharmacies.length > 0) {
        setSelectedPharmacieId(dataPharmacies[0].id);
      }

      if (lotRes?.data) {
        setLot(lotRes.data as LotInfo);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de charger les données de transfert.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [lotId]),
  );

  const adjustQty = (delta: number) => {
    const current = Number.parseInt(quantite || '0', 10) || 0;
    const next = Math.max(1, current + delta);
    setQuantite(String(next));
  };

  const handleSubmit = async () => {
    const qte = Number.parseInt(quantite, 10);
    if (!lot) {
      Alert.alert('Lot manquant', 'Veuillez ouvrir ce formulaire depuis le détail d\'un lot.');
      return;
    }
    if (!selectedPharmacieId) {
      Alert.alert('Destination requise', 'Veuillez sélectionner une pharmacie destinataire.');
      return;
    }
    if (!Number.isFinite(qte) || qte <= 0) {
      Alert.alert('Quantité invalide', 'La quantité doit être supérieure à 0.');
      return;
    }
    if (qte > availableQty) {
      Alert.alert('Stock insuffisant', `Vous ne pouvez pas transférer plus de ${availableQty} unités.`);
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      const insertRes = await supabase.from('transferts').insert({
        lot_id: lot.id,
        expediteur_id: session.user.id,
        destinataire_id: selectedPharmacieId,
        quantite_transferee: qte,
        statut: 'en_attente',
        notes_expediteur: notes.trim() || null,
      });

      if (insertRes.error) throw insertRes.error;

      const updateLotRes = await supabase
        .from('lots_medicaments')
        .update({ statut_actuel: 'en_transit' })
        .eq('id', lot.id)
        .eq('fabricant_id', session.user.id);

      if (updateLotRes.error) throw updateLotRes.error;

      Alert.alert('Transfert créé', 'Le transfert a été enregistré avec succès.', [
        { text: 'OK', onPress: () => router.replace('/(fabricant)/transferts') },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'La création du transfert a échoué.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" color="#1A3A5C" />
      </View>
    );
  }

  if (!lot) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-navy font-semibold text-base text-center">Aucun lot sélectionné pour le transfert</Text>
        <Text className="text-muted text-sm text-center mt-2">Ouvrez le détail d'un lot puis cliquez sur "Initier un transfert".</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="bg-[#EEF4FB] border border-blue-light rounded-2xl p-4 mb-4">
          <Text className="text-blue uppercase text-xs font-bold tracking-widest mb-2">Lot à transférer</Text>
          <Text className="text-navy font-black text-[32px]">{lot.nom_medicament}</Text>
          <View className="flex-row items-center mt-2 gap-2 flex-wrap">
            <View className="bg-navy px-2 py-1 rounded-md">
              <Text className="text-white text-xs font-bold">{lot.numero_lot}</Text>
            </View>
            <Text className="text-[#27AE60] text-sm font-semibold">{availableQty.toLocaleString('fr-FR')} unités disponibles</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-navy font-bold text-base mb-3">Pharmacie destinataire *</Text>

          <TouchableOpacity
            className="h-12 border border-blue-light rounded-xl px-3 flex-row items-center justify-between"
            onPress={() => setShowPicker((v) => !v)}
          >
            <Text className="text-navy font-semibold flex-1 mr-2" numberOfLines={1}>
              {selectedPharmacie?.nom_entite ?? 'Sélectionner une pharmacie'}
            </Text>
            <FAIcon name={showPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#6B7D90" family="FontAwesome6" />
          </TouchableOpacity>

          {showPicker && (
            <View className="mt-2 border border-blue-light rounded-xl overflow-hidden">
              {pharmacies.map((p) => {
                const active = p.id === selectedPharmacieId;
                return (
                  <TouchableOpacity
                    key={p.id}
                    className={`px-3 py-3 border-b border-bg ${active ? 'bg-[#F3F8FF]' : 'bg-white'}`}
                    onPress={() => {
                      setSelectedPharmacieId(p.id);
                      setShowPicker(false);
                    }}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <View className="flex-row items-center gap-2">
                          <FAIcon name="pills" size={12} color="#1A3A5C" family="FontAwesome6" />
                          <Text className="text-navy font-bold text-sm">{p.nom_entite}</Text>
                        </View>
                        <Text className="text-muted text-xs mt-1">{[p.adresse, p.ville].filter(Boolean).join(', ') || 'Adresse non renseignée'}</Text>
                      </View>
                      {active && <FAIcon name="check" size={13} color="#2E6DA4" family="FontAwesome6" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text className="text-navy font-bold text-base mt-5 mb-2">Quantité à transférer *</Text>
          <View className="flex-row items-center border border-blue-light rounded-xl overflow-hidden">
            <TouchableOpacity className="w-12 h-12 items-center justify-center border-r border-blue-light" onPress={() => adjustQty(-1)}>
              <FAIcon name="minus" size={14} color="#1A3A5C" family="FontAwesome6" />
            </TouchableOpacity>
            <TextInput
              className="flex-1 h-12 text-center text-navy font-bold"
              keyboardType="number-pad"
              value={quantite}
              onChangeText={setQuantite}
              placeholder="0"
              placeholderTextColor="#9AA9B8"
            />
            <TouchableOpacity className="w-12 h-12 items-center justify-center border-l border-blue-light" onPress={() => adjustQty(1)}>
              <FAIcon name="plus" size={14} color="#1A3A5C" family="FontAwesome6" />
            </TouchableOpacity>
          </View>

          <TextInput
            className="mt-4 border border-blue-light rounded-xl p-3 text-text"
            placeholder="Note (optionnel)"
            placeholderTextColor="#9AA9B8"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View className="bg-[#FFF8E9] border-l-4 border-[#F5A623] rounded-r-xl p-3 mt-4">
            <View className="flex-row items-start gap-2">
              <FAIcon name="triangle-exclamation" size={12} color="#8A6A00" family="FontAwesome6" />
              <Text className="text-[#8A6A00] text-sm flex-1">Le lot passera en statut En transit. La pharmacie devra confirmer la réception par scan.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-bg border-t border-blue-light">
        <TouchableOpacity
          className={`h-12 rounded-xl items-center justify-center ${saving ? 'bg-navy/60' : 'bg-navy'}`}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Confirmer le transfert →</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
