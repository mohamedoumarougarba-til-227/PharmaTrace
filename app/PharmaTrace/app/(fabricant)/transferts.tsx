import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

const TRANSFERTS_DEMO = [
  { id: '1', lot: 'Amoxicilline 500mg',  num: 'FAB-2026-048', dest: 'Pharmacie Centrale de Niamey',    qte: 500,  date: '21/05/2026', statut: 'receptionne' },
  { id: '2', lot: 'Paracétamol 1000mg',  num: 'FAB-2026-047', dest: 'Centre de Santé Yantala',         qte: 300,  date: '22/05/2026', statut: 'en_attente'  },
  { id: '3', lot: 'Artéméther 20mg',     num: 'FAB-2026-046', dest: 'Pharmacie du Marché Katako',      qte: 1000, date: '23/05/2026', statut: 'en_attente'  },
  { id: '4', lot: 'Ivermectine 6mg',     num: 'FAB-2026-041', dest: 'Hôpital National de Niamey',      qte: 200,  date: '10/05/2026', statut: 'refuse'      },
];

const STATUT_MAP: Record<string, { label: string; bg: string; text: string }> = {
  en_attente:  { label: 'En attente',   bg: '#FEF4E0', text: '#E67E22' },
  receptionne: { label: 'Réceptionné',  bg: '#E8F8EC', text: '#27AE60' },
  refuse:      { label: 'Refusé',       bg: '#FDE8E8', text: '#C0392B' },
};

export default function TransfertsScreen() {
  return (
    <ScrollView className="flex-1 bg-bg p-4">
      <Text className="text-muted text-xs mb-3">4 transferts</Text>
      {TRANSFERTS_DEMO.map(t => {
        const s = STATUT_MAP[t.statut];
        return (
          <View key={t.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-navy font-bold text-sm">{t.lot}</Text>
                <Text className="text-muted text-xs mt-1">{t.num}  ·  {t.qte} unités</Text>
              </View>
              <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                <Text className="text-xs font-bold" style={{ color: s.text }}>{s.label}</Text>
              </View>
            </View>
            <View className="pt-2 border-t border-bg">
              <Text className="text-xs text-muted">➜ {t.dest}</Text>
              <Text className="text-xs text-muted mt-1">Envoyé le {t.date}</Text>
            </View>
          </View>
        );
      })}
      <View className="h-8" />
    </ScrollView>
  );
}
