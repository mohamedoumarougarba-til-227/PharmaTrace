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
  const [selectedDestinations, setSelectedDestinations] = useState<{ pharmacieId: string; quantite: string }[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [lot, setLot] = useState<LotInfo | null>(null);

  const availableQty = useMemo(() => {
    if (!lot) return 0;
    return lot.quantite_actuelle ?? lot.quantite_initiale;
  }, [lot]);

  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter(p => 
      p.nom_entite.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.ville && p.ville.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [pharmacies, searchQuery]);

  const totalQty = useMemo(() => {
    return selectedDestinations.reduce((sum, dest) => {
      const q = Number.parseInt(dest.quantite, 10) || 0;
      return sum + q;
    }, 0);
  }, [selectedDestinations]);

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

  const togglePharmacie = (id: string) => {
    setSelectedDestinations(prev => {
      const exists = prev.some(d => d.pharmacieId === id);
      if (exists) {
        return prev.filter(d => d.pharmacieId !== id);
      } else {
        return [...prev, { pharmacieId: id, quantite: '1' }];
      }
    });
  };

  const adjustQty = (pharmacieId: string, delta: number) => {
    setSelectedDestinations(prev =>
      prev.map(d => {
        if (d.pharmacieId === pharmacieId) {
          const current = Number.parseInt(d.quantite || '0', 10) || 0;
          const next = Math.max(1, current + delta);
          return { ...d, quantite: String(next) };
        }
        return d;
      })
    );
  };

  const updateDestQty = (pharmacieId: string, text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setSelectedDestinations(prev =>
      prev.map(d => (d.pharmacieId === pharmacieId ? { ...d, quantite: cleaned } : d))
    );
  };

  const removeDestination = (pharmacieId: string) => {
    setSelectedDestinations(prev => prev.filter(d => d.pharmacieId !== pharmacieId));
  };

  const handleSubmit = async () => {
    if (!lot) {
      Alert.alert('Lot manquant', 'Veuillez ouvrir ce formulaire depuis le détail d\'un lot.');
      return;
    }
    if (selectedDestinations.length === 0) {
      Alert.alert('Destination requise', 'Veuillez sélectionner au moins une pharmacie destinataire.');
      return;
    }
    
    // Validate quantities
    for (const dest of selectedDestinations) {
      const qte = Number.parseInt(dest.quantite, 10);
      const pharm = pharmacies.find(p => p.id === dest.pharmacieId);
      const name = pharm?.nom_entite ?? 'Pharmacie';
      if (!Number.isFinite(qte) || qte <= 0) {
        Alert.alert('Quantité invalide', `Veuillez spécifier une quantité valide pour ${name}.`);
        return;
      }
    }

    if (totalQty > availableQty) {
      Alert.alert('Stock insuffisant', `Le stock disponible est de ${availableQty} unités. Vous essayez de transférer ${totalQty} unités.`);
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      // 1. Insert transfers
      const transferRows = selectedDestinations.map(dest => ({
        lot_id: lot.id,
        expediteur_id: session.user.id,
        destinataire_id: dest.pharmacieId,
        quantite_transferee: Number.parseInt(dest.quantite, 10),
        statut: 'en_attente',
        notes_expediteur: notes.trim() || null,
      }));

      const insertRes = await supabase.from('transferts').insert(transferRows);
      if (insertRes.error) throw insertRes.error;

      // 2. Decrement lot quantity in database
      const newQty = availableQty - totalQty;
      const lotUpdatePayload: any = {
        quantite_actuelle: newQty,
      };
      if (newQty === 0) {
        lotUpdatePayload.statut_actuel = 'en_transit';
      }

      const updateLotRes = await supabase
        .from('lots_medicaments')
        .update(lotUpdatePayload)
        .eq('id', lot.id)
        .eq('fabricant_id', session.user.id);

      if (updateLotRes.error) throw updateLotRes.error;

      Alert.alert('Transfert(s) créé(s)', 'Le(s) transfert(s) a/ont été enregistré(s) avec succès.', [
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
        
        {/* En-tête Lot Info */}
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

        {/* Section Sélection des Pharmacies */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-navy font-bold text-base mb-3">Sélectionner les pharmacies *</Text>
          
          <TouchableOpacity
            className="h-12 border border-blue-light rounded-xl px-3 flex-row items-center justify-between bg-bg/50 active:bg-blue-light/10"
            onPress={() => {
              setShowPicker(v => !v);
              setSearchQuery('');
            }}
          >
            <Text className="text-navy font-semibold flex-1" numberOfLines={1}>
              {selectedDestinations.length > 0 
                ? `${selectedDestinations.length} pharmacie(s) sélectionnée(s)` 
                : 'Ajouter des destinataires...'}
            </Text>
            <FAIcon name={showPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#6B7D90" family="FontAwesome6" />
          </TouchableOpacity>

          {/* Liste déroulante avec barre de recherche */}
          {showPicker && (
            <View className="mt-2 border border-blue-light rounded-xl overflow-hidden bg-white shadow-sm max-h-72">
              {/* Barre de recherche */}
              <View className="flex-row items-center border-b border-blue-light px-3 bg-bg">
                <FAIcon name="magnifying-glass" size={12} color="#6B7D90" family="FontAwesome6" />
                <TextInput
                  className="flex-1 h-10 px-2 text-navy font-semibold text-xs"
                  placeholder="Rechercher une pharmacie (nom, ville)..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <FAIcon name="xmark" size={12} color="#6B7D90" family="FontAwesome6" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <ScrollView nestedScrollEnabled className="flex-grow max-h-60">
                {filteredPharmacies.length === 0 ? (
                  <View className="p-4 items-center">
                    <Text className="text-muted text-xs">Aucune pharmacie trouvée</Text>
                  </View>
                ) : (
                  filteredPharmacies.map((p) => {
                    const isSelected = selectedDestinations.some(d => d.pharmacieId === p.id);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        className={`px-3 py-3 border-b border-bg ${isSelected ? 'bg-[#F3F8FF]' : 'bg-white'}`}
                        onPress={() => togglePharmacie(p.id)}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 pr-3">
                            <View className="flex-row items-center gap-2">
                              <FAIcon name="pills" size={12} color={isSelected ? '#2E6DA4' : '#1A3A5C'} family="FontAwesome6" />
                              <Text className={`font-bold text-sm ${isSelected ? 'text-blue' : 'text-navy'}`}>{p.nom_entite}</Text>
                            </View>
                            <Text className="text-muted text-xs mt-1">{[p.adresse, p.ville].filter(Boolean).join(', ') || 'Adresse non renseignée'}</Text>
                          </View>
                          {isSelected ? (
                            <FAIcon name="check" size={13} color="#2E6DA4" family="FontAwesome6" />
                          ) : (
                            <View className="w-4 h-4 border border-blue-light rounded-sm" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Liste des destinations sélectionnées avec saisie de quantité */}
        {selectedDestinations.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-navy font-bold text-base mb-3">Quantités par pharmacie</Text>
            
            {selectedDestinations.map((dest, idx) => {
              const p = pharmacies.find(item => item.id === dest.pharmacieId);
              if (!p) return null;

              return (
                <View key={dest.pharmacieId} className={`py-3 ${idx > 0 ? 'border-t border-bg' : ''}`}>
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-2">
                      <Text className="text-navy font-bold text-sm">{p.nom_entite}</Text>
                      <Text className="text-muted text-[10px]">{p.ville || 'Niger'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeDestination(dest.pharmacieId)} className="p-1">
                      <FAIcon name="trash" size={12} color="#C0392B" family="FontAwesome" />
                    </TouchableOpacity>
                  </View>

                  {/* Contrôle de quantité */}
                  <View className="flex-row items-center justify-between bg-bg border border-blue-light rounded-xl px-3 py-1.5">
                    <Text className="text-muted text-xs font-bold">Unités à livrer :</Text>
                    <View className="flex-row items-center">
                      <TouchableOpacity 
                        style={{ width: 36, height: 36 }}
                        className="items-center justify-center bg-white border border-blue-light rounded-lg active:bg-blue-light/30" 
                        onPress={() => adjustQty(dest.pharmacieId, -1)}
                      >
                        <FAIcon name="minus" size={12} color="#1A3A5C" family="FontAwesome6" />
                      </TouchableOpacity>
                      <TextInput
                        style={{ width: 70, height: 36, padding: 0, marginHorizontal: 8 }}
                        className="text-center text-navy font-extrabold text-base bg-white border border-blue-light rounded-lg"
                        keyboardType="number-pad"
                        value={dest.quantite}
                        onChangeText={(t) => updateDestQty(dest.pharmacieId, t)}
                      />
                      <TouchableOpacity 
                        style={{ width: 36, height: 36 }}
                        className="items-center justify-center bg-white border border-blue-light rounded-lg active:bg-blue-light/30" 
                        onPress={() => adjustQty(dest.pharmacieId, 1)}
                      >
                        <FAIcon name="plus" size={12} color="#1A3A5C" family="FontAwesome6" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Note sur les totaux */}
            <View className="mt-4 pt-3 border-t border-bg">
              <View className="flex-row justify-between mb-1">
                <Text className="text-muted text-xs">Total à transférer :</Text>
                <Text className={`font-extrabold text-xs ${totalQty > availableQty ? 'text-pharma-red' : 'text-navy'}`}>
                  {totalQty.toLocaleString('fr-FR')} unités
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted text-xs">Stock restant après transfert :</Text>
                <Text className={`font-extrabold text-xs ${availableQty - totalQty < 0 ? 'text-pharma-red' : 'text-green-600'}`}>
                  {(availableQty - totalQty).toLocaleString('fr-FR')} unités
                </Text>
              </View>
            </View>

            {totalQty > availableQty && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mt-3">
                <Text className="text-pharma-red text-xs font-bold text-center">
                  ⚠️ Stock insuffisant : Veuillez réduire les quantités.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Note RLS & Instruction */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <TextInput
            className="border border-blue-light rounded-xl p-3 text-text"
            placeholder="Note d'accompagnement (optionnel)"
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
              <Text className="text-[#8A6A00] text-xs flex-1">
                Les lots transférés passeront en statut "En transit". Chaque pharmacie recevra une notification et devra valider la réception par scan pour confirmer.
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Bouton de confirmation permanent en bas */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-bg border-t border-blue-light">
        <TouchableOpacity
          className={`h-12 rounded-xl items-center justify-center ${
            saving || selectedDestinations.length === 0 || totalQty > availableQty
              ? 'bg-navy/40' 
              : 'bg-navy'
          }`}
          onPress={handleSubmit}
          disabled={saving || selectedDestinations.length === 0 || totalQty > availableQty}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">
              {selectedDestinations.length > 1 
                ? `Confirmer les ${selectedDestinations.length} transferts →` 
                : 'Confirmer le transfert →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
