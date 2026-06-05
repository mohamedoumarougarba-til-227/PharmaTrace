import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import ConfirmModal from '../../components/ConfirmModal';

type FabricantOption = {
  id: string;
  nom_entite: string;
};

type DemandeRow = {
  id: string;
  nom_medicament: string;
  dosage: string;
  quantite_demandee: number;
  notes_pharmacie: string | null;
  notes_fabricant: string | null;
  statut: 'en_attente' | 'satisfait' | 'refuse' | 'annule';
  created_at: string;
  fabricant_id: { nom_entite: string } | null;
  transfert_id: string | null;
};

export default function MesDemandesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [demandes, setDemandes] = useState<DemandeRow[]>([]);
  const [fabricants, setFabricants] = useState<FabricantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<DemandeRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DemandeRow | null>(null);

  // Formulaire de création
  const [form, setForm] = useState({
    fabricantId: '',
    nomMedicament: '',
    dosage: '',
    quantite: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    color: string;
    icon: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Récupérer les demandes
      const { data: listData, error: listError } = await supabase
        .from('demandes_stock')
        .select('id, nom_medicament, dosage, quantite_demandee, notes_pharmacie, notes_fabricant, statut, created_at, fabricant_id(nom_entite), transfert_id')
        .eq('pharmacie_id', session.user.id)
        .order('created_at', { ascending: false });

      if (listError) throw listError;
      setDemandes((listData ?? []) as unknown as DemandeRow[]);

      // 2. Récupérer la liste des fabricants pour le dropdown
      const { data: fabData, error: fabError } = await supabase
        .from('utilisateurs')
        .select('id, nom_entite')
        .eq('role', 'fabricant')
        .eq('statut', 'actif');

      if (fabError) throw fabError;
      setFabricants(fabData ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleCreateRequest = async () => {
    if (!form.fabricantId || !form.nomMedicament || !form.dosage || !form.quantite) {
      setConfirmModal({
        title: 'Champs requis',
        message: 'Veuillez remplir tous les champs obligatoires.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
        onConfirm: () => setConfirmModal(null),
      });
      return;
    }

    const qtyVal = parseInt(form.quantite, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setConfirmModal({
        title: 'Quantité invalide',
        message: 'La quantité demandée doit être un nombre supérieur à 0.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
        onConfirm: () => setConfirmModal(null),
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from('demandes_stock').insert({
        pharmacie_id: session.user.id,
        fabricant_id: form.fabricantId,
        nom_medicament: form.nomMedicament,
        dosage: form.dosage,
        quantite_demandee: qtyVal,
        notes_pharmacie: form.notes || null,
        statut: 'en_attente',
      });

      if (error) throw error;

      setShowCreateModal(false);
      setForm({ fabricantId: '', nomMedicament: '', dosage: '', quantite: '', notes: '' });
      await loadData();

      setConfirmModal({
        title: 'Demande envoyée',
        message: 'Votre demande a été transmise avec succès au fabricant.',
        color: '#27AE60',
        icon: 'circle-check',
        onConfirm: () => setConfirmModal(null),
      });
    } catch (e) {
      console.error(e);
      setConfirmModal({
        title: 'Erreur',
        message: 'Impossible de soumettre la demande.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
        onConfirm: () => setConfirmModal(null),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (demande: DemandeRow) => {
    try {
      const { error } = await supabase
        .from('demandes_stock')
        .update({ statut: 'annule' })
        .eq('id', demande.id);

      if (error) throw error;

      await loadData();
      setConfirmModal({
        title: 'Demande annulée',
        message: 'La demande de stock a été annulée.',
        color: '#7F8C8D',
        icon: 'circle-check',
        onConfirm: () => setConfirmModal(null),
      });
    } catch (e) {
      console.error(e);
      setConfirmModal({
        title: 'Erreur',
        message: "Impossible d'annuler la demande.",
        color: '#C0392B',
        icon: 'triangle-exclamation',
        onConfirm: () => setConfirmModal(null),
      });
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
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Annulé' };
    }
  };

  if (loading && demandes.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#27AE60" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {/* Header / Actions */}
      <View className="px-4 py-3 bg-white border-b border-blue-light flex-row justify-between items-center">
        <View>
          <Text className="text-navy font-bold text-base">{demandes.length} demandes effectuées</Text>
          <Text className="text-muted text-xs mt-0.5">Demander du stock auprès des laboratoires agréés</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          className="bg-pharma-green px-4 h-10 rounded-lg flex-row items-center gap-2"
        >
          <FAIcon name="plus" size={14} color="#fff" family="FontAwesome6" />
          <Text className="text-white font-bold text-sm">Nouvelle demande</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {demandes.map((d) => {
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
                  <Text className="text-navy font-bold text-base">{d.nom_medicament}</Text>
                  <Text className="text-muted text-xs mt-1">Dosage : {d.dosage} · Quantité : {d.quantite_demandee} unités</Text>
                </View>
                <View className={`${style.bg} px-2 py-0.5 rounded-full`}>
                  <Text className={`${style.text} text-[10px] font-bold uppercase`}>{style.label}</Text>
                </View>
              </View>

              <Text className="text-muted text-xs mb-3">Vers : {d.fabricant_id?.nom_entite ?? 'Fabricant'}</Text>
              
              <View className="flex-row justify-between items-center border-t border-bg pt-3">
                <Text className="text-muted text-[10px]">
                  Fait le : {new Date(d.created_at).toLocaleDateString('fr-FR')}
                </Text>
                
                {d.statut === 'en_attente' && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setCancelTarget(d);
                    }}
                    className="px-3 py-1 border border-pharma-red/30 rounded-lg"
                  >
                    <Text className="text-pharma-red text-xs font-semibold">Annuler</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {demandes.length === 0 && (
          <View className="items-center justify-center py-12">
            <FAIcon name="clipboard-list" size={48} color="#BACAD6" family="FontAwesome6" />
            <Text className="text-navy font-bold text-base mt-4">Aucune demande</Text>
            <Text className="text-muted text-xs mt-2 text-center">
              Faites vos demandes de réapprovisionnement en cliquant sur le bouton ci-dessus.
            </Text>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      {/* Modal Formulaire de Création */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4 border-b border-bg pb-3">
              <Text className="text-navy font-black text-lg">Nouvelle Demande</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} className="p-1">
                <FAIcon name="xmark" size={18} color="#C0392B" family="FontAwesome6" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={true}>
              <View className="gap-4">
                {/* Choix Fabricant */}
                <View>
                  <Text className="text-navy font-bold text-xs mb-1.5">Fabricant destinataire *</Text>
                  <View className="bg-bg border border-blue-light rounded-xl overflow-hidden">
                    <select
                      value={form.fabricantId}
                      onChange={(e) => setForm({ ...form, fabricantId: e.target.value })}
                      style={{
                        width: '100%',
                        height: 48,
                        padding: '0 16px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: 14,
                        color: '#1A3A5C',
                        outline: 'none',
                      }}
                    >
                      <option value="">Sélectionner un fabricant...</option>
                      {fabricants.map((f) => (
                        <option key={f.id} value={f.id}>{f.nom_entite}</option>
                      ))}
                    </select>
                  </View>
                </View>

                {/* Nom médicament */}
                <View>
                  <Text className="text-navy font-bold text-xs mb-1.5">Nom du médicament *</Text>
                  <TextInput
                    className="bg-bg border border-blue-light rounded-xl h-12 px-4 text-sm text-navy"
                    placeholder="Ex : Ceftriaxone"
                    placeholderTextColor="#bbb"
                    value={form.nomMedicament}
                    onChangeText={(val) => setForm({ ...form, nomMedicament: val })}
                  />
                </View>

                {/* Dosage */}
                <View>
                  <Text className="text-navy font-bold text-xs mb-1.5">Dosage *</Text>
                  <TextInput
                    className="bg-bg border border-blue-light rounded-xl h-12 px-4 text-sm text-navy"
                    placeholder="Ex : 1g"
                    placeholderTextColor="#bbb"
                    value={form.dosage}
                    onChangeText={(val) => setForm({ ...form, dosage: val })}
                  />
                </View>

                {/* Quantité */}
                <View>
                  <Text className="text-navy font-bold text-xs mb-1.5">Quantité demandée (unités) *</Text>
                  <TextInput
                    className="bg-bg border border-blue-light rounded-xl h-12 px-4 text-sm text-navy"
                    placeholder="Ex : 500"
                    placeholderTextColor="#bbb"
                    value={form.quantite}
                    keyboardType="numeric"
                    onChangeText={(val) => setForm({ ...form, quantite: val.replace(/[^0-9]/g, '') })}
                  />
                </View>

                {/* Notes */}
                <View>
                  <Text className="text-navy font-bold text-xs mb-1.5">Notes additionnelles</Text>
                  <TextInput
                    className="bg-bg border border-blue-light rounded-xl p-3 text-sm text-navy"
                    placeholder="Précisions de livraison, urgence..."
                    placeholderTextColor="#bbb"
                    value={form.notes}
                    onChangeText={(val) => setForm({ ...form, notes: val })}
                    multiline
                    numberOfLines={3}
                    style={{ minHeight: 70, textAlignVertical: 'top' }}
                  />
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-3 mt-6 pt-3 border-t border-bg">
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                className="flex-1 h-12 border border-blue-light rounded-xl items-center justify-center"
              >
                <Text className="text-navy font-bold text-sm">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateRequest}
                disabled={submitting}
                className="flex-1 h-12 bg-pharma-green rounded-xl items-center justify-center"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-sm">Envoyer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Détails d'une Demande */}
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

                  <DetailRow label="Fabricant" value={selectedDemande.fabricant_id?.nom_entite ?? '—'} />
                  <DetailRow label="Quantité" value={`${selectedDemande.quantite_demandee} unités`} />
                  <DetailRow label="Fait le" value={new Date(selectedDemande.created_at).toLocaleString('fr-FR')} />
                  
                  <View className="py-2 border-b border-bg">
                    <Text className="text-muted text-[10px] uppercase tracking-wider mb-1">Notes Pharmacie</Text>
                    <Text className="text-navy text-sm font-medium">{selectedDemande.notes_pharmacie ?? 'Aucune note.'}</Text>
                  </View>

                  {selectedDemande.notes_fabricant && (
                    <View className="py-2 border-b border-bg">
                      <Text className="text-muted text-[10px] uppercase tracking-wider mb-1">Motif de réponse fabricant</Text>
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

      {/* Confirmation Annulation */}
      <ConfirmModal
        visible={!!cancelTarget}
        title="Annuler la demande"
        message="Voulez-vous vraiment annuler cette demande de stock ?"
        confirmText="Annuler la demande"
        cancelText="Conserver"
        confirmColor="#C0392B"
        icon="triangle-exclamation"
        onConfirm={async () => {
          if (cancelTarget) {
            await handleCancelRequest(cancelTarget);
            setCancelTarget(null);
          }
        }}
        onCancel={() => setCancelTarget(null)}
      />

      {/* Success/Error Alerts */}
      <ConfirmModal
        visible={!!confirmModal}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        confirmText="OK"
        confirmColor={confirmModal?.color}
        icon={confirmModal?.icon}
        onConfirm={async () => {
          if (confirmModal?.onConfirm) {
            confirmModal.onConfirm();
          }
        }}
      />
    </View>
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
