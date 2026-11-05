import { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { createTransfers, decideRequests, matchesRequestedMedicine, workflowError, type WorkflowIntent } from '../../lib/businessWorkflows';
import { FAIcon } from '../../constants/icons';
import ConfirmModal from '../../components/ConfirmModal';

type DemandeItem = {
  id: string;
  nom_medicament: string;
  dosage: string;
  forme_galenique: string | null;
  quantite_demandee: number;
  statut: 'en_attente' | 'satisfait' | 'refuse' | 'annule';
  notes_fabricant: string | null;
  transfert_id: string | null;
};

type GroupedDemande = {
  id: string; // group_id or individual row id
  groupe_id: string | null;
  statut: string;
  created_at: string;
  pharmacie: string;
  pharmacie_id: string;
  notes_pharmacie: string | null;
  items: DemandeItem[];
};

type LotInfo = {
  id: string;
  numero_lot: string;
  nom_medicament: string;
  dosage: string | null;
  forme_galenique: string | null;
  quantite_initiale: number;
  quantite_actuelle: number | null;
  date_expiration?: string;
};

export default function RequetesStockScreen() {
  const deliveryIntent = useRef<WorkflowIntent>({});
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [groupedDemandes, setGroupedDemandes] = useState<GroupedDemande[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedDemande | null>(null);
  
  // Sélection multiple
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Livraison groupée (Bulk delivery)
  const [bulkDeliveryModalVisible, setBulkDeliveryModalVisible] = useState(false);
  const [bulkDeliveryItems, setBulkDeliveryItems] = useState<DemandeItem[]>([]);
  const [bulkLotsMap, setBulkLotsMap] = useState<{ [itemName: string]: LotInfo[] }>({});
  const [selectedLotsForBulk, setSelectedLotsForBulk] = useState<{ [itemId: string]: string }>({});
  const [bulkQuantities, setBulkQuantities] = useState<{ [itemId: string]: string }>({});
  const [bulkDeliveryLoading, setBulkDeliveryLoading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [openLotPickerId, setOpenLotPickerId] = useState<string | null>(null);
  
  // Refus d'un item particulier
  const [refusTarget, setRefusTarget] = useState<DemandeItem | null>(null);
  const [motifRefus, setMotifRefus] = useState('');
  const [refusing, setRefusing] = useState(false);

  const [successModal, setSuccessModal] = useState<{
    title: string;
    message: string;
    color: string;
    icon: string;
  } | null>(null);

  const loadDemandes = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('demandes_stock')
        .select('id, nom_medicament, dosage, forme_galenique, quantite_demandee, notes_pharmacie, notes_fabricant, statut, created_at, groupe_id, pharmacie_id(id, nom_entite), transfert_id')
        .eq('fabricant_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Groupement par groupe_id ou par ID de ligne
      const groupsMap: { [key: string]: GroupedDemande } = {};
      (data ?? []).forEach((row: any) => {
        const key = row.groupe_id || row.id;
        if (!groupsMap[key]) {
          groupsMap[key] = {
            id: key,
            groupe_id: row.groupe_id,
            statut: row.statut,
            created_at: row.created_at,
            pharmacie: row.pharmacie_id?.nom_entite ?? 'Pharmacie',
            pharmacie_id: row.pharmacie_id?.id ?? '',
            notes_pharmacie: row.notes_pharmacie,
            items: [],
          };
        }
        groupsMap[key].items.push({
          id: row.id,
          nom_medicament: row.nom_medicament,
          dosage: row.dosage,
          forme_galenique: row.forme_galenique,
          quantite_demandee: row.quantite_demandee,
          statut: row.statut,
          notes_fabricant: row.notes_fabricant,
          transfert_id: row.transfert_id,
        });
      });

      // Mettre à jour le statut global du groupe
      Object.values(groupsMap).forEach((g) => {
        const statuses = g.items.map((i) => i.statut);
        if (statuses.every((s) => s === 'en_attente')) {
          g.statut = 'en_attente';
        } else if (statuses.every((s) => s === 'satisfait')) {
          g.statut = 'satisfait';
        } else if (statuses.every((s) => s === 'refuse')) {
          g.statut = 'refuse';
        } else if (statuses.every((s) => s === 'annule')) {
          g.statut = 'annule';
        } else {
          g.statut = 'partiel'; // statut mixte
        }
      });

      const sortedGroups = Object.values(groupsMap).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setGroupedDemandes(sortedGroups);

      // Si un groupe est actuellement ouvert en détails, on met à jour ses données
      if (selectedGroup) {
        const updated = sortedGroups.find(g => g.id === selectedGroup.id);
        if (updated) setSelectedGroup(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDemandes();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDemandes();
  };

  const handleSelectGroup = (group: GroupedDemande | null) => {
    setSelectedGroup(group);
    if (group) {
      const pendingIds = group.items.filter(it => it.statut === 'en_attente').map(it => it.id);
      setSelectedItemIds(pendingIds);
    } else {
      setSelectedItemIds([]);
    }
  };

  const handleRefusItem = async () => {
    if (!refusTarget) return;
    if (!motifRefus.trim()) {
      setSuccessModal({
        title: 'Motif requis',
        message: 'Veuillez saisir un motif pour justifier le refus.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
      return;
    }

    setRefusing(true);
    try {
      if (refusTarget.id === 'bulk') {
        await decideRequests(selectedItemIds, 'refuse', motifRefus);

        setSelectedItemIds([]);
        setSelectedGroup(null);
      } else {
        await decideRequests([refusTarget.id], 'refuse', motifRefus);
      }

      setRefusTarget(null);
      setMotifRefus('');
      await loadDemandes();
      
      setSuccessModal({
        title: 'Article(s) refusé(s)',
        message: 'Le(s) article(s) a/ont été refusé(s) avec succès.',
        color: '#E67E22',
        icon: 'circle-check',
      });
    } catch (e) {
      console.error(e);
      setSuccessModal({
        title: 'Erreur',
        message: workflowError(e),
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
    } finally {
      setRefusing(false);
    }
  };

  const handleRepondreTransfert = (item: DemandeItem, pharmacieId: string) => {
    handleSelectGroup(null);
    router.push({
      pathname: '/(fabricant)/nouveau-transfert',
      params: {
        demandeId: item.id,
        nomMedicament: item.nom_medicament,
        dosage: item.dosage,
        formeGalenique: item.forme_galenique || '',
        destinataireId: pharmacieId,
        quantite: String(item.quantite_demandee),
      },
    });
  };

  const handleOpenBulkDelivery = async () => {
    if (selectedItemIds.length === 0 || !selectedGroup) return;
    
    setBulkDeliveryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const itemsToDeliver = selectedGroup.items.filter(item => selectedItemIds.includes(item.id));
      deliveryIntent.current = {};
      setBulkDeliveryItems(itemsToDeliver);

      const uniqueNames = Array.from(new Set(itemsToDeliver.map(it => it.nom_medicament)));
      const lotsMap: { [key: string]: LotInfo[] } = {};
      const todayStr = new Date().toISOString().split('T')[0];

      for (const name of uniqueNames) {
        const { data, error } = await supabase
          .from('lots_medicaments')
          .select('id, numero_lot, nom_medicament, dosage, forme_galenique, quantite_initiale, quantite_actuelle, date_expiration')
          .eq('fabricant_id', session.user.id)
          .eq('statut_actuel', 'en_stock_fabricant')
          .eq('nom_medicament', name)
          .gte('date_expiration', todayStr)
          .order('date_expiration', { ascending: true });

        if (error) throw error;
        lotsMap[name] = (data ?? []) as LotInfo[];
      }

      setBulkLotsMap(lotsMap);

      const initialLots: { [key: string]: string } = {};
      const initialQtys: { [key: string]: string } = {};

      itemsToDeliver.forEach(item => {
        const matching = (lotsMap[item.nom_medicament] ?? []).filter(l => matchesRequestedMedicine(l, item));
        const requested = item.quantite_demandee;
        const chosen = matching.find(l => (l.quantite_actuelle ?? l.quantite_initiale) >= requested) || matching[0];
        if (chosen) {
          initialLots[item.id] = chosen.id;
        }
        initialQtys[item.id] = String(requested);
      });

      setSelectedLotsForBulk(initialLots);
      setBulkQuantities(initialQtys);
      
      setBulkDeliveryModalVisible(true);
    } catch (e) {
      console.error(e);
      setSuccessModal({
        title: 'Erreur',
        message: 'Impossible de charger les lots pour la livraison groupée.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
    } finally {
      setBulkDeliveryLoading(false);
    }
  };

  const handleExecuteBulkDelivery = async () => {
    if (!selectedGroup || bulkDeliveryItems.length === 0) return;
    
    // Validation
    for (const item of bulkDeliveryItems) {
      const lotId = selectedLotsForBulk[item.id];
      const qtyStr = bulkQuantities[item.id];
      const qty = parseInt(qtyStr, 10);
      
      if (!lotId) {
        setSuccessModal({
          title: 'Lot manquant',
          message: `Veuillez sélectionner un lot pour "${item.nom_medicament}".`,
          color: '#C0392B',
          icon: 'triangle-exclamation',
        });
        return;
      }
      if (!qty || qty <= 0) {
        setSuccessModal({
          title: 'Quantité invalide',
          message: `Veuillez spécifier une quantité valide pour "${item.nom_medicament}".`,
          color: '#C0392B',
          icon: 'triangle-exclamation',
        });
        return;
      }

      const lot = bulkLotsMap[item.nom_medicament]?.find(l => l.id === lotId);
      if (!lot) continue;
      const available = lot.quantite_actuelle ?? lot.quantite_initiale;
      if (qty > available) {
        setSuccessModal({
          title: 'Stock insuffisant',
          message: `Le lot ${lot.numero_lot} pour "${item.nom_medicament}" n'a que ${available} unités disponibles (demandé: ${qty}).`,
          color: '#C0392B',
          icon: 'triangle-exclamation',
        });
        return;
      }
    }

    setBulkSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await createTransfers(bulkDeliveryItems.map(item => ({
        lot_id: selectedLotsForBulk[item.id], destinataire_id: selectedGroup.pharmacie_id,
        quantite: Number(bulkQuantities[item.id]), demande_id: item.id,
        note: 'Réponse à votre demande de stock (livraison groupée)',
      })), deliveryIntent.current);

      setSelectedItemIds([]);
      setBulkDeliveryModalVisible(false);
      handleSelectGroup(null);
      await loadDemandes();

      setSuccessModal({
        title: 'Livraison réussie',
        message: 'Les transferts groupés ont été initiés avec succès !',
        color: '#27AE60',
        icon: 'circle-check',
      });
    } catch (e) {
      console.error(e);
      setSuccessModal({
        title: 'Erreur',
        message: workflowError(e),
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
    } finally {
      setBulkSaving(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'en_attente':
        return { bg: 'bg-pharma-orange/10', text: 'text-pharma-orange', label: 'En attente' };
      case 'satisfait':
        return { bg: 'bg-pharma-green/10', text: 'text-pharma-green', label: 'Satisfait' };
      case 'refuse':
        return { bg: 'bg-pharma-red/10', text: 'text-pharma-red', label: 'Refusé' };
      case 'partiel':
        return { bg: 'bg-blue-50', text: 'text-blue', label: 'Partiel' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Annulé' };
    }
  };

  if (loading && groupedDemandes.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#1A3A5C" size="large" />
      </View>
    );
  }

  const enAttente = groupedDemandes.filter((d) => d.statut === 'en_attente' || d.statut === 'partiel');
  const historique = groupedDemandes.filter((d) => d.statut !== 'en_attente' && d.statut !== 'partiel');

  return (
    <ScrollView
      className="flex-1 bg-bg p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Section Demandes Actives */}
      <View className="mb-4 flex-row items-center gap-2">
        <FAIcon name="bell" size={16} color="#E67E22" family="FontAwesome6" />
        <Text className="text-navy font-bold text-base">{enAttente.length} demandes actives</Text>
      </View>

      {enAttente.map((d) => (
        <TouchableOpacity
          key={d.id}
          onPress={() => handleSelectGroup(d)}
          className="bg-white rounded-xl p-4 mb-3 border-l-4 border-pharma-orange shadow-sm"
          activeOpacity={0.7}
        >
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 mr-2">
              <Text className="text-navy font-bold text-base">Demande de réapprovisionnement</Text>
              <Text className="text-muted text-xs mt-1">De : {d.pharmacie}</Text>
            </View>
            <View className="bg-pharma-orange/10 px-2 py-0.5 rounded-full">
              <Text className="text-pharma-orange text-[10px] font-bold uppercase">Actif</Text>
            </View>
          </View>
          
          <View className="my-2 bg-bg/50 p-2.5 rounded-lg border border-blue-light/40">
            {d.items.map((it) => (
              <Text key={it.id} className="text-xs text-navy font-medium mb-1">
                • {it.nom_medicament} {it.dosage} · <Text className="font-bold text-blue">{it.quantite_demandee} u.</Text>
                {it.statut !== 'en_attente' && (
                  <Text className={`text-[10px] uppercase font-bold ml-2 ${it.statut === 'satisfait' ? 'text-pharma-green' : 'text-pharma-red'}`}>
                    ({it.statut})
                  </Text>
                )}
              </Text>
            ))}
          </View>

          {d.notes_pharmacie && (
            <Text className="text-muted text-xs italic mb-2">Note pharmacie : "{d.notes_pharmacie}"</Text>
          )}

          <View className="flex-row justify-between items-center border-t border-bg pt-3">
            <Text className="text-muted text-[10px]">
              Reçue le : {new Date(d.created_at).toLocaleDateString('fr-FR')}
            </Text>
            <Text className="text-blue text-xs font-semibold">Traiter la demande →</Text>
          </View>
        </TouchableOpacity>
      ))}

      {enAttente.length === 0 && (
        <View className="bg-white rounded-xl p-6 mb-4 items-center justify-center border border-blue-light">
          <FAIcon name="circle-check" size={32} color="#27AE60" family="FontAwesome6" />
          <Text className="text-navy font-bold text-sm mt-3">Aucune demande active</Text>
        </View>
      )}

      {/* Historique */}
      {historique.length > 0 && (
        <>
          <Text className="text-navy font-bold text-base mt-6 mb-3">Historique des demandes</Text>
          {historique.map((d) => {
            const style = getStatusStyle(d.statut);
            return (
              <TouchableOpacity
                key={d.id}
                onPress={() => handleSelectGroup(d)}
                className="bg-white rounded-xl p-4 mb-3 border border-blue-light shadow-sm"
                activeOpacity={0.7}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-navy font-bold text-sm">Demande de stock ({d.items.length} prod.)</Text>
                    <Text className="text-muted text-xs mt-0.5">De : {d.pharmacie}</Text>
                  </View>
                  <View className={`${style.bg} px-2 py-0.5 rounded-full`}>
                    <Text className={`${style.text} text-[10px] font-bold uppercase`}>{style.label}</Text>
                  </View>
                </View>
                <Text className="text-muted text-[10px]">
                  Fermée le : {new Date(d.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* Modal Formulaire de Refus d'un Item */}
      <Modal
        visible={refusTarget !== null && successModal === null}
        transparent
        animationType="fade"
        onRequestClose={() => setRefusTarget(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
            <View className="flex-row justify-between items-center mb-4 border-b border-bg pb-3">
              <Text className="text-navy font-black text-lg">Refuser l'article</Text>
              <TouchableOpacity onPress={() => setRefusTarget(null)} className="p-1">
                <FAIcon name="xmark" size={18} color="#C0392B" family="FontAwesome6" />
              </TouchableOpacity>
            </View>

            {refusTarget && (
              <Text className="text-navy font-bold text-sm mb-3">
                Raison du refus de "{refusTarget.nom_medicament} {refusTarget.dosage}" :
              </Text>
            )}

            <TextInput
              className="bg-bg border border-blue-light rounded-xl p-3 text-sm text-navy mb-4"
              placeholder="Saisissez le motif de refus (ex: stock insuffisant)..."
              placeholderTextColor="#bbb"
              value={motifRefus}
              onChangeText={setMotifRefus}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />

            <View className="flex-row gap-3 pt-3 border-t border-bg">
              <TouchableOpacity
                onPress={() => setRefusTarget(null)}
                className="flex-1 h-12 border border-blue-light rounded-xl items-center justify-center"
              >
                <Text className="text-navy font-bold text-sm">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRefusItem}
                disabled={refusing}
                className="flex-1 h-12 bg-pharma-red rounded-xl items-center justify-center"
              >
                {refusing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-sm">Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Détails d'une Demande Groupée */}
      <Modal
        visible={selectedGroup !== null && refusTarget === null && successModal === null && !bulkDeliveryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => handleSelectGroup(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-xl" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4 border-b border-bg pb-3">
              <Text className="text-navy font-black text-lg">Détails Demande</Text>
              <TouchableOpacity onPress={() => handleSelectGroup(null)} className="p-1">
                <FAIcon name="xmark" size={18} color="#C0392B" family="FontAwesome6" />
              </TouchableOpacity>
            </View>

            {selectedGroup && (
              <>
                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={true}>
                  <View className="gap-3">
                    <View className="border-b border-bg pb-2">
                      <Text className="text-navy font-black text-sm">De : {selectedGroup.pharmacie}</Text>
                      <Text className="text-muted text-[10px] mt-0.5">Reçue le {new Date(selectedGroup.created_at).toLocaleString('fr-FR')}</Text>
                    </View>

                    <Text className="text-navy font-bold text-xs uppercase tracking-wider mt-1">Articles demandés :</Text>
                    
                    {selectedGroup.items.map((item) => {
                      const itemStyle = getStatusStyle(item.statut);
                      const isSelected = selectedItemIds.includes(item.id);
                      return (
                        <View key={item.id} className="flex-row items-center mb-2">
                          {item.statut === 'en_attente' ? (
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedItemIds(prev =>
                                  prev.includes(item.id)
                                    ? prev.filter(id => id !== item.id)
                                    : [...prev, item.id]
                                );
                              }}
                              className="mr-2.5 p-1"
                            >
                              <FAIcon
                                name={isSelected ? "square-check" : "square"}
                                size={20}
                                color={isSelected ? "#1A3A5C" : "#9AA9B8"}
                                family="FontAwesome6"
                              />
                            </TouchableOpacity>
                          ) : (
                            <View className="w-[30px]" />
                          )}
                          <View className="flex-1 bg-bg/40 border border-blue-light/50 rounded-xl p-3">
                            <View className="flex-row justify-between items-center mb-1">
                              <Text className="text-navy font-bold text-xs flex-1 mr-2">{item.nom_medicament}</Text>
                              <View className={`${itemStyle.bg} px-2 py-0.5 rounded-full`}>
                                <Text className={`${itemStyle.text} text-[9px] font-bold uppercase`}>{itemStyle.label}</Text>
                              </View>
                            </View>
                            <Text className="text-muted text-[10px] mb-1">Dosage : {item.dosage} · Forme : {item.forme_galenique || '—'}</Text>
                            <Text className="text-navy text-xs font-bold mb-2">Quantité : {item.quantite_demandee} unités</Text>

                            {item.notes_fabricant && (
                              <View className="mt-2 bg-white p-2 rounded border border-blue-light/30">
                                <Text className="text-[9px] text-muted font-bold uppercase">Notes Fabricant</Text>
                                <Text className="text-navy text-[10px] font-medium">{item.notes_fabricant}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}

                    <View className="py-2 border-t border-bg mt-2">
                      <Text className="text-muted text-[10px] uppercase tracking-wider mb-1">Message pharmacie (global)</Text>
                      <Text className="text-navy text-xs font-medium">{selectedGroup.notes_pharmacie ?? 'Aucune note.'}</Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Actions de groupe */}
                {selectedGroup.items.some(it => it.statut === 'en_attente') && (
                  <View className="bg-bg border border-blue-light/50 rounded-xl p-3.5 mt-4 flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => {
                        setRefusTarget({
                          id: 'bulk',
                          nom_medicament: 'toute la demande',
                          dosage: '',
                          forme_galenique: '',
                          quantite_demandee: 0,
                          statut: 'en_attente',
                          notes_fabricant: null,
                          transfert_id: null,
                        });
                      }}
                      className="flex-1 h-11 border border-pharma-red rounded-xl items-center justify-center flex-row gap-1.5 bg-white shadow-sm active:bg-red-50"
                    >
                      <FAIcon name="trash" size={13} color="#C0392B" family="FontAwesome" />
                      <Text className="text-pharma-red text-xs font-bold">Refuser la demande</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleOpenBulkDelivery}
                      disabled={selectedItemIds.length === 0 || bulkDeliveryLoading}
                      className={`flex-1 h-11 rounded-xl items-center justify-center flex-row gap-1.5 shadow-sm ${
                        selectedItemIds.length === 0 ? 'bg-[#27AE60]/40' : 'bg-[#27AE60] active:bg-[#219653]'
                      }`}
                    >
                      {bulkDeliveryLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <FAIcon name="truck" size={13} color="#fff" family="FontAwesome" />
                          <Text className="text-white text-xs font-bold">
                            Livrer la sélection ({selectedItemIds.length})
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Livraison Groupée */}
      <Modal
        visible={bulkDeliveryModalVisible && successModal === null}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkDeliveryModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-xl" style={{ maxHeight: '90%' }}>
            <View className="flex-row justify-between items-center mb-4 border-b border-bg pb-3">
              <View>
                <Text className="text-navy font-black text-lg">Livraison groupée</Text>
                <Text className="text-muted text-xs mt-0.5">Destinataire : {selectedGroup?.pharmacie}</Text>
              </View>
              <TouchableOpacity onPress={() => setBulkDeliveryModalVisible(false)} className="p-1">
                <FAIcon name="xmark" size={18} color="#C0392B" family="FontAwesome6" />
              </TouchableOpacity>
            </View>

            {bulkDeliveryLoading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator color="#1A3A5C" size="large" />
                <Text className="text-navy text-xs font-semibold mt-3">Recherche des lots disponibles...</Text>
              </View>
            ) : (
              <>
                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={true} className="mb-4">
                  <View className="gap-4">
                    {bulkDeliveryItems.map((item) => {
                      const matchingLots = (bulkLotsMap[item.nom_medicament] ?? []).filter(l => matchesRequestedMedicine(l, item));
                      const selectedLotId = selectedLotsForBulk[item.id];
                      const selectedLot = matchingLots.find(l => l.id === selectedLotId);
                      const available = selectedLot ? (selectedLot.quantite_actuelle ?? selectedLot.quantite_initiale) : 0;
                      const qtyStr = bulkQuantities[item.id] ?? '';
                      const qty = parseInt(qtyStr, 10) || 0;
                      const hasStockError = qty > available;
                      const noLots = matchingLots.length === 0;

                      return (
                        <View key={item.id} className="bg-bg/40 border border-blue-light/50 rounded-xl p-3.5">
                          <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1 pr-2">
                              <Text className="text-navy font-bold text-sm">{item.nom_medicament}</Text>
                              <Text className="text-muted text-[10px] mt-0.5">Dosage : {item.dosage} · Forme : {item.forme_galenique || '—'}</Text>
                            </View>
                            <View className="bg-blue-light/20 px-2 py-0.5 rounded-full">
                              <Text className="text-blue text-[10px] font-bold">Demandé: {item.quantite_demandee} u.</Text>
                            </View>
                          </View>

                          {/* Choix du lot */}
                          <Text className="text-navy font-bold text-[11px] mb-1.5 uppercase tracking-wider">Lot à utiliser :</Text>
                          {noLots ? (
                            <View className="bg-pharma-red/10 border border-pharma-red/30 rounded-xl p-2.5 mb-2">
                              <Text className="text-pharma-red font-bold text-[11px] text-center">
                                ⚠️ Aucun lot actif disponible en stock pour ce médicament.
                              </Text>
                            </View>
                          ) : (
                            <View className="mb-2">
                              <TouchableOpacity
                                onPress={() => setOpenLotPickerId(openLotPickerId === item.id ? null : item.id)}
                                className="bg-white border border-blue-light rounded-xl h-11 px-3 flex-row items-center justify-between"
                              >
                                <Text className="text-navy font-bold text-xs" numberOfLines={1}>
                                  {selectedLot 
                                    ? `Lot: ${selectedLot.numero_lot} (Dispo: ${available} u. · Exp: ${selectedLot.date_expiration ? new Date(selectedLot.date_expiration).toLocaleDateString('fr-FR') : '—'})` 
                                    : 'Sélectionner un lot...'}
                                </Text>
                                <FAIcon name={openLotPickerId === item.id ? "chevron-up" : "chevron-down"} size={12} color="#1A3A5C" family="FontAwesome6" />
                              </TouchableOpacity>

                              {openLotPickerId === item.id && (
                                <View className="mt-1 border border-blue-light/50 rounded-xl bg-white overflow-hidden shadow-sm">
                                  {matchingLots.map(l => {
                                    const qtyAvail = l.quantite_actuelle ?? l.quantite_initiale;
                                    return (
                                      <TouchableOpacity
                                        key={l.id}
                                        onPress={() => {
                                          setSelectedLotsForBulk(prev => ({ ...prev, [item.id]: l.id }));
                                          setOpenLotPickerId(null);
                                        }}
                                        className={`px-3 py-2 border-b border-bg flex-row justify-between items-center ${selectedLotId === l.id ? 'bg-blue-light/10' : ''}`}
                                      >
                                        <Text className="text-navy text-xs font-semibold">Lot: {l.numero_lot}</Text>
                                        <Text className="text-muted text-[10px]">Stock: {qtyAvail} u. · Exp: {l.date_expiration}</Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              )}
                            </View>
                          )}

                          {/* Quantité à livrer */}
                          {!noLots && (
                            <View className="flex-row items-center justify-between gap-3 mt-1">
                              <Text className="text-muted text-xs font-semibold">Quantité à livrer :</Text>
                              <View className="flex-row items-center">
                                <TouchableOpacity 
                                  style={{ width: 34, height: 34 }}
                                  className="items-center justify-center bg-white border border-blue-light rounded-xl active:bg-blue-light/30" 
                                  onPress={() => {
                                    const next = Math.max(1, qty - 1);
                                    setBulkQuantities(prev => ({ ...prev, [item.id]: String(next) }));
                                  }}
                                >
                                  <FAIcon name="minus" size={11} color="#1A3A5C" family="FontAwesome6" />
                                </TouchableOpacity>
                                <TextInput
                                  style={{ width: 60, height: 34, padding: 0, marginHorizontal: 6 }}
                                  className="text-center text-navy font-bold text-sm bg-white border border-blue-light rounded-xl"
                                  keyboardType="number-pad"
                                  value={qtyStr}
                                  onChangeText={(t) => {
                                    const cleaned = t.replace(/[^0-9]/g, '');
                                    setBulkQuantities(prev => ({ ...prev, [item.id]: cleaned }));
                                  }}
                                />
                                <TouchableOpacity 
                                  style={{ width: 34, height: 34 }}
                                  className="items-center justify-center bg-white border border-blue-light rounded-xl active:bg-blue-light/30" 
                                  onPress={() => {
                                    const next = qty + 1;
                                    setBulkQuantities(prev => ({ ...prev, [item.id]: String(next) }));
                                  }}
                                >
                                  <FAIcon name="plus" size={11} color="#1A3A5C" family="FontAwesome6" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}

                          {hasStockError && (
                            <Text className="text-pharma-red text-[10px] font-bold mt-1.5 text-right">
                              ⚠️ Quantité supérieure au stock disponible ({available} u.)
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>

                <View className="flex-row gap-3 pt-3 border-t border-bg">
                  <TouchableOpacity
                    onPress={() => setBulkDeliveryModalVisible(false)}
                    className="flex-1 h-12 border border-blue-light rounded-xl items-center justify-center"
                  >
                    <Text className="text-navy font-bold text-sm">Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleExecuteBulkDelivery}
                    disabled={bulkSaving || bulkDeliveryItems.some(item => {
                      const lotId = selectedLotsForBulk[item.id];
                      const qty = parseInt(bulkQuantities[item.id], 10) || 0;
                      const matching = (bulkLotsMap[item.nom_medicament] ?? []).filter(l => matchesRequestedMedicine(l, item));
                      const lot = matching.find(l => l.id === lotId);
                      const available = lot ? (lot.quantite_actuelle ?? lot.quantite_initiale) : 0;
                      return !lotId || qty <= 0 || qty > available;
                    })}
                    className={`flex-1 h-12 rounded-xl items-center justify-center ${
                      bulkSaving || bulkDeliveryItems.some(item => {
                        const lotId = selectedLotsForBulk[item.id];
                        const qty = parseInt(bulkQuantities[item.id], 10) || 0;
                        const matching = (bulkLotsMap[item.nom_medicament] ?? []).filter(l => matchesRequestedMedicine(l, item));
                        const lot = matching.find(l => l.id === lotId);
                        const available = lot ? (lot.quantite_actuelle ?? lot.quantite_initiale) : 0;
                        return !lotId || qty <= 0 || qty > available;
                      })
                        ? 'bg-navy/40' 
                        : 'bg-navy'
                    }`}
                  >
                    {bulkSaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-bold text-sm">Confirmer la livraison</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <ConfirmModal
        visible={!!successModal}
        title={successModal?.title ?? ''}
        message={successModal?.message ?? ''}
        confirmText="OK"
        confirmColor={successModal?.color}
        icon={successModal?.icon}
        onConfirm={async () => setSuccessModal(null)}
      />
    </ScrollView>
  );
}
