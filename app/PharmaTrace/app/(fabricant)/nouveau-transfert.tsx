import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { getBusinessPartners } from '../../lib/workflowReads';
import { FAIcon } from '../../constants/icons';
import ConfirmModal from '../../components/ConfirmModal';

type PharmacieOption = {
  id: string;
  nom_entite: string;
  ville: string | null;
};

type LotInfo = {
  id: string;
  numero_lot: string;
  nom_medicament: string;
  quantite_initiale: number;
  quantite_actuelle: number | null;
  date_expiration?: string;
};

export default function NouveauTransfertScreen() {
  const { lotId, demandeId, nomMedicament, destinataireId, quantite } = useLocalSearchParams<{
    lotId?: string;
    demandeId?: string;
    nomMedicament?: string;
    destinataireId?: string;
    quantite?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pharmacies, setPharmacies] = useState<PharmacieOption[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<{ pharmacieId: string; quantite: string; note: string }[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lot, setLot] = useState<LotInfo | null>(null);
  const [matchingLots, setMatchingLots] = useState<LotInfo[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [showLotPicker, setShowLotPicker] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    title: string;
    message: string;
    color: string;
    icon: string;
    onConfirm?: () => void;
  } | null>(null);

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

      // Load pharmacies
      const pharmData = await getBusinessPartners();
      setPharmacies((pharmData ?? []) as PharmacieOption[]);

      // Auto-pre-fill destinataire destination
      if (destinataireId && quantite) {
        setSelectedDestinations([{
          pharmacieId: destinataireId,
          quantite: quantite,
          note: demandeId ? 'Réponse à votre demande de stock' : '',
        }]);
      }

      // Load specific lot if lotId is given
      if (lotId) {
        const { data: lotData, error: lotError } = await supabase
          .from('lots_medicaments')
          .select('id, numero_lot, nom_medicament, quantite_initiale, quantite_actuelle, date_expiration')
          .eq('id', lotId)
          .eq('fabricant_id', session.user.id)
          .single();

        if (lotError) throw lotError;

        if (lotData) {
          const lInfo = lotData as LotInfo;
          if (lInfo.date_expiration && new Date(lInfo.date_expiration) < new Date()) {
            setSuccessModal({
              title: 'Lot expiré',
              message: 'Ce lot a expiré. Il est interdit d\'initier un transfert pour un produit périmé.',
              color: '#C0392B',
              icon: 'triangle-exclamation',
              onConfirm: () => router.replace('/(fabricant)/lots'),
            });
            return;
          }
          setLot(lInfo);
          setSelectedLotId(lInfo.id);
        }
      } else if (demandeId && nomMedicament) {
        // Find matching manufacturer lots for this medicine name
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: matchedLots, error: matchedError } = await supabase
          .from('lots_medicaments')
          .select('id, numero_lot, nom_medicament, quantite_initiale, quantite_actuelle, date_expiration')
          .eq('fabricant_id', session.user.id)
          .eq('statut_actuel', 'en_stock_fabricant')
          .ilike('nom_medicament', `%${nomMedicament}%`)
          .gte('date_expiration', todayStr)
          .order('date_expiration', { ascending: true });

        if (matchedError) throw matchedError;

        const availableLots = (matchedLots ?? []) as LotInfo[];
        setMatchingLots(availableLots);

        const requestedQty = Number(quantite || 0);
        const autoLot = availableLots.find(l => (l.quantite_actuelle ?? l.quantite_initiale) >= requestedQty) || availableLots[0];
        if (autoLot) {
          setLot(autoLot);
          setSelectedLotId(autoLot.id);
        }
      }
    } catch (e) {
      console.error(e);
      setSuccessModal({
        title: 'Erreur',
        message: 'Impossible de charger les données de transfert.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [lotId, demandeId, nomMedicament, destinataireId, quantite]),
  );

  const togglePharmacie = (id: string) => {
    setSelectedDestinations(prev => {
      const exists = prev.some(d => d.pharmacieId === id);
      if (exists) {
        return prev.filter(d => d.pharmacieId !== id);
      } else {
        return [...prev, { pharmacieId: id, quantite: '1', note: '' }];
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

  const updateDestNote = (pharmacieId: string, text: string) => {
    setSelectedDestinations(prev =>
      prev.map(d => (d.pharmacieId === pharmacieId ? { ...d, note: text } : d))
    );
  };

  const handlePressSubmit = () => {
    if (!lot) {
      setSuccessModal({
        title: 'Lot manquant',
        message: "Veuillez ouvrir ce formulaire depuis le détail d'un lot.",
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
      return;
    }
    if (selectedDestinations.length === 0) {
      setSuccessModal({
        title: 'Destination requise',
        message: 'Veuillez sélectionner au moins une pharmacie destinataire.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
      return;
    }
    
    // Validate quantities
    for (const dest of selectedDestinations) {
      const qte = Number.parseInt(dest.quantite, 10);
      const pharm = pharmacies.find(p => p.id === dest.pharmacieId);
      const name = pharm?.nom_entite ?? 'Pharmacie';
      if (!Number.isFinite(qte) || qte <= 0) {
        setSuccessModal({
          title: 'Quantité invalide',
          message: `Veuillez spécifier une quantité valide pour ${name}.`,
          color: '#C0392B',
          icon: 'triangle-exclamation',
        });
        return;
      }
    }

    if (totalQty > availableQty) {
      setSuccessModal({
        title: 'Stock insuffisant',
        message: `Le stock disponible est de ${availableQty} unités. Vous essayez de transférer ${totalQty} unités.`,
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
      return;
    }

    setShowConfirmSubmit(true);
  };

  const executeSubmit = async () => {
    if (!lot) return;
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
        notes_expediteur: dest.note.trim() || null,
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('transferts')
        .insert(transferRows)
        .select('id');

      if (insertError) throw insertError;
      const createdTransferId = insertedData?.[0]?.id;

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

      // 3. Link stock request if applicable
      if (demandeId && createdTransferId) {
        const dest = selectedDestinations[0];
        const delQty = Number.parseInt(dest?.quantite || '0', 10);
        const reqQty = Number.parseInt(quantite || '0', 10);
        const isPartial = delQty !== reqQty;
        const notes = isPartial 
          ? `Demande satisfaite (livraison partielle de ${delQty} sur ${reqQty} demandées).` 
          : 'Demande satisfaite et lot expédié.';

        const { error: updateDemandeError } = await supabase
          .from('demandes_stock')
          .update({
            statut: 'satisfait',
            transfert_id: createdTransferId,
            notes_fabricant: notes,
          })
          .eq('id', demandeId);

        if (updateDemandeError) throw updateDemandeError;
      }

      setShowConfirmSubmit(false);
      setSuccessModal({
        title: 'Transfert(s) créé(s)',
        message: 'Le(s) transfert(s) a/ont été enregistré(s) avec succès.',
        color: '#27AE60',
        icon: 'circle-check',
        onConfirm: () => router.replace('/(fabricant)/transferts'),
      });
    } catch (e) {
      console.error(e);
      setShowConfirmSubmit(false);
      setSuccessModal({
        title: 'Erreur',
        message: 'La création du transfert a échoué.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
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
        {demandeId ? (
          <Text className="text-pharma-red text-sm text-center mt-2 font-bold">
            Vous n'avez aucun lot actif de "{nomMedicament}" en stock pour répondre à cette demande.
          </Text>
        ) : (
          <Text className="text-muted text-sm text-center mt-2">Ouvrez le détail d'un lot puis cliquez sur "Initier un transfert".</Text>
        )}
        <TouchableOpacity
          onPress={() => router.replace('/(fabricant)/demandes')}
          className="mt-6 px-5 py-2.5 bg-navy rounded-xl"
        >
          <Text className="text-white font-bold text-sm">Retour aux demandes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 140 }}>
        
        {/* En-tête Lot Info */}
        <View className="bg-[#EEF4FB] border border-blue-light rounded-2xl p-4 mb-4">
          <Text className="text-blue uppercase text-xs font-bold tracking-widest mb-2">Lot à transférer</Text>
          {matchingLots.length > 1 ? (
            <View>
              <Text className="text-navy font-bold text-xs mb-1.5">Sélectionner le lot pour répondre ({nomMedicament}) :</Text>
              <View className="bg-white border border-blue-light rounded-xl overflow-hidden mb-2">
                <TouchableOpacity
                  className="h-11 px-3 flex-row items-center justify-between bg-white active:bg-blue-light/10"
                  onPress={() => setShowLotPicker(v => !v)}
                >
                  <Text className="text-navy font-bold text-sm flex-1" numberOfLines={1}>
                    {(() => {
                      const chosen = matchingLots.find(l => l.id === selectedLotId);
                      return chosen 
                        ? `Lot: ${chosen.numero_lot} (Stock: ${chosen.quantite_actuelle ?? chosen.quantite_initiale} u. · Exp: ${chosen.date_expiration})`
                        : 'Sélectionner un lot...';
                    })()}
                  </Text>
                  <FAIcon name={showLotPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#6B7D90" family="FontAwesome6" />
                </TouchableOpacity>

                {showLotPicker && (
                  <View className="border-t border-blue-light bg-white shadow-sm max-h-48">
                    <ScrollView nestedScrollEnabled className="flex-grow">
                      {matchingLots.map((l) => (
                        <TouchableOpacity
                          key={l.id}
                          className={`px-3 py-2.5 border-b border-bg active:bg-[#F3F8FF] ${selectedLotId === l.id ? 'bg-[#F3F8FF]' : 'bg-white'}`}
                          onPress={() => {
                            setSelectedLotId(l.id);
                            const chosen = matchingLots.find(item => item.id === l.id);
                            if (chosen) setLot(chosen);
                            setShowLotPicker(false);
                          }}
                        >
                          <Text className={`font-bold text-xs ${selectedLotId === l.id ? 'text-blue' : 'text-navy'}`}>
                            Lot: {l.numero_lot} (Stock: {l.quantite_actuelle ?? l.quantite_initiale} u. · Exp: {l.date_expiration})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <>
              <Text className="text-navy font-black text-[32px]">{lot.nom_medicament}</Text>
              <View className="flex-row items-center mt-2 gap-2 flex-wrap">
                <View className="bg-navy px-2 py-1 rounded-md">
                  <Text className="text-white text-xs font-bold">{lot.numero_lot}</Text>
                </View>
                <Text className="text-[#27AE60] text-sm font-semibold">{availableQty.toLocaleString('fr-FR')} unités disponibles</Text>
              </View>
            </>
          )}
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
                            <Text className="text-muted text-xs mt-1">{p.ville || 'Ville non renseignée'}</Text>
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
                  <View className="flex-row items-center gap-1.5 mb-2 flex-wrap">
                    <Text className="text-navy font-bold text-sm">{p.nom_entite}</Text>
                    <Text className="text-muted text-[10px]">· {p.ville || 'Niger'}</Text>
                    <TouchableOpacity onPress={() => removeDestination(dest.pharmacieId)} style={{ marginLeft: 4, padding: 3 }}>
                      <FAIcon name="trash" size={11} color="#C0392B" family="FontAwesome" />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row flex-wrap items-center gap-3">
                    {/* Contrôle de quantité — compact */}
                    <View className="flex-row items-center bg-bg border border-blue-light rounded-xl px-3 py-1.5 gap-2" style={{ width: 280, maxWidth: '100%' }}>
                      <Text className="text-muted text-xs font-bold">Unités à livrer :</Text>
                      <View className="flex-row items-center">
                        <TouchableOpacity 
                          style={{ width: 38, height: 38 }}
                          className="items-center justify-center bg-white border border-blue-light rounded-xl active:bg-blue-light/30" 
                          onPress={() => adjustQty(dest.pharmacieId, -1)}
                        >
                          <FAIcon name="minus" size={13} color="#1A3A5C" family="FontAwesome6" />
                        </TouchableOpacity>
                        <TextInput
                          style={{ width: 70, height: 38, padding: 0, marginHorizontal: 6 }}
                          className="text-center text-navy font-black text-lg bg-white border border-blue-light rounded-xl"
                          keyboardType="number-pad"
                          value={dest.quantite}
                          onChangeText={(t) => updateDestQty(dest.pharmacieId, t)}
                        />
                        <TouchableOpacity 
                          style={{ width: 38, height: 38 }}
                          className="items-center justify-center bg-white border border-blue-light rounded-xl active:bg-blue-light/30" 
                          onPress={() => adjustQty(dest.pharmacieId, 1)}
                        >
                          <FAIcon name="plus" size={13} color="#1A3A5C" family="FontAwesome6" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Note individuelle */}
                    <TextInput
                      className="border border-blue-light rounded-xl px-3 py-2 text-text text-xs bg-bg"
                      placeholder="Note d'accompagnement (optionnel)"
                      placeholderTextColor="#9AA9B8"
                      value={dest.note}
                      onChangeText={(t) => updateDestNote(dest.pharmacieId, t)}
                      multiline
                      numberOfLines={1}
                      textAlignVertical="center"
                      style={{ flex: 1, minWidth: 200, height: 52 }}
                    />
                  </View>
                </View>
              );
            })}

            {/* Note sur les totaux — plus visible */}
            <View className="mt-4 pt-3 border-t border-bg flex-row flex-wrap items-center gap-x-8 gap-y-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-muted text-sm font-semibold">Total à transférer :</Text>
                <Text className={`font-black text-xl ${totalQty > availableQty ? 'text-pharma-red' : 'text-navy'}`}>
                  {totalQty.toLocaleString('fr-FR')} unités
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-muted text-sm font-semibold">Stock restant :</Text>
                <Text className={`font-black text-xl ${availableQty - totalQty < 0 ? 'text-pharma-red' : 'text-green-600'}`}>
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

        {/* Instruction */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <View className="bg-[#FFF8E9] border-l-4 border-[#F5A623] rounded-r-xl p-3">
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
          onPress={handlePressSubmit}
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

      <ConfirmModal
        visible={showConfirmSubmit}
        title="Initier le transfert"
        message={selectedDestinations.length > 1 
          ? `Voulez-vous initier ces ${selectedDestinations.length} transferts pour un total de ${totalQty} unités ?` 
          : `Voulez-vous initier ce transfert de ${totalQty} unités ?`}
        confirmText="Confirmer"
        cancelText="Annuler"
        confirmColor="#1A3A5C"
        icon="exchange"
        onConfirm={executeSubmit}
        onCancel={() => setShowConfirmSubmit(false)}
      />

      {/* Success/Error ConfirmModal */}
      <ConfirmModal
        visible={!!successModal}
        title={successModal?.title ?? ''}
        message={successModal?.message ?? ''}
        confirmText="OK"
        confirmColor={successModal?.color}
        icon={successModal?.icon}
        onConfirm={async () => {
          if (successModal?.onConfirm) {
            successModal.onConfirm();
          }
          setSuccessModal(null);
        }}
      />
    </View>
  );
}
