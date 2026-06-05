import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import ConfirmModal from '../../components/ConfirmModal';

type TransfertRow = {
  id: string;
  quantite_transferee: number;
  date_initiation: string;
  statut: 'en_attente' | 'receptionne' | 'refuse' | 'archive';
  expediteur_id: { nom_entite: string } | null;
  lot_id: {
    id: string;
    numero_lot: string;
    nom_medicament: string;
  } | null;
};

export default function TransfertsEntrantsScreen() {
  const [transferts, setTransferts] = useState<TransfertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRefusTarget, setConfirmRefusTarget] = useState<TransfertRow | null>(null);
  const [successModal, setSuccessModal] = useState<{
    title: string;
    message: string;
    color: string;
    icon: string;
  } | null>(null);

  const loadTransferts = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('transferts')
        .select('id, quantite_transferee, date_initiation, statut, expediteur_id(nom_entite), lot_id(id, numero_lot, nom_medicament)')
        .eq('destinataire_id', session.user.id)
        .eq('statut', 'en_attente')
        .order('date_initiation', { ascending: false });

      if (error) throw error;
      setTransferts((data ?? []) as unknown as TransfertRow[]);
    } catch (e) {
      console.error(e);
      setTransferts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadTransferts(); }, []));

  const onRefresh = async () => { setRefreshing(true); await loadTransferts(); };

  const updateTransferAndLot = async (
    transfertId: string,
    lotId: string | null,
    statut: 'receptionne' | 'refuse',
    quantite?: number,
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSuccessModal({
          title: 'Session expirée',
          message: 'Veuillez vous reconnecter.',
          color: '#C0392B',
          icon: 'triangle-exclamation',
        });
        return;
      }

      const updatePayload =
        statut === 'receptionne'
          ? { statut, date_reception: new Date().toISOString(), notes_destinataire: 'Réception confirmée depuis l\'application' }
          : { statut, date_reception: new Date().toISOString(), notes_destinataire: 'Lot refusé depuis l\'application' };

      const { error: transferError } = await supabase
        .from('transferts')
        .update(updatePayload)
        .eq('id', transfertId)
        .eq('destinataire_id', session.user.id);

      if (transferError) throw transferError;

      if (lotId) {
        if (statut === 'refuse' && quantite) {
          // Récupérer la quantité actuelle du lot pour lui restituer les unités refusées
          const { data: lotData } = await supabase
            .from('lots_medicaments')
            .select('quantite_actuelle')
            .eq('id', lotId)
            .single();

          const currentQty = lotData?.quantite_actuelle ?? 0;

          const { error: lotError } = await supabase
            .from('lots_medicaments')
            .update({
              statut_actuel: 'en_stock_fabricant',
              quantite_actuelle: currentQty + quantite,
            })
            .eq('id', lotId);

          if (lotError) throw lotError;
        } else {
          const lotUpdate =
            statut === 'receptionne'
              ? { statut_actuel: 'en_pharmacie' }
              : { statut_actuel: 'en_stock_fabricant' };

          const { error: lotError } = await supabase
            .from('lots_medicaments')
            .update(lotUpdate)
            .eq('id', lotId);

          if (lotError) throw lotError;
        }
      }

      await loadTransferts();
    } catch (e) {
      console.error(e);
      setSuccessModal({
        title: 'Erreur',
        message: 'La mise à jour du transfert a échoué.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
    }
  };

  const handleReception = (item: TransfertRow) => {
    if (!item.lot_id?.id) return;
    router.push({
      pathname: '/(pharmacie)/verifier',
      params: {
        transfertId: item.id,
        expectedLotId: item.lot_id.id,
        expectedLotNum: item.lot_id.numero_lot,
        expectedLotNom: item.lot_id.nom_medicament,
      }
    });
  };

  const handleRefus = (item: TransfertRow) => {
    setConfirmRefusTarget(item);
  };

  if (loading) return (<View className="flex-1 items-center justify-center bg-bg"><ActivityIndicator color="#1A3A5C" size="large" /></View>);

  return (
    <ScrollView className="flex-1 bg-bg p-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View className="bg-pharma-orange/10 border-l-4 border-pharma-orange rounded-r-xl p-3 mb-4">
        <View className="flex-row items-center gap-2">
          <FAIcon name="bolt" size={14} color="#E67E22" family="FontAwesome6" />
          <Text className="text-pharma-orange font-bold text-sm">{transferts.length} lots en attente de réception</Text>
        </View>
      </View>

      {transferts.map((t: any) => (
        <View key={t.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4 border-pharma-orange">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-2">
              <View className="bg-pharma-orange/10 self-start px-2 py-0.5 rounded-full mb-2">
                <Text className="text-pharma-orange text-xs font-bold uppercase">EN ATTENTE</Text>
              </View>
              <Text className="text-navy font-bold text-base">{t.lot_id?.nom_medicament}</Text>
              <Text className="text-muted text-xs mt-1">{t.quantite_transferee} unités · {t.lot_id?.numero_lot}</Text>
            </View>
            <Text className="text-muted text-xs">{new Date(t.date_initiation).toLocaleString('fr-FR')}</Text>
          </View>
          <Text className="text-muted text-xs mb-3">De : {t.expediteur_id?.nom_entite}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => handleRefus(t)}
              className="flex-1 h-10 border border-pharma-red rounded-lg items-center justify-center"
            >
              <Text className="text-pharma-red font-semibold text-sm">Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleReception(t)}
              className="flex-2 h-10 bg-pharma-green rounded-lg items-center justify-center px-5 flex-row gap-2"
            >
              <FAIcon name="check" size={12} color="#fff" family="FontAwesome6" />
              <Text className="text-white font-bold text-sm">Réceptionner</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {/* Modal de Confirmation de Refus */}
      <ConfirmModal
        visible={!!confirmRefusTarget}
        title="Refuser le lot"
        message={confirmRefusTarget ? `Voulez-vous vraiment refuser "${confirmRefusTarget.lot_id?.nom_medicament ?? ''}" ?\n\nCette action restituera les stocks au fabricant.` : ''}
        confirmText="Refuser"
        cancelText="Annuler"
        confirmColor="#C0392B"
        icon="triangle-exclamation"
        onConfirm={async () => {
          if (confirmRefusTarget) {
            await updateTransferAndLot(confirmRefusTarget.id, confirmRefusTarget.lot_id?.id ?? null, 'refuse', confirmRefusTarget.quantite_transferee);
            setConfirmRefusTarget(null);
            setSuccessModal({
              title: 'Lot refusé',
              message: 'Le transfert a été refusé et les stocks ont été restitués au fabricant.',
              color: '#27AE60',
              icon: 'circle-check',
            });
          }
        }}
        onCancel={() => setConfirmRefusTarget(null)}
      />

      {/* Modal d'Information Succès/Erreur */}
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
