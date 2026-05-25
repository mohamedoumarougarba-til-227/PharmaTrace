import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';

const STOCK = [
  { id: '1', nom: 'Amoxicilline 500mg',  num: 'FAB-2026-048', dosage: '500mg',  qte: 500, exp: '15/01/2028', alerte: false },
  { id: '2', nom: 'Paracétamol 1000mg',  num: 'FAB-2026-047', dosage: '1000mg', qte: 300, exp: '20/03/2028', alerte: false },
  { id: '3', nom: 'Artéméther 20mg',     num: 'FAB-2026-046', dosage: '20mg',   qte: 1000,exp: '10/12/2027', alerte: false },
  { id: '4', nom: 'Cotrimoxazole 480mg', num: 'FAB-2026-030', dosage: '480mg',  qte: 45,  exp: '15/06/2026', alerte: true  },
  { id: '5', nom: 'Chloroquine 250mg',   num: 'FAB-2026-028', dosage: '250mg',  qte: 20,  exp: '01/07/2026', alerte: true  },
];

export default function StockScreen() {
  const [search, setSearch] = useState('');
  const filtered = STOCK.filter(s =>
    s.nom.toLowerCase().includes(search.toLowerCase()) ||
    s.num.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-bg">
      <View className="px-4 pt-4 pb-2 bg-white border-b border-blue-light">
        <View className="flex-row justify-between mb-3">
          <Text className="text-navy font-bold text-base">{STOCK.length} lots en stock</Text>
          <Text className="text-pharma-orange font-semibold text-sm">⚠ 2 expirent bientôt</Text>
        </View>
        <TextInput
          className="bg-bg border border-blue-light rounded-lg h-10 px-4 text-sm"
          placeholder="Rechercher..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView className="flex-1 px-4 pt-3">
        {filtered.map(lot => (
          <View
            key={lot.id}
            className={`bg-white rounded-xl p-4 mb-2 shadow-sm border-l-4 ${lot.alerte ? 'border-pharma-orange' : 'border-pharma-green'}`}
            style={{ backgroundColor: lot.alerte ? '#FFFBF5' : '#fff' }}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-2">
                <Text className="text-navy font-bold text-sm">{lot.nom}</Text>
                <Text className="text-muted text-xs mt-1">{lot.num}  ·  {lot.dosage}</Text>
              </View>
              {lot.alerte && (
                <View className="bg-pharma-orange/10 px-2 py-1 rounded-full">
                  <Text className="text-pharma-orange text-xs font-bold">⚠ Bientôt</Text>
                </View>
              )}
            </View>
            <View className="flex-row justify-between items-center pt-2 border-t border-bg">
              <Text className="text-xs text-muted">{lot.qte} unités · Exp : <Text className={lot.alerte ? 'text-pharma-orange font-bold' : 'text-text'}>{lot.exp}</Text></Text>
              <View className="flex-row gap-2">
                <TouchableOpacity className="px-3 py-1.5 border border-blue-light rounded-lg">
                  <Text className="text-blue text-xs font-semibold">🔍 Vérifier</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
