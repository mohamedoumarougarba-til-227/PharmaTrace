import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import ConfirmModal from '../../components/ConfirmModal';

type DemandeRow = {
  id: string;
  nom_medicament: string;
  dosage: string;
  quantite_demandee: number;
  notes_pharmacie: string | null;
  notes_fabricant: string | null;
  statut: 'en_attente' | 'satisfait' | 'refuse' | 'annule';
  created_at: string;
  pharmacie_id: { id: string; nom_entite: string } | null;
  transfert_id: string | null;
};

export default function RequetesStockScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [demandes, setDemandes] = useState<DemandeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<DemandeRow | null>(null);
  
  // Refus
  const [refusTarget, setRefusTarget] = useState<DemandeRow | null>(null);
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
        .select('id, nom_medicament, dosage, quantite_demandee, notes_pharmacie, notes_fabricant, statut, created_at, pharmacie_id(id, nom_entite), transfert_id')
        .eq('fabricant_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDemandes((data ?? []) as unknown as DemandeRow[]);
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

  const handleRefus = async () => {
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
        title: 'Demande refusée',
        message: 'La demande a été rejetée et la pharmacie en a été notifiée.',
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

  const handleRepondreTransfert = (demande: DemandeRow) => {
    if (!demande.pharmacie_id?.id) return;
    router.push({
      pathname: '/(fabricant)/nouveau-transfert',
      params: {
        demandeId: demande.id,
        nomMedicament: demande.nom_medicament,
        destinataireId: demande.pharmacie_id.id,
        quantite: String(demande.quantite_demandee),
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
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Annulé' };
    }
  };

  if (loading && demandes.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#1A3A5C" size="large" />
      </View>
    );
  }

  const enAttente = demandes.filter((d) => d.statut === 'en_attente');
  const historique = demandes.filter((d) => d.statut !== 'en_attente');

  return (
    <ScrollView
      className="flex-1 bg-bg p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Section En attente */}
      <View className="mb-4 flex-row items-center gap-2">
        <FAIcon name="bell" size={16} color="#E67E22" family="FontAwesome6" />
        <Text className="text-navy font-bold text-base">{enAttente.length} demandes en attente</Text>
      </View>

      {enAttente.map((d) => (
        <View key={d.id} className="bg-white rounded-xl p-4 mb-3 border-l-4 border-pharma-orange shadow-sm">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 mr-2">
              <Text className="text-navy font-bold text-base">{d.nom_medicament}</Text>
              <Text className="text-muted text-xs mt-1">Dosage : {d.dosage} · Quantité demandée : {d.quantite_demandee} unités</Text>
            </View>
            <View className="bg-pharma-orange/10 px-2 py-0.5 rounded-full">
              <Text className="text-pharma-orange text-[10px] font-bold uppercase">Nouveau</Text>
            </View>
          </View>
          <Text className="text-muted text-xs mb-2">De : {d.pharmacie_id?.nom_entite ?? 'Pharmacie'}</Text>
          {d.notes_pharmacie && (
            <View className="bg-bg p-3 rounded-lg mb-3 border border-blue-light">
              <Text className="text-[10px] text-muted font-bold uppercase mb-1">Message pharmacie</Text>
              <Text className="text-navy text-xs">{d.notes_pharmacie}</Text>
            </View>
          )}

          <View className="flex-row gap-2 border-t border-bg pt-3">
            <TouchableOpacity
              onPress={() => setRefusTarget(d)}
              className="flex-1 h-10 border border-pharma-red rounded-lg items-center justify-center"
            >
              <Text className="text-pharma-red font-semibold text-sm">Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleRepondreTransfert(d)}
              className="flex-2 h-10 bg-navy rounded-lg items-center justify-center flex-row gap-2"
            >
              <FAIcon name="share" size={12} color="#fff" family="FontAwesome6" />
              <Text className="text-white font-bold text-sm">Répondre par transfert</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {enAttente.length === 0 && (
        <View className="bg-white rounded-xl p-6 mb-4 items-center justify-center border border-blue-light">
          <FAIcon name="circle-check" size={32} color="#27AE60" family="FontAwesome6" />
          <Text className="text-navy font-bold text-sm mt-3">Aucune demande en attente</Text>
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
                onPress={() => setSelectedDemande(d)}
                className="bg-white rounded-xl p-4 mb-3 border border-blue-light shadow-sm"
                activeOpacity={0.7}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-navy font-bold text-sm">{d.nom_medicament}</Text>
                    <Text className="text-muted text-xs mt-0.5">{d.quantite_demandee} unités · {d.dosage}</Text>
                  </View>
                  <View className={`${style.bg} px-2 py-0.5 rounded-full`}>
                    <Text className={`${style.text} text-[10px] font-bold uppercase`}>{style.label}</Text>
                  </View>
                </View>
                <Text className="text-muted text-[10px]">
                  De : {d.pharmacie_id?.nom_entite ?? 'Pharmacie'} · Le : {new Date(d.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* Modal Formulaire de Refus */}
      <Modal
        visible={refusTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRefusTarget(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
            <View className="flex-row justify-between items-center mb-4 border-b border-bg pb-3">
              <Text className="text-navy font-black text-lg">Refuser la demande</Text>
              <TouchableOpacity onPress={() => setRefusTarget(null)} className="p-1">
                <FAIcon name="xmark" size={18} color="#C0392B" family="FontAwesome6" />
              </TouchableOpacity>
            </View>

            <Text className="text-muted text-xs mb-3">
              Veuillez saisir la raison pour laquelle vous ne pouvez pas satisfaire cette demande (ex: rupture de stock).
            </Text>

            <TextInput
              className="bg-bg border border-blue-light rounded-xl p-3 text-sm text-navy mb-4"
              placeholder="Saisissez le motif de refus..."
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
                onPress={handleRefus}
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

      {/* Modal Détails Demande */}
      <Modal
        visible={selectedDemande !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDemande(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4 border-b border-bg pb-3">
              <Text className="text-navy font-black text-lg">Détails Demande</Text>
              <TouchableOpacity onPress={() => setSelectedDemande(null)} className="p-1">
                <FAIcon name="xmark" size={18} color="#C0392B" family="FontAwesome6" />
              </TouchableOpacity>
            </View>

            {selectedDemande && (
              <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={true}>
                <View className="gap-3">
                  <View className="bg-pharma-green/10 p-3 rounded-xl mb-2">
                    <Text className="text-pharma-green font-bold text-base">{selectedDemande.nom_medicament}</Text>
                    <Text className="text-muted text-xs mt-1">{selectedDemande.dosage}</Text>
                  </View>

                  <DetailRow label="Pharmacie" value={selectedDemande.pharmacie_id?.nom_entite ?? '—'} />
                  <DetailRow label="Quantité" value={`${selectedDemande.quantite_demandee} unités`} />
                  <DetailRow label="Fait le" value={new Date(selectedDemande.created_at).toLocaleString('fr-FR')} />
                  
                  <View className="py-2 border-b border-bg">
                    <Text className="text-muted text-[10px] uppercase tracking-wider mb-1">Message pharmacie</Text>
                    <Text className="text-navy text-sm font-medium">{selectedDemande.notes_pharmacie ?? 'Aucun message.'}</Text>
                  </View>

                  {selectedDemande.notes_fabricant && (
                    <View className="py-2 border-b border-bg">
                      <Text className="text-muted text-[10px] uppercase tracking-wider mb-1">Motif de refus fabricant</Text>
                      <Text className="text-navy text-sm font-semibold">{selectedDemande.notes_fabricant}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setSelectedDemande(null)}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-bg">
      <Text className="text-muted text-[10px] uppercase tracking-wider">{label}</Text>
      <Text className="text-sm font-semibold text-text text-right flex-1 ml-4">{value}</Text>
    </View>
  );
}
