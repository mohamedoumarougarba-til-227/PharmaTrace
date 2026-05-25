import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';

export default function FabricantDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: recharger depuis Supabase
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

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
          <KPICard label="Total lots"   value="48" color="#2E6DA4" bg="#EEF4FB" />
          <KPICard label="En stock"     value="22" color="#27AE60" bg="#E8F8EC" />
          <KPICard label="En transit"   value="8"  color="#E67E22" bg="#FEF4E0" />
          <KPICard label="En pharmacie" value="18" color="#8E44AD" bg="#F5EEFF" />
        </View>

        {/* Action principale */}
        <Link href="/(fabricant)/nouveau-lot" asChild>
          <TouchableOpacity className="w-full h-14 bg-navy rounded-xl items-center justify-center mb-3 shadow-sm">
            <Text className="text-white font-bold text-base">+ Enregistrer un nouveau lot</Text>
          </TouchableOpacity>
        </Link>

        {/* Derniers lots */}
        <Text className="text-navy font-bold text-base mt-4 mb-3">Mes 5 derniers lots</Text>
        {LOT_DEMO.map(lot => (
          <TouchableOpacity
            key={lot.id}
            className="bg-white rounded-xl px-4 py-4 mb-2 shadow-sm flex-row justify-between items-center"
            onPress={() => {/* TODO: naviguer vers détail lot */}}
          >
            <View className="flex-1">
              <Text className="text-navy font-bold text-sm">{lot.nom}</Text>
              <Text className="text-muted text-xs mt-1">{lot.numero} · {lot.dosage}</Text>
            </View>
            <StatusBadge statut={lot.statut} />
          </TouchableOpacity>
        ))}

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

const LOT_DEMO = [
  { id: '1', nom: 'Amoxicilline 500mg',  numero: 'FAB-2026-048', dosage: '500mg', statut: 'en_pharmacie'       },
  { id: '2', nom: 'Paracétamol 1000mg',  numero: 'FAB-2026-047', dosage: '1g',    statut: 'en_transit'         },
  { id: '3', nom: 'Artéméther 20mg',     numero: 'FAB-2026-046', dosage: '20mg',  statut: 'en_stock_fabricant' },
  { id: '4', nom: 'Cotrimoxazole 480mg', numero: 'FAB-2026-045', dosage: '480mg', statut: 'en_pharmacie'       },
  { id: '5', nom: 'Ivermectine 6mg',     numero: 'FAB-2026-044', dosage: '6mg',   statut: 'en_stock_fabricant' },
];
