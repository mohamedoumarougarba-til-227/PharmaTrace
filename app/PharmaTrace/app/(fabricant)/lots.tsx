import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { useState } from 'react';

const LOTS_DEMO = [
  { id: '1', nom: 'Amoxicilline 500mg',  numero: 'FAB-2026-048', dosage: '500mg',   quantite: 2000, exp: '15/01/2028', statut: 'en_pharmacie'       },
  { id: '2', nom: 'Paracétamol 1000mg',  numero: 'FAB-2026-047', dosage: '1000mg',  quantite: 1500, exp: '20/03/2028', statut: 'en_transit'         },
  { id: '3', nom: 'Artéméther 20mg',     numero: 'FAB-2026-046', dosage: '20mg',    quantite: 3000, exp: '10/12/2027', statut: 'en_stock_fabricant' },
  { id: '4', nom: 'Ivermectine 6mg',     numero: 'FAB-2026-045', dosage: '6mg',     quantite: 5000, exp: '05/09/2027', statut: 'en_stock_fabricant' },
  { id: '5', nom: 'Cotrimoxazole 480mg', numero: 'FAB-2026-044', dosage: '480mg',   quantite: 800,  exp: '30/06/2026', statut: 'expire_bientot'    },
  { id: '6', nom: 'Chloroquine 250mg',   numero: 'FAB-2026-030', dosage: '250mg',   quantite: 0,    exp: '01/01/2025', statut: 'archive'            },
];

const STATUT_MAP: Record<string, { label: string; bg: string; text: string }> = {
  en_stock_fabricant: { label: 'En stock',       bg: '#EEF4FB', text: '#2E6DA4' },
  en_transit:         { label: 'En transit',     bg: '#FEF4E0', text: '#E67E22' },
  en_pharmacie:       { label: 'En pharmacie',   bg: '#E8F8EC', text: '#27AE60' },
  expire_bientot:     { label: 'Expire bientôt', bg: '#FEF4E0', text: '#E67E22' },
  archive:            { label: 'Archivé',        bg: '#F0F0F0', text: '#999'    },
};

export default function LotsScreen() {
  const [search, setSearch] = useState('');

  const filtered = LOTS_DEMO.filter(l =>
    l.nom.toLowerCase().includes(search.toLowerCase()) ||
    l.numero.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-bg">
      {/* Barre de recherche */}
      <View className="px-4 pt-4 pb-2 bg-white border-b border-blue-light">
        <TextInput
          className="bg-bg border border-blue-light rounded-lg h-10 px-4 text-sm text-text"
          placeholder="Rechercher par nom ou N° lot..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView className="flex-1 px-4 pt-3">
        <Text className="text-muted text-xs mb-3">{filtered.length} lot(s) trouvé(s)</Text>

        {filtered.map(lot => {
          const s = STATUT_MAP[lot.statut] ?? STATUT_MAP['archive'];
          const expired = lot.statut === 'expire_bientot';
          return (
            <View
              key={lot.id}
              className={`bg-white rounded-xl p-4 mb-2 shadow-sm border ${expired ? 'border-pharma-orange/30' : 'border-transparent'}`}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-navy font-bold text-sm">{lot.nom}</Text>
                  <Text className="text-muted text-xs mt-1">{lot.numero}  ·  {lot.dosage}  ·  {lot.quantite} unités</Text>
                </View>
                <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                  <Text className="text-xs font-bold" style={{ color: s.text }}>{s.label}</Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center pt-2 border-t border-bg">
                <Text className="text-xs text-muted">Exp : <Text className={expired ? 'text-pharma-orange font-bold' : 'text-text'}>{lot.exp}</Text></Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity className="px-3 py-1.5 rounded-lg border border-blue-light">
                    <Text className="text-blue text-xs font-semibold">Voir</Text>
                  </TouchableOpacity>
                  {lot.statut !== 'archive' && (
                    <TouchableOpacity className="px-3 py-1.5 rounded-lg bg-navy">
                      <Text className="text-white text-xs font-semibold">Transférer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}
        <View className="h-8" />
      </ScrollView>

      {/* FAB */}
      <Link href="/(fabricant)/nouveau-lot" asChild>
        <TouchableOpacity className="absolute bottom-6 right-5 bg-navy w-14 h-14 rounded-full items-center justify-center shadow-lg">
          <Text className="text-white text-2xl font-bold">+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
