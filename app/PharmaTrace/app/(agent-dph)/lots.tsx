import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';

const STATUT_MAP: Record<string, { label: string; bg: string; text: string }> = {
  en_stock_fabricant: { label: 'En stock',     bg: '#EEF4FB', text: '#2E6DA4' },
  en_transit:         { label: 'En transit',   bg: '#FEF4E0', text: '#E67E22' },
  en_pharmacie:       { label: 'En pharmacie', bg: '#E8F8EC', text: '#27AE60' },
  archive:            { label: 'Archivé',      bg: '#F0F0F0', text: '#999'    },
};

export default function AgentLotsScreen() {
  const [search, setSearch] = useState('');
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lots_avec_fabricant')
        .select('id, numero_lot, nom_medicament, date_expiration, statut_actuel, fabricant_nom, fabricant_ville')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLots(data ?? []);
    } catch (e) {
      console.error(e);
      setLots([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadLots(); }, []));

  const onRefresh = async () => { setRefreshing(true); await loadLots(); };

  const filtered = lots.filter(l =>
    l.nom_medicament.toLowerCase().includes(search.toLowerCase()) ||
    l.fabricant_nom?.toLowerCase().includes(search.toLowerCase()) ||
    l.numero_lot?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (<View className="flex-1 items-center justify-center bg-bg"><ActivityIndicator color="#1A3A5C" size="large" /></View>);

  return (
    <View className="flex-1 bg-bg">
      <View className="bg-pharma-purple/10 px-4 py-3 border-b border-blue-light">
        <View className="flex-row items-center gap-2 mb-2">
          <FAIcon name="eye" size={12} color="#8E44AD" family="FontAwesome6" />
          <Text className="text-pharma-purple text-xs font-semibold">Lecture seule — Tous les fabricants</Text>
        </View>
        <TextInput
          className="bg-white border border-blue-light rounded-lg h-10 px-4 text-sm"
          placeholder="Rechercher par fabricant, nom, N° lot..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView className="flex-1 px-4 pt-3" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text className="text-muted text-xs mb-3">{filtered.length} lot(s)</Text>
        {filtered.map(lot => {
          const s = STATUT_MAP[lot.statut_actuel] ?? STATUT_MAP['archive'];
          const expired = lot.date_expiration ? new Date(lot.date_expiration) < new Date() : false;
          return (
            <View key={lot.id} className="bg-white rounded-xl p-4 mb-2 shadow-sm">
              <View className="flex-row justify-between items-start mb-1">
                <Text className="text-navy font-bold text-sm flex-1 mr-2">{lot.nom_medicament}</Text>
                <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                  <Text className="text-xs font-bold" style={{ color: s.text }}>{s.label}</Text>
                </View>
              </View>
              <Text className="text-muted text-xs">{lot.numero_lot}</Text>
              <View className="flex-row justify-between mt-2 pt-2 border-t border-bg">
                <View className="flex-row items-center gap-1">
                  <FAIcon name="industry" size={11} color="#999" family="FontAwesome6" />
                  <Text className="text-xs text-muted">{lot.fabricant_nom}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <FAIcon name="map-pin" size={11} color="#999" family="FontAwesome6" />
                  <Text className="text-xs text-muted">{lot.fabricant_ville ?? '—'}</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
