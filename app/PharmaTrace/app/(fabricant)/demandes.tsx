import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
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

export default function RequetesStockScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [groupedDemandes, setGroupedDemandes] = useState<GroupedDemande[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedDemande | null>(null);
  
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
      const { error } = await supabase
        .from('demandes_stock')
        .update({
          statut: 'refuse',
          notes_fabricant: motifRefus.trim(),
        })
        .eq('id', refusTarget.id);

      if (error) throw error;

      setRefusTarget(null);
      setMotifRefus('');
      await loadDemandes();
      
      setSuccessModal({
        title: 'Article refusé',
        message: 'Cet article a été refusé avec succès.',
        color: '#E67E22',
        icon: 'circle-check',
      });
    } catch (e) {
      console.error(e);
      setSuccessModal({
        title: 'Erreur',
        message: 'La mise à jour de la demande a échoué.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
    } finally {
      setRefusing(false);
    }
  };

  const handleRepondreTransfert = (item: DemandeItem, pharmacieId: string) => {
    setSelectedGroup(null);
    router.push({
      pathname: '/(fabricant)/nouveau-transfert',
      params: {
        demandeId: item.id,
        nomMedicament: item.nom_medicament,
        destinataireId: pharmacieId,
        quantite: String(item.quantite_demandee),
      },
    });
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
          onPress={() => setSelectedGroup(d)}
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
                onPress={() => setSelectedGroup(d)}
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
        visible={refusTarget !== null}
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
        visible={selectedGroup !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedGroup(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4 border-b border-bg pb-3">
              <Text className="text-navy font-black text-lg">Détails Demande</Text>
              <TouchableOpacity onPress={() => setSelectedGroup(null)} className="p-1">
                <FAIcon name="xmark" size={18} color="#C0392B" family="FontAwesome6" />
              </TouchableOpacity>
            </View>

            {selectedGroup && (
              <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={true}>
                <View className="gap-3">
                  <View className="border-b border-bg pb-2">
                    <Text className="text-navy font-black text-sm">De : {selectedGroup.pharmacie}</Text>
                    <Text className="text-muted text-[10px] mt-0.5">Reçue le {new Date(selectedGroup.created_at).toLocaleString('fr-FR')}</Text>
                  </View>

                  <Text className="text-navy font-bold text-xs uppercase tracking-wider mt-1">Articles demandés :</Text>
                  
                  {selectedGroup.items.map((item) => {
                    const itemStyle = getStatusStyle(item.statut);
                    return (
                      <View key={item.id} className="bg-bg/40 border border-blue-light/50 rounded-xl p-3 mb-2">
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-navy font-bold text-xs flex-1 mr-2">{item.nom_medicament}</Text>
                          <View className={`${itemStyle.bg} px-2 py-0.5 rounded-full`}>
                            <Text className={`${itemStyle.text} text-[9px] font-bold uppercase`}>{itemStyle.label}</Text>
                          </View>
                        </View>
                        <Text className="text-muted text-[10px] mb-1">Dosage : {item.dosage} · Forme : {item.forme_galenique || '—'}</Text>
                        <Text className="text-navy text-xs font-bold mb-2">Quantité : {item.quantite_demandee} unités</Text>
                        
                        {item.statut === 'en_attente' && (
                          <View className="flex-row gap-2 mt-2 pt-2 border-t border-blue-light/30">
                            <TouchableOpacity
                              onPress={() => setRefusTarget(item)}
                              className="flex-1 h-8 border border-pharma-red/40 rounded-lg items-center justify-center"
                            >
                              <Text className="text-pharma-red text-[11px] font-semibold">Refuser</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRepondreTransfert(item, selectedGroup.pharmacie_id)}
                              className="flex-2 h-8 bg-navy rounded-lg items-center justify-center flex-row gap-1"
                            >
                              <FAIcon name="share" size={9} color="#fff" family="FontAwesome6" />
                              <Text className="text-white text-[11px] font-bold">Livrer par transfert</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {item.notes_fabricant && (
                          <View className="mt-2 bg-white p-2 rounded border border-blue-light/30">
                            <Text className="text-[9px] text-muted font-bold uppercase">Notes Fabricant</Text>
                            <Text className="text-navy text-[10px] font-medium">{item.notes_fabricant}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  <View className="py-2 border-t border-bg mt-2">
                    <Text className="text-muted text-[10px] uppercase tracking-wider mb-1">Message pharmacie (global)</Text>
                    <Text className="text-navy text-xs font-medium">{selectedGroup.notes_pharmacie ?? 'Aucune note.'}</Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setSelectedGroup(null)}
              className="mt-6 w-full h-12 bg-navy rounded-xl items-center justify-center"
            >
              <Text className="text-white font-bold text-sm">Fermer</Text>
            </TouchableOpacity>
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
