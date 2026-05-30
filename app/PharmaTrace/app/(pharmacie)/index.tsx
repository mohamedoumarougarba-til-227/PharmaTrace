import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome6 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';

export default function PharmacieDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ transferts_attente: 0, lots_stock: 0, scans_today: 0, alertes: 0 });

  const loadKPIs = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // transferts en attente pour cette pharmacie
      const transfertsRes = await supabase
        .from('transferts')
        .select('id', { count: 'exact' })
        .eq('destinataire_id', session.user.id)
        .eq('statut', 'en_attente');

      // lots en stock pour cette pharmacie (transferts reçus)
      const lotsRes = await supabase
        .from('transferts')
        .select('lot_id', { count: 'exact' })
        .eq('destinataire_id', session.user.id)
        .eq('statut', 'receptionne');

      // scans aujourd'hui par ce pharmacien
      const scansRes = await supabase
        .from('historique_scans')
        .select('id', { count: 'exact' })
        .eq('scanneur_id', session.user.id)
        .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());

      // alertes ouvertes concernant la même ville du profil
      const profile = await supabase.from('utilisateurs').select('ville').eq('id', session.user.id).single();
      const ville = profile.data?.ville;
      const alertesRes = await supabase
        .from('alertes')
        .select('id', { count: 'exact' })
        .eq('statut', 'ouverte')
        .eq('ville_concernee', ville ?? undefined);

      setKpis({
        transferts_attente: transfertsRes.count ?? 0,
        lots_stock: lotsRes.count ?? 0,
        scans_today: scansRes.count ?? 0,
        alertes: alertesRes.count ?? 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadKPIs();
    }, []),
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#27AE60" size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg">
      {/* Header */}
      <View className="px-5 pt-6 pb-5 bg-pharma-green">
        <Text className="text-white/60 text-sm">Bienvenue,</Text>
        <Text className="text-white font-black text-xl mt-1">Pharmacie Centrale de Niamey</Text>
        <Text className="text-white/40 text-xs mt-1">Pharmacie agréée</Text>
      </View>

      <View className="p-5">
        {/* KPIs */}
        <View className="flex-row flex-wrap gap-3 mb-5">
          <KPICard label="Transferts en attente" value={String(kpis.transferts_attente)} color="#E67E22" bg="#FEF4E0" />
          <KPICard label="Lots en stock"          value={String(kpis.lots_stock)} color="#27AE60" bg="#E8F8EC" />
          <KPICard label="Scans aujourd'hui"      value={String(kpis.scans_today)} color="#2E6DA4" bg="#EEF4FB" />
          <KPICard label="Alertes actives"        value={String(kpis.alertes)}  color="#C0392B" bg="#FDE8E8" />
        </View>

        {/* Alerte transferts en attente */}
        <TouchableOpacity
          onPress={() => router.push('/(pharmacie)/transferts')}
          className="bg-pharma-orange/10 border-l-4 border-pharma-orange rounded-r-xl p-4 mb-5"
        >
          <View className="flex-row items-center gap-2 mb-1">
            <FAIcon name="bolt" size={16} color="#E67E22" family="FontAwesome6" />
            <Text className="text-pharma-orange font-bold text-sm">3 lots attendent votre réception</Text>
          </View>
          <Text className="text-muted text-xs mt-1">Appuyez pour voir les transferts entrants →</Text>
        </TouchableOpacity>

        {/* Actions rapides */}
        <Text className="text-navy font-bold text-base mb-3">Actions rapides</Text>
        <TouchableOpacity
          onPress={() => router.push('/(pharmacie)/verifier')}
          className="w-full h-14 bg-pharma-green rounded-xl items-center justify-center flex-row gap-2 mb-3"
        >
          <FAIcon name="magnifying-glass" size={16} color="#fff" family="FontAwesome6" />
          <Text className="text-white font-bold text-base">Vérifier un médicament</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(pharmacie)/stock')}
          className="w-full h-14 bg-white border border-blue-light rounded-xl items-center justify-center flex-row gap-2"
        >
          <FAIcon name="box" size={16} color="#1A3A5C" family="FontAwesome6" />
          <Text className="text-navy font-semibold text-base">Voir mon stock</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function KPICard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View className="flex-1 rounded-xl p-4 min-w-[44%]" style={{ backgroundColor: bg }}>
      <Text className="font-black text-3xl" style={{ color }}>{value}</Text>
      <Text className="text-muted text-xs mt-1">{label}</Text>
    </View>
  );
}
