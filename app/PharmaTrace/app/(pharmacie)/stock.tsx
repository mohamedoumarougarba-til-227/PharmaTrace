import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome6 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';

export default function StockScreen() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStock = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Récupère les transferts réceptionnés pour cette pharmacie avec les infos du lot
      const { data, error } = await supabase
        .from('transferts')
        .select('id, quantite_transferee, date_reception, statut, expediteur_id(nom_entite), lot_id(id, numero_lot, nom_medicament, dosage, date_expiration, quantite_initiale)')
        .eq('destinataire_id', session.user.id)
        .eq('statut', 'receptionne')
        .order('date_reception', { ascending: false });

      if (error) throw error;
      setItems((data ?? []).map((r: any, i: number) => ({
        id: r.id,
        nom: r.lot_id?.nom_medicament ?? '—',
        num: r.lot_id?.numero_lot ?? '—',
        dosage: r.lot_id?.dosage ?? '—',
        qte: r.quantite_transferee,
        exp: r.lot_id?.date_expiration ? new Date(r.lot_id.date_expiration).toLocaleDateString('fr-FR') : '—',
        alerte: r.lot_id?.date_expiration ? (new Date(r.lot_id.date_expiration) < new Date(Date.now() + 30 * 24 * 3600 * 1000)) : false,
      })));
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
        <View className="flex-row justify-between mb-3">
          <Text className="text-navy font-bold text-base">{items.length} lots en stock</Text>
          <View className="flex-row items-center gap-1">
            <FAIcon name="triangle-exclamation" size={14} color="#E67E22" family="FontAwesome6" />
            <Text className="text-pharma-orange font-semibold text-sm">{items.filter(i => i.alerte).length} expirent bientôt</Text>
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
        {filtered.map(lot => (
          <View
            key={lot.id}
            className={`bg-white rounded-xl p-4 mb-2 shadow-sm border-l-4 ${lot.alerte ? 'border-pharma-orange' : 'border-pharma-green'}`}
            style={{ backgroundColor: lot.alerte ? '#FFFBF5' : '#fff' }}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-2">
                <Text className="text-navy font-bold text-sm">{lot.nom}</Text>
                <Text className="text-muted text-xs mt-1">{lot.num}  ·  {lot.dosage}</Text>
              </View>
              {lot.alerte && (
                <View className="bg-pharma-orange/10 px-2 py-1 rounded-full flex-row items-center gap-1">
                  <FAIcon name="triangle-exclamation" size={12} color="#E67E22" family="FontAwesome6" />
                  <Text className="text-pharma-orange text-xs font-bold">Bientôt</Text>
                </View>
              )}
            </View>
            <View className="flex-row justify-between items-center pt-2 border-t border-bg">
              <Text className="text-xs text-muted">{lot.qte} unités · Exp : <Text className={lot.alerte ? 'text-pharma-orange font-bold' : 'text-text'}>{lot.exp}</Text></Text>
              <View className="flex-row gap-2">
                <TouchableOpacity className="px-3 py-1.5 border border-blue-light rounded-lg flex-row items-center gap-1">
                  <FAIcon name="magnifying-glass" size={12} color="#2E6DA4" family="FontAwesome6" />
                  <Text className="text-blue text-xs font-semibold">Vérifier</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
