import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';

const NIVEAU_MAP: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  critique:      { label: 'CRITIQUE',      icon: 'circle-exclamation', bg: '#FDE8E8', text: '#C0392B', border: '#C0392B' },
  avertissement: { label: 'AVERTISSEMENT', icon: 'triangle-exclamation', bg: '#FEF4E0', text: '#E67E22', border: '#E67E22' },
  info:          { label: 'INFO',          icon: 'circle-info', bg: '#EEF4FB', text: '#2E6DA4', border: '#2E6DA4' },
};

export default function AlertesScreen() {
  const [alertes, setAlertes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlertes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alertes')
        .select('id, type_alerte, niveau, titre: description, description, ville_concernee, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAlertes(data ?? []);
    } catch (e) {
      console.error(e);
      setAlertes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadAlertes(); }, []));
  const onRefresh = async () => { setRefreshing(true); await loadAlertes(); };

  const handleTraiter = (id: string) => {
    Alert.alert('Alerte', 'Marquer cette alerte en cours de traitement ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: async () => {
        await supabase.from('alertes').update({ statut: 'en_cours_traitement' }).eq('id', id);
        Alert.alert('Succès', 'Alerte marquée en cours de traitement.');
        loadAlertes();
      } },
    ]);
  };

  if (loading) return (<View className="flex-1 items-center justify-center bg-bg"><ActivityIndicator color="#1A3A5C" size="large" /></View>);

  return (
    <ScrollView className="flex-1 bg-bg p-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text className="text-muted text-xs mb-3">{alertes.length} alertes · {alertes.filter(a => a.niveau === 'critique').length} critiques ouvertes</Text>
      {alertes.map(a => {
        const n = NIVEAU_MAP[a.niveau];
        return (
          <View key={a.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4" style={{ borderLeftColor: n.border }}>
            <View className="flex-row justify-between items-start mb-2">
              <View className="px-2 py-1 rounded-full self-start" style={{ backgroundColor: n.bg }}>
                <View className="flex-row items-center gap-1">
                  <FAIcon name={n.icon} size={10} color={n.text} family="FontAwesome6" />
                  <Text className="text-xs font-bold" style={{ color: n.text }}>{n.label}</Text>
                </View>
              </View>
              <Text className="text-muted text-xs">{new Date(a.created_at).toLocaleString('fr-FR')}</Text>
            </View>
            <Text className="text-navy font-bold text-sm mb-2">{a.type_alerte}</Text>
            <Text className="text-muted text-xs leading-relaxed mb-3">{a.description}</Text>
            <View className="flex-row justify-between items-center pt-2 border-t border-bg">
              <View className="flex-row items-center gap-1">
                <FAIcon name="map-pin" size={11} color="#999" family="FontAwesome6" />
                <Text className="text-xs text-muted">{a.ville_concernee}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleTraiter(a.id)}
                className="px-3 py-1.5 border border-blue-light rounded-lg"
              >
                <Text className="text-blue text-xs font-semibold">Traiter</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <View className="h-8" />
    </ScrollView>
  );
}
