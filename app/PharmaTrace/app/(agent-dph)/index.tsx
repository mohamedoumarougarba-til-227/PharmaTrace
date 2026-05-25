import { View, Text, ScrollView } from 'react-native';

export default function AgentDPHDashboard() {
  return (
    <ScrollView className="flex-1 bg-bg">
      <View className="px-5 pt-6 pb-5 bg-pharma-purple">
        <Text className="text-white/60 text-sm">Direction de la Pharmacie Nigérienne</Text>
        <Text className="text-white font-black text-xl mt-1">Surveillance nationale</Text>
        <Text className="text-white/40 text-xs mt-1">Niger · Temps réel</Text>
      </View>

      <View className="p-5">
        {/* KPIs */}
        <View className="flex-row flex-wrap gap-3 mb-5">
          <KPICard label="Lots enregistrés"   value="1 247" color="#2E6DA4" bg="#EEF4FB" />
          <KPICard label="Scans aujourd'hui"  value="89"    color="#27AE60" bg="#E8F8EC" />
          <KPICard label="Alertes critiques"  value="3"     color="#C0392B" bg="#FDE8E8" />
          <KPICard label="Lots suspects"      value="12"    color="#E67E22" bg="#FEF4E0" />
          <KPICard label="Pharmacies actives" value="47"    color="#8E44AD" bg="#F5EEFF" />
        </View>

        {/* Alerte critique */}
        <View className="bg-pharma-red/10 border-l-4 border-pharma-red rounded-r-xl p-4 mb-5">
          <Text className="text-pharma-red font-bold text-sm">🚨 3 alertes critiques ouvertes</Text>
          <Text className="text-muted text-xs mt-1">Nécessitent une attention immédiate →</Text>
        </View>

        {/* Stats simplifiées */}
        <Text className="text-navy font-bold text-base mb-3">Résultats de scan ce mois</Text>
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <StatRow label="✅ Authentiques" value="1 024" color="#27AE60" percent={78} />
          <StatRow label="❌ Non trouvés"  value="197"   color="#C0392B" percent={15} />
          <StatRow label="⚠️ Expirés"      value="92"    color="#E67E22" percent={7}  />
        </View>
      </View>
    </ScrollView>
  );
}

function KPICard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View className="flex-1 rounded-xl p-4 min-w-[44%]" style={{ backgroundColor: bg }}>
      <Text className="font-black text-2xl" style={{ color }}>{value}</Text>
      <Text className="text-muted text-xs mt-1">{label}</Text>
    </View>
  );
}

function StatRow({ label, value, color, percent }: { label: string; value: string; color: string; percent: number }) {
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-text text-sm font-semibold">{label}</Text>
        <Text className="text-muted text-sm">{value} ({percent}%)</Text>
      </View>
      <View className="h-2 bg-bg rounded-full overflow-hidden">
        <View className="h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}
