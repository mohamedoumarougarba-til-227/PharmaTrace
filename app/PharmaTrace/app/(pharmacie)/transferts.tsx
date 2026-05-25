import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';

const TRANSFERTS = [
  { id: '1', lot: 'Amoxicilline 500mg',       num: 'FAB-2026-048', expediteur: 'Labo Niger Pharma', qte: 500,  since: 'Il y a 2 jours' },
  { id: '2', lot: 'Paracétamol 1000mg',        num: 'FAB-2026-047', expediteur: 'Labo Niger Pharma', qte: 300,  since: 'Il y a 1 jour'  },
  { id: '3', lot: 'Artéméther / Luméfantrine', num: 'FAB-2026-046', expediteur: 'Labo Niger Pharma', qte: 1000, since: 'Aujourd\'hui'   },
];

export default function TransfertsEntrantsScreen() {
  const handleReception = (id: string, lot: string) => {
    Alert.alert(
      'Réceptionner le lot',
      `Confirmez-vous la réception de "${lot}" ?\n\nAssurez-vous de scanner le QR code du lot reçu.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Scanner & Confirmer', onPress: () => {
          // TODO: ouvrir scanner QR pour confirmer la réception
          Alert.alert('✅ Réceptionné', `Le lot ${lot} a été réceptionné avec succès.`);
        }},
      ]
    );
  };

  const handleRefus = (id: string, lot: string) => {
    Alert.alert('Refuser le lot', `Voulez-vous refuser "${lot}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Refuser', style: 'destructive', onPress: () => Alert.alert('Lot refusé', 'Un signalement a été envoyé.') },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-bg p-4">
      <View className="bg-pharma-orange/10 border-l-4 border-pharma-orange rounded-r-xl p-3 mb-4">
        <Text className="text-pharma-orange font-bold text-sm">⚡ {TRANSFERTS.length} lots en attente de réception</Text>
      </View>

      {TRANSFERTS.map(t => (
        <View key={t.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4 border-pharma-orange">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-2">
              <View className="bg-pharma-orange/10 self-start px-2 py-0.5 rounded-full mb-2">
                <Text className="text-pharma-orange text-xs font-bold uppercase">EN ATTENTE</Text>
              </View>
              <Text className="text-navy font-bold text-base">{t.lot}</Text>
              <Text className="text-muted text-xs mt-1">{t.qte} unités · {t.num}</Text>
            </View>
            <Text className="text-muted text-xs">{t.since}</Text>
          </View>
          <Text className="text-muted text-xs mb-3">🏭 De : {t.expediteur}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => handleRefus(t.id, t.lot)}
              className="flex-1 h-10 border border-pharma-red rounded-lg items-center justify-center"
            >
              <Text className="text-pharma-red font-semibold text-sm">Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleReception(t.id, t.lot)}
              className="flex-2 h-10 bg-pharma-green rounded-lg items-center justify-center px-5"
            >
              <Text className="text-white font-bold text-sm">✓ Réceptionner</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <View className="h-8" />
    </ScrollView>
  );
}
