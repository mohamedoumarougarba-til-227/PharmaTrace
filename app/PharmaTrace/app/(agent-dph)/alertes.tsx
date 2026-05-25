import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';

const ALERTES = [
  { id: '1', type: 'lot_inconnu',    niveau: 'critique',      titre: 'Lot inconnu détecté',                     desc: 'Un QR code inconnu scanné 5 fois en 3h depuis Zinder. Hash absent du registre.',   ville: 'Zinder',  since: 'Il y a 2h'  },
  { id: '2', type: 'qr_duplique',    niveau: 'critique',      titre: 'QR ne correspond pas au transfert',       desc: 'Pharmacie Katako : lot reçu dont le hash ne correspond pas au transfert FAB-2026-039.', ville: 'Niamey',  since: 'Il y a 5h'  },
  { id: '3', type: 'lot_expire',     niveau: 'avertissement', titre: 'Lot expiré encore en circulation',        desc: 'Lot FAB-2026-012 (Chloroquine 250mg, exp. 01/03/2025) scanné 3× cette semaine.',  ville: 'Maradi',  since: 'Hier'       },
  { id: '4', type: 'scan_suspect',   niveau: 'info',          titre: 'Pic d\'activité de scan',                 desc: '89 scans en une journée — record mensuel. Zone : Niamey, activité normale.',       ville: 'Niamey',  since: 'Aujourd\'hui'},
];

const NIVEAU_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critique:      { label: '🔴 CRITIQUE',      bg: '#FDE8E8', text: '#C0392B', border: '#C0392B' },
  avertissement: { label: '🟠 AVERTISSEMENT', bg: '#FEF4E0', text: '#E67E22', border: '#E67E22' },
  info:          { label: '🔵 INFO',          bg: '#EEF4FB', text: '#2E6DA4', border: '#2E6DA4' },
};

export default function AlertesScreen() {
  const handleTraiter = (id: string) => {
    Alert.alert('Alerte', 'Marquer cette alerte en cours de traitement ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => Alert.alert('✅', 'Alerte marquée en cours de traitement.') },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-bg p-4">
      <Text className="text-muted text-xs mb-3">4 alertes · 2 critiques ouvertes</Text>
      {ALERTES.map(a => {
        const n = NIVEAU_MAP[a.niveau];
        return (
          <View key={a.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4" style={{ borderLeftColor: n.border }}>
            <View className="flex-row justify-between items-start mb-2">
              <View className="px-2 py-1 rounded-full self-start" style={{ backgroundColor: n.bg }}>
                <Text className="text-xs font-bold" style={{ color: n.text }}>{n.label}</Text>
              </View>
              <Text className="text-muted text-xs">{a.since}</Text>
            </View>
            <Text className="text-navy font-bold text-sm mb-2">{a.titre}</Text>
            <Text className="text-muted text-xs leading-relaxed mb-3">{a.desc}</Text>
            <View className="flex-row justify-between items-center pt-2 border-t border-bg">
              <Text className="text-xs text-muted">📍 {a.ville}</Text>
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
