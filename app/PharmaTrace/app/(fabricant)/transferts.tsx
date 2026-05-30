import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FAIcon } from '../../constants/icons';
import { supabase } from '../../lib/supabase';

const STATUT_MAP: Record<string, { label: string; bg: string; text: string }> = {
  en_attente:  { label: 'En attente',   bg: '#FEF4E0', text: '#E67E22' },
  receptionne: { label: 'Réceptionné',  bg: '#E8F8EC', text: '#27AE60' },
  refuse:      { label: 'Refusé',       bg: '#FDE8E8', text: '#C0392B' },
};

export default function TransfertsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transferts, setTransferts] = useState<any[]>([]);

  const loadTransferts = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTransferts([]);
        return;
      }

      const { data, error } = await supabase
        .from('transferts')
        .select('id, quantite_transferee, date_initiation, statut, lot_id(nom_medicament, numero_lot), destinataire_id(nom_entite)')
        .eq('expediteur_id', session.user.id)
        .order('date_initiation', { ascending: false });

      if (error) throw error;
      setTransferts(data ?? []);
    } catch (error) {
      console.error(error);
      setTransferts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTransferts();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransferts();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color="#1A3A5C" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bg p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3A5C" />}
    >
      <Text className="text-muted text-xs mb-3">{transferts.length} transfert(s)</Text>

      {transferts.length === 0 && (
        <View className="bg-white rounded-xl p-4 mb-3 border border-blue-light">
          <Text className="text-navy font-semibold">Aucun transfert pour l'instant</Text>
          <Text className="text-muted text-xs mt-1">Initiez un transfert depuis le détail d'un lot.</Text>
        </View>
      )}

      {transferts.map(t => {
        const s = STATUT_MAP[t.statut];
        return (
          <View key={t.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-navy font-bold text-sm">{t.lot_id?.nom_medicament ?? 'Lot'}</Text>
                <Text className="text-muted text-xs mt-1">{t.lot_id?.numero_lot ?? '—'}  ·  {t.quantite_transferee} unités</Text>
              </View>
              <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                <Text className="text-xs font-bold" style={{ color: s.text }}>{s.label}</Text>
              </View>
            </View>
            <View className="pt-2 border-t border-bg">
              <View className="flex-row items-center gap-1">
                <FAIcon name="arrow-right" size={11} color="#999" family="FontAwesome6" />
                <Text className="text-xs text-muted">{t.destinataire_id?.nom_entite ?? 'Pharmacie inconnue'}</Text>
              </View>
              <Text className="text-xs text-muted mt-1">Envoyé le {new Date(t.date_initiation).toLocaleDateString('fr-FR')}</Text>
            </View>
          </View>
        );
      })}
      <View className="h-8" />
    </ScrollView>
  );
}
