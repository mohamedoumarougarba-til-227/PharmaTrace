import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function PharmacieDashboard() {
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
          <KPICard label="Transferts en attente" value="3" color="#E67E22" bg="#FEF4E0" />
          <KPICard label="Lots en stock"          value="27" color="#27AE60" bg="#E8F8EC" />
          <KPICard label="Scans aujourd'hui"      value="14" color="#2E6DA4" bg="#EEF4FB" />
          <KPICard label="Alertes actives"        value="1"  color="#C0392B" bg="#FDE8E8" />
        </View>

        {/* Alerte transferts en attente */}
        <TouchableOpacity
          onPress={() => router.push('/(pharmacie)/transferts')}
          className="bg-pharma-orange/10 border-l-4 border-pharma-orange rounded-r-xl p-4 mb-5"
        >
          <Text className="text-pharma-orange font-bold text-sm">⚡ 3 lots attendent votre réception</Text>
          <Text className="text-muted text-xs mt-1">Appuyez pour voir les transferts entrants →</Text>
        </TouchableOpacity>

        {/* Actions rapides */}
        <Text className="text-navy font-bold text-base mb-3">Actions rapides</Text>
        <TouchableOpacity
          onPress={() => router.push('/(pharmacie)/verifier')}
          className="w-full h-14 bg-pharma-green rounded-xl items-center justify-center mb-3"
        >
          <Text className="text-white font-bold text-base">🔍 Vérifier un médicament</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(pharmacie)/stock')}
          className="w-full h-14 bg-white border border-blue-light rounded-xl items-center justify-center"
        >
          <Text className="text-navy font-semibold text-base">📦 Voir mon stock</Text>
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
