import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome6 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';

export default function StockScreen() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLot, setSelectedLot] = useState<any | null>(null);

  const loadStock = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Récupère les transferts réceptionnés pour cette pharmacie avec les infos du lot
      const { data, error } = await supabase
        .from('transferts')
        .select('id, quantite_transferee, date_reception, statut, expediteur_id(nom_entite), lot_id(id, numero_lot, nom_medicament, dosage, date_expiration, quantite_initiale, hash_sha256)')
        .eq('destinataire_id', session.user.id)
        .eq('statut', 'receptionne')
        .order('date_reception', { ascending: false });

      if (error) throw error;
      const todayStr = new Date().toISOString().split('T')[0];
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split('T')[0];

      setItems((data ?? []).map((r: any) => {
        const expDateStr = r.lot_id?.date_expiration ?? '';
        const expired = expDateStr ? expDateStr < todayStr : false;
        const alerte = expDateStr ? (expDateStr >= todayStr && expDateStr < thirtyDaysLaterStr) : false;
        return {
          id: r.id,
          nom: r.lot_id?.nom_medicament ?? '—',
          num: r.lot_id?.numero_lot ?? '—',
          dosage: r.lot_id?.dosage ?? '—',
          qte: r.quantite_transferee,
          exp: r.lot_id?.date_expiration ? new Date(r.lot_id.date_expiration).toLocaleDateString('fr-FR') : '—',
          date_reception: r.date_reception ? new Date(r.date_reception).toLocaleDateString('fr-FR') : '—',
          fabricant: r.expediteur_id?.nom_entite ?? 'Laboratoire Niger Pharma',
          hash: r.lot_id?.hash_sha256 ?? '',
          expired,
          alerte,
        };
      }));
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => { loadStock(); }, []),
  );

  const onRefresh = async () => { setRefreshing(true); await loadStock(); };

  const filtered = items.filter(s =>
    s.nom.toLowerCase().includes(search.toLowerCase()) ||
    s.num.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg"><ActivityIndicator color="#1A3A5C" size="large" /></View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="px-4 pt-4 pb-2 bg-white border-b border-blue-light">
        <View className="flex-row justify-between mb-3 items-center">
          <Text className="text-navy font-bold text-base">{items.filter(i => !i.expired).length} lots actifs en stock</Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <FAIcon name="triangle-exclamation" size={14} color="#E67E22" family="FontAwesome6" />
              <Text className="text-pharma-orange font-semibold text-xs">{items.filter(i => i.alerte).length} bientôt</Text>
            </View>
            {items.some(i => i.expired) && (
              <View className="flex-row items-center gap-1">
                <FAIcon name="circle-xmark" size={14} color="#C0392B" family="FontAwesome6" />
                <Text className="text-pharma-red font-semibold text-xs">{items.filter(i => i.expired).length} expirés</Text>
              </View>
            )}
          </View>
        </View>
        <TextInput
          className="bg-bg border border-blue-light rounded-lg h-10 px-4 text-sm"
          placeholder="Rechercher..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView className="flex-1 px-4 pt-3" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {filtered.map(lot => {
          let borderColor = 'border-pharma-green';
          let bgColor = '#fff';
          if (lot.expired) {
            borderColor = 'border-pharma-red';
            bgColor = '#FFF5F5';
          } else if (lot.alerte) {
            borderColor = 'border-pharma-orange';
            bgColor = '#FFFBF5';
          }

          return (
            <View
              key={lot.id}
              className={`bg-white rounded-xl p-4 mb-2 shadow-sm border-l-4 ${borderColor}`}
              style={{ backgroundColor: bgColor }}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-navy font-bold text-sm">{lot.nom}</Text>
                  <Text className="text-muted text-xs mt-1">{lot.num}  ·  {lot.dosage}</Text>
                </View>
                {lot.expired ? (
                  <View className="bg-pharma-red/10 px-2 py-1 rounded-full flex-row items-center gap-1">
                    <FAIcon name="circle-xmark" size={12} color="#C0392B" family="FontAwesome6" />
                    <Text className="text-pharma-red text-xs font-bold">Expiré</Text>
                  </View>
                ) : lot.alerte ? (
                  <View className="bg-pharma-orange/10 px-2 py-1 rounded-full flex-row items-center gap-1">
                    <FAIcon name="triangle-exclamation" size={12} color="#E67E22" family="FontAwesome6" />
                    <Text className="text-pharma-orange text-xs font-bold">Bientôt</Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-row justify-between items-center pt-2 border-t border-bg">
                <Text className="text-xs text-muted">{lot.qte} unités · Exp : <Text className={lot.expired ? 'text-pharma-red font-bold' : lot.alerte ? 'text-pharma-orange font-bold' : 'text-text'}>{lot.exp}</Text></Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setSelectedLot(lot)}
                    className="px-3 py-1.5 border border-blue-light rounded-lg flex-row items-center gap-1"
                  >
                    <FAIcon name="magnifying-glass" size={12} color="#2E6DA4" family="FontAwesome6" />
                    <Text className="text-blue text-xs font-semibold">Vérifier</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
        <View className="h-8" />
      </ScrollView>

      {/* Modal Détails du Lot */}
      <Modal
        visible={selectedLot !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedLot(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4 border-b border-bg pb-3">
              <Text className="text-navy font-black text-lg">Détails du Lot</Text>
              <TouchableOpacity onPress={() => setSelectedLot(null)} className="p-1">
                <FAIcon name="xmark" size={18} color="#C0392B" family="FontAwesome6" />
              </TouchableOpacity>
            </View>

            {selectedLot && (
              <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
                <View className="gap-1">
                  <View className="bg-pharma-green/10 p-3 rounded-xl mb-2">
                    <Text className="text-pharma-green font-bold text-base">{selectedLot.nom}</Text>
                    <Text className="text-muted text-xs mt-1">{selectedLot.dosage}</Text>
                  </View>

                  <DetailRow label="Numéro de lot" value={selectedLot.num} isBold />
                  <DetailRow label="Quantité stockée" value={`${selectedLot.qte} unités`} />
                  <DetailRow label="Date d'arrivée" value={selectedLot.date_reception} />
                  <DetailRow
                    label="Expiration"
                    value={selectedLot.exp}
                    color={selectedLot.expired ? '#C0392B' : selectedLot.alerte ? '#E67E22' : '#27AE60'}
                    isBold={selectedLot.expired || selectedLot.alerte}
                  />
                  <DetailRow label="Fabricant" value={selectedLot.fabricant} />
                  <DetailRow label="Livré par" value={selectedLot.fabricant} />
                  
                  {selectedLot.hash && (
                    <View className="bg-bg p-3 rounded-lg border border-blue-light mt-2">
                      <Text className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1">Signature SHA-256</Text>
                      <Text className="text-[10px] font-mono text-navy select-all" style={{ flexWrap: 'wrap' }}>{selectedLot.hash}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setSelectedLot(null)}
              className="mt-6 w-full h-12 bg-navy rounded-xl items-center justify-center"
            >
              <Text className="text-white font-bold text-sm">Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value, color, isBold }: { label: string; value: string; color?: string; isBold?: boolean }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-bg">
      <Text className="text-muted text-[10px] uppercase tracking-wider align-middle">{label}</Text>
      <Text className="text-sm font-semibold text-text text-right flex-1 ml-4" style={{ color, fontWeight: isBold ? '900' : '600' }}>{value}</Text>
    </View>
  );
}
