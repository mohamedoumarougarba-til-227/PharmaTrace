import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

type LotSummary = {
  id: string;
  nom_medicament: string;
  numero_lot: string;
  dosage: string | null;
  statut_actuel: string;
};

export default function FabricantDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ total: 0, stock: 0, transit: 0, pharmacie: 0 });
  const [lots, setLots] = useState<LotSummary[]>([]);

  const loadDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLots([]);
        setKpis({ total: 0, stock: 0, transit: 0, pharmacie: 0 });
        return;
      }

      const [lotsRes, stockRes, transitRes, pharmacieRes] = await Promise.all([
        supabase.from('lots_medicaments').select('id, nom_medicament, numero_lot, dosage, statut_actuel').eq('fabricant_id', session.user.id).eq('is_archived', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('lots_medicaments').select('id', { count: 'exact', head: true }).eq('fabricant_id', session.user.id).eq('statut_actuel', 'en_stock_fabricant').eq('is_archived', false),
        supabase.from('lots_medicaments').select('id', { count: 'exact', head: true }).eq('fabricant_id', session.user.id).eq('statut_actuel', 'en_transit').eq('is_archived', false),
        supabase.from('lots_medicaments').select('id', { count: 'exact', head: true }).eq('fabricant_id', session.user.id).eq('statut_actuel', 'en_pharmacie').eq('is_archived', false),
      ]);

      setLots((lotsRes.data ?? []) as LotSummary[]);
      setKpis({
        total: (stockRes.count ?? 0) + (transitRes.count ?? 0) + (pharmacieRes.count ?? 0),
        stock: stockRes.count ?? 0,
        transit: transitRes.count ?? 0,
        pharmacie: pharmacieRes.count ?? 0,
      });
    } catch (error) {
      console.error(error);
      setLots([]);
      setKpis({ total: 0, stock: 0, transit: 0, pharmacie: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#1A3A5C" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3A5C" />}
    >
      {/* Header coloré */}
      <View className="px-5 pt-6 pb-5 bg-navy">
        <Text className="text-white/60 text-sm">Bienvenue,</Text>
        <Text className="text-white font-black text-xl mt-1">Laboratoire Niger Pharma</Text>
        <Text className="text-white/40 text-xs mt-1">Fabricant agréé · Niamey</Text>
      </View>

      <View className="p-5">
        {/* KPI Cards */}
        <Text className="text-navy font-bold text-base mb-3">Vue d'ensemble</Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          <KPICard label="Total lots"   value={String(kpis.total)} color="#2E6DA4" bg="#EEF4FB" />
          <KPICard label="En stock"     value={String(kpis.stock)} color="#27AE60" bg="#E8F8EC" />
          <KPICard label="En transit"   value={String(kpis.transit)} color="#E67E22" bg="#FEF4E0" />
          <KPICard label="En pharmacie" value={String(kpis.pharmacie)} color="#8E44AD" bg="#F5EEFF" />
        </View>

        {/* Action principale */}
        <Link href="/(fabricant)/nouveau-lot" asChild>
          <TouchableOpacity className="w-full h-14 bg-navy rounded-xl items-center justify-center mb-3 shadow-sm">
            <Text className="text-white font-bold text-base">+ Enregistrer un nouveau lot</Text>
          </TouchableOpacity>
        </Link>

        {/* Derniers lots */}
        <Text className="text-navy font-bold text-base mt-4 mb-3">Mes 5 derniers lots</Text>
        {lots.map(lot => (
          <TouchableOpacity
            key={lot.id}
            className="bg-white rounded-xl px-4 py-4 mb-2 shadow-sm flex-row justify-between items-center"
            onPress={() => router.push({ pathname: '/(fabricant)/[id]', params: { id: lot.id } })}
          >
            <View className="flex-1">
              <Text className="text-navy font-bold text-sm">{lot.nom_medicament}</Text>
              <Text className="text-muted text-xs mt-1">{lot.numero_lot} · {lot.dosage ?? '—'}</Text>
            </View>
            <StatusBadge statut={lot.statut_actuel} />
          </TouchableOpacity>
        ))}

        {lots.length === 0 && (
          <View className="bg-white rounded-xl p-4 mb-2 border border-blue-light">
            <Text className="text-navy font-semibold text-sm">Aucun lot pour le moment</Text>
            <Text className="text-muted text-xs mt-1">Créez votre premier lot pour le voir apparaître ici.</Text>
          </View>
        )}

        <Link href="/(fabricant)/lots" asChild>
          <TouchableOpacity className="mt-2 items-center py-3">
            <Text className="text-blue text-sm font-semibold">Voir tous mes lots →</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

// ─── Composants locaux ────────────────────────────────────────────────────────

function KPICard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View className="flex-1 rounded-xl p-4 min-w-[44%]" style={{ backgroundColor: bg }}>
      <Text className="font-black text-3xl" style={{ color }}>{value}</Text>
      <Text className="text-muted text-xs mt-1">{label}</Text>
    </View>
  );
}

function StatusBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    en_stock_fabricant: { label: 'En stock',     bg: '#EEF4FB', text: '#2E6DA4' },
    en_transit:         { label: 'En transit',   bg: '#FEF4E0', text: '#E67E22' },
    en_pharmacie:       { label: 'En pharmacie', bg: '#E8F8EC', text: '#27AE60' },
    archive:            { label: 'Archivé',      bg: '#F0F0F0', text: '#999' },
  };
  const s = map[statut] ?? map['archive'];
  return (
    <View className="px-3 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
      <Text className="text-xs font-bold uppercase" style={{ color: s.text }}>{s.label}</Text>
    </View>
  );
}

