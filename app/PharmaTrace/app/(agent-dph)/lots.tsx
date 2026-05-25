import { View, Text, ScrollView, TextInput } from 'react-native';
import { useState } from 'react';

const LOTS = [
  { id: '1', fabricant: 'Labo Niger Pharma',   nom: 'Amoxicilline 500mg',  num: 'FAB-2026-048', statut: 'en_pharmacie',       localisation: 'Pharmacie Centrale' },
  { id: '2', fabricant: 'Labo Niger Pharma',   nom: 'Paracétamol 1000mg',  num: 'FAB-2026-047', statut: 'en_transit',         localisation: 'En transit'         },
  { id: '3', fabricant: 'MedImport Niger',     nom: 'Artéméther 20mg',     num: 'IMP-2026-012', statut: 'en_pharmacie',       localisation: 'Centre Santé Yantala'},
  { id: '4', fabricant: 'Labo Niger Pharma',   nom: 'Ivermectine 6mg',     num: 'FAB-2026-046', statut: 'en_stock_fabricant', localisation: 'Labo Niger Pharma'  },
  { id: '5', fabricant: 'PharmaCentre Niamey', nom: 'Cotrimoxazole 480mg', num: 'PCN-2026-003', statut: 'archive',            localisation: 'Archivé'            },
];

const STATUT_MAP: Record<string, { label: string; bg: string; text: string }> = {
  en_stock_fabricant: { label: 'En stock',     bg: '#EEF4FB', text: '#2E6DA4' },
  en_transit:         { label: 'En transit',   bg: '#FEF4E0', text: '#E67E22' },
  en_pharmacie:       { label: 'En pharmacie', bg: '#E8F8EC', text: '#27AE60' },
  archive:            { label: 'Archivé',      bg: '#F0F0F0', text: '#999'    },
};

export default function AgentLotsScreen() {
  const [search, setSearch] = useState('');
  const filtered = LOTS.filter(l =>
    l.nom.toLowerCase().includes(search.toLowerCase()) ||
    l.fabricant.toLowerCase().includes(search.toLowerCase()) ||
    l.num.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-bg">
      <View className="bg-pharma-purple/10 px-4 py-3 border-b border-blue-light">
        <Text className="text-pharma-purple text-xs font-semibold mb-2">👁 Lecture seule — Tous les fabricants</Text>
        <TextInput
          className="bg-white border border-blue-light rounded-lg h-10 px-4 text-sm"
          placeholder="Rechercher par fabricant, nom, N° lot..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView className="flex-1 px-4 pt-3">
        <Text className="text-muted text-xs mb-3">{filtered.length} lot(s)</Text>
        {filtered.map(lot => {
          const s = STATUT_MAP[lot.statut] ?? STATUT_MAP['archive'];
          return (
            <View key={lot.id} className="bg-white rounded-xl p-4 mb-2 shadow-sm">
              <View className="flex-row justify-between items-start mb-1">
                <Text className="text-navy font-bold text-sm flex-1 mr-2">{lot.nom}</Text>
                <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                  <Text className="text-xs font-bold" style={{ color: s.text }}>{s.label}</Text>
                </View>
              </View>
              <Text className="text-muted text-xs">{lot.num}</Text>
              <View className="flex-row justify-between mt-2 pt-2 border-t border-bg">
                <Text className="text-xs text-muted">🏭 {lot.fabricant}</Text>
                <Text className="text-xs text-muted">📍 {lot.localisation}</Text>
              </View>
            </View>
          );
        })}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
