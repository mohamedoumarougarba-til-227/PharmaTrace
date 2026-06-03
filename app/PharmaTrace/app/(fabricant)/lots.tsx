import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Link, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

const STATUT_MAP: Record<string, { label: string; bg: string; text: string }> = {
  en_stock_fabricant: { label: 'En stock',       bg: '#EEF4FB', text: '#2E6DA4' },
  en_transit:         { label: 'En transit',     bg: '#FEF4E0', text: '#E67E22' },
  en_pharmacie:       { label: 'En pharmacie',   bg: '#E8F8EC', text: '#27AE60' },
  expire_bientot:     { label: 'Expire bientôt', bg: '#FEF4E0', text: '#E67E22' },
  archive:            { label: 'Archivé',        bg: '#F0F0F0', text: '#999'    },
};

type LotRow = {
  id: string;
  nom_medicament: string;
  numero_lot: string;
  dosage: string | null;
  quantite_initiale: number;
  date_expiration: string;
  statut_actuel: string;
};

export default function LotsScreen() {
  const [search, setSearch] = useState('');
  const [lots, setLots] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLots = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLots([]);
        return;
      }

      const { data, error } = await supabase
        .from('lots_medicaments')
        .select('id, nom_medicament, numero_lot, dosage, quantite_initiale, date_expiration, statut_actuel')
        .eq('fabricant_id', session.user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLots((data ?? []) as LotRow[]);
    } catch (error) {
      console.error(error);
      setLots([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLots();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLots();
  };

  const filtered = lots.filter(l =>
    l.nom_medicament.toLowerCase().includes(search.toLowerCase()) ||
    l.numero_lot.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#1A3A5C" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {/* Barre de recherche */}
      <View className="px-4 pt-4 pb-2 bg-white border-b border-blue-light">
        <TextInput
          className="bg-bg border border-blue-light rounded-lg h-10 px-4 text-sm text-text"
          placeholder="Rechercher par nom ou N° lot..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        className="flex-1 px-4 pt-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3A5C" />}
      >
        <Text className="text-muted text-xs mb-3">{filtered.length} lot(s) trouvé(s)</Text>

        {filtered.length === 0 && (
          <View className="bg-white rounded-xl p-4 mb-2 border border-blue-light">
            <Text className="text-navy font-semibold text-sm">Aucun lot enregistré</Text>
            <Text className="text-muted text-xs mt-1">
              Créez un lot depuis le bouton + pour le retrouver ici.
            </Text>
          </View>
        )}

        {filtered.map(lot => {
          const s = STATUT_MAP[lot.statut_actuel] ?? STATUT_MAP['archive'];
          const expired = new Date(lot.date_expiration) < new Date();
          return (
            <View
              key={lot.id}
              className={`bg-white rounded-xl p-4 mb-2 shadow-sm border ${expired ? 'border-pharma-orange/30' : 'border-transparent'}`}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-navy font-bold text-sm">{lot.nom_medicament}</Text>
                  <Text className="text-muted text-xs mt-1">{lot.numero_lot}  ·  {lot.dosage ?? '—'}  ·  {lot.quantite_initiale} unités</Text>
                </View>
                <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                  <Text className="text-xs font-bold" style={{ color: s.text }}>{s.label}</Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center pt-2 border-t border-bg">
                <Text className="text-xs text-muted">Exp : <Text className={expired ? 'text-pharma-orange font-bold' : 'text-text'}>{new Date(lot.date_expiration).toLocaleDateString('fr-FR')}</Text></Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="px-3 py-1.5 rounded-lg border border-blue-light"
                    onPress={() => router.push({ pathname: '/(fabricant)/[id]', params: { id: lot.id } })}
                  >
                    <Text className="text-blue text-xs font-semibold">Voir</Text>
                  </TouchableOpacity>
                  {lot.statut_actuel !== 'archive' && (
                    <TouchableOpacity
                      className="px-3 py-1.5 rounded-lg bg-navy"
                      onPress={() => router.push({ pathname: '/(fabricant)/nouveau-transfert', params: { lotId: lot.id } })}
                    >
                      <Text className="text-white text-xs font-semibold">Transférer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}
        <View className="h-8" />
      </ScrollView>

      {/* FAB */}
      <Link href="/(fabricant)/nouveau-lot" asChild>
        <TouchableOpacity className="absolute bottom-6 right-5 bg-navy w-14 h-14 rounded-full items-center justify-center shadow-lg">
          <Text className="text-white text-2xl font-bold">+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
