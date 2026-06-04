import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';

const STATUT_MAP: Record<string, { label: string; bg: string; text: string }> = {
  en_stock_fabricant: { label: 'Chez le fabricant', bg: '#EEF4FB', text: '#2E6DA4' },
  en_transit:         { label: 'En transit',        bg: '#FEF4E0', text: '#E67E22' },
  en_pharmacie:       { label: 'En pharmacie',      bg: '#E8F8EC', text: '#27AE60' },
  archive:            { label: 'Archivé',           bg: '#F0F0F0', text: '#999'    },
};

export default function AgentLotsScreen() {
  const [search, setSearch] = useState('');
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string>('tous');

  const loadLots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lots_avec_fabricant')
        .select(`
          id, 
          numero_lot, 
          nom_medicament, 
          date_expiration, 
          statut_actuel, 
          fabricant_nom, 
          fabricant_ville,
          created_at,
          transferts (
            statut,
            destinataire:utilisateurs!destinataire_id (nom_entite, ville)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLots(data ?? []);
    } catch (e) {
      console.error(e);
      setLots([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadLots(); }, []));

  const onRefresh = async () => { setRefreshing(true); await loadLots(); };

  // Filtrer par onglet de statut
  const statusFiltered = lots.filter(l => {
    if (filterStatut === 'tous') return true;
    return l.statut_actuel === filterStatut;
  });

  // Filtrer par barre de recherche
  const filtered = statusFiltered.filter(l => {
    const s = search.toLowerCase();
    
    // Trouver le nom de la pharmacie dans les transferts
    let rxPharmacieNom = '';
    const activeTransfer = l.transferts?.find((t: any) => 
      l.statut_actuel === 'en_pharmacie' ? t.statut === 'receptionne' : t.statut === 'en_attente'
    );
    if (activeTransfer && activeTransfer.destinataire) {
      rxPharmacieNom = activeTransfer.destinataire.nom_entite;
    }

    return (
      l.nom_medicament.toLowerCase().includes(s) ||
      l.fabricant_nom?.toLowerCase().includes(s) ||
      l.numero_lot?.toLowerCase().includes(s) ||
      rxPharmacieNom.toLowerCase().includes(s)
    );
  });

  if (loading) return (<View className="flex-1 items-center justify-center bg-bg"><ActivityIndicator color="#1A3A5C" size="large" /></View>);

  return (
    <View className="flex-1 bg-bg">
      {/* Barre de recherche */}
      <View className="bg-white px-4 pt-3 pb-2 border-b border-[#E6EEF8]">
        <TextInput
          className="bg-bg border border-[#E6EEF8] rounded-xl h-10 px-4 text-sm text-navy"
          placeholder="Rechercher par fabricant, pharmacie, lot..."
          placeholderTextColor="#BACAD6"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Onglets de filtrage */}
      <View className="bg-white border-b border-[#E6EEF8] px-4 py-2.5 flex-row gap-2">
        {[
          { key: 'tous', label: 'Tous' },
          { key: 'en_stock_fabricant', label: 'Fabricants' },
          { key: 'en_transit', label: 'Transit' },
          { key: 'en_pharmacie', label: 'Pharmacies' }
        ].map(item => {
          const isActive = filterStatut === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilterStatut(item.key)}
              className={`px-3 py-1.5 rounded-full border ${isActive ? 'bg-navy border-navy' : 'bg-white border-[#E6EEF8]'}`}
            >
              <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-muted'}`}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Liste des lots */}
      <ScrollView className="flex-1 px-4 pt-3" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text className="text-muted text-xs mb-3">{filtered.length} lot(s) trouvé(s)</Text>
        
        {filtered.map(lot => {
          const s = STATUT_MAP[lot.statut_actuel] ?? STATUT_MAP['archive'];
          const expired = lot.date_expiration ? new Date(lot.date_expiration) < new Date() : false;

          // Détecter la pharmacie destinataire
          let destPharmacieNom = '';
          let destPharmacieVille = '';
          if (lot.statut_actuel === 'en_pharmacie' || lot.statut_actuel === 'en_transit') {
            const tx = lot.transferts?.find((t: any) => 
              lot.statut_actuel === 'en_pharmacie' ? t.statut === 'receptionne' : t.statut === 'en_attente'
            );
            if (tx && tx.destinataire) {
              destPharmacieNom = tx.destinataire.nom_entite;
              destPharmacieVille = tx.destinataire.ville;
            }
          }

          return (
            <View key={lot.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-[#E6EEF8]">
              {/* En-tête : Nom + Statut */}
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-navy font-bold text-base">{lot.nom_medicament}</Text>
                  <Text className="text-muted text-xs font-mono mt-0.5">N° LOT : {lot.numero_lot}</Text>
                </View>
                <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                  <Text className="text-[10px] font-extrabold" style={{ color: s.text }}>{s.label.toUpperCase()}</Text>
                </View>
              </View>

              {/* Ligne Fabricant d'origine */}
              <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-bg">
                <View className="w-5 items-center">
                  <FAIcon name="industry" size={11} color="#9AA9B8" family="FontAwesome6" />
                </View>
                <Text className="text-xs text-muted">
                  Fabricant d'origine : <Text className="font-semibold text-navy">{lot.fabricant_nom}</Text> ({lot.fabricant_ville})
                </Text>
              </View>

              {/* Ligne Localisation / Pharmacie Actuelle */}
              {lot.statut_actuel === 'en_pharmacie' && destPharmacieNom ? (
                <View className="flex-row items-center gap-2 mt-1.5">
                  <View className="w-5 items-center">
                    <FAIcon name="house-medical" size={11} color="#27AE60" family="FontAwesome6" />
                  </View>
                  <Text className="text-xs text-muted">
                    Pharmacie détentrice : <Text className="font-semibold text-green-600">{destPharmacieNom}</Text> ({destPharmacieVille})
                  </Text>
                </View>
              ) : lot.statut_actuel === 'en_transit' && destPharmacieNom ? (
                <View className="flex-row items-center gap-2 mt-1.5">
                  <View className="w-5 items-center">
                    <FAIcon name="truck-ramp-box" size={11} color="#E67E22" family="FontAwesome6" />
                  </View>
                  <Text className="text-xs text-muted">
                    En transit vers : <Text className="font-semibold text-pharma-orange">{destPharmacieNom}</Text> ({destPharmacieVille})
                  </Text>
                </View>
              ) : lot.statut_actuel === 'en_stock_fabricant' ? (
                <View className="flex-row items-center gap-2 mt-1.5">
                  <View className="w-5 items-center">
                    <FAIcon name="boxes-stacked" size={11} color="#2E6DA4" family="FontAwesome6" />
                  </View>
                  <Text className="text-xs text-muted">
                    Localisation : <Text className="font-semibold text-blue">{lot.fabricant_nom}</Text> (En stock usine)
                  </Text>
                </View>
              ) : null}

              {/* Date d'expiration */}
              <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-bg">
                <View className="flex-row items-center gap-1.5">
                  <FAIcon name="calendar-days" size={11} color="#9AA9B8" family="FontAwesome6" />
                  <Text className="text-[10px] text-muted">
                    Expire le : {new Date(lot.date_expiration).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                {expired && (
                  <View className="bg-red-50 px-2 py-0.5 rounded">
                    <Text className="text-pharma-red font-bold text-[9px]">EXPIRÉ</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View className="items-center justify-center py-12">
            <FAIcon name="cubes" size={48} color="#BACAD6" family="FontAwesome6" />
            <Text className="text-navy font-bold mt-3">Aucun lot trouvé</Text>
            <Text className="text-muted text-xs mt-1">Essayez d'autres mots-clés ou filtrez autrement.</Text>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
