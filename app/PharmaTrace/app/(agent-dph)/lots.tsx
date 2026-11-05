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
        .from('business_lots')
        .select(`
          id, 
          numero_lot, 
          nom_medicament, 
          date_expiration, 
          statut_actuel, 
          quantite_initiale,
          quantite_actuelle,
          pays_origine,
          fabricant_nom, 
          fabricant_ville,
          created_at,
          transferts (
            statut,
            quantite_transferee,
            destinataire:utilisateurs!destinataire_id (nom_entite, ville, pays)
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

  // Filtrer par onglet de statut (basé sur la localisation réelle des unités du lot)
  const statusFiltered = lots.filter(l => {
    if (filterStatut === 'tous') return true;
    if (filterStatut === 'en_stock_fabricant') {
      return (l.quantite_actuelle > 0 || l.statut_actuel === 'en_stock_fabricant');
    }
    if (filterStatut === 'en_transit') {
      return l.transferts?.some((t: any) => t.statut === 'en_attente');
    }
    if (filterStatut === 'en_pharmacie') {
      return l.transferts?.some((t: any) => t.statut === 'receptionne');
    }
    return true;
  });

  // Filtrer par barre de recherche (recherche par médicament, fabricant, pharmacie, ville ou pays)
  const filtered = statusFiltered.filter(l => {
    const s = search.toLowerCase();
    
    // Vérifier s'il y a correspondance dans les transferts liés au lot
    const transferMatch = l.transferts?.some((t: any) => 
      t.destinataire?.nom_entite?.toLowerCase().includes(s) ||
      t.destinataire?.ville?.toLowerCase().includes(s) ||
      t.destinataire?.pays?.toLowerCase().includes(s)
    );

    return (
      l.nom_medicament.toLowerCase().includes(s) ||
      l.numero_lot?.toLowerCase().includes(s) ||
      l.fabricant_nom?.toLowerCase().includes(s) ||
      l.fabricant_ville?.toLowerCase().includes(s) ||
      l.pays_origine?.toLowerCase().includes(s) ||
      transferMatch
    );
  });

  if (loading) return (<View className="flex-1 items-center justify-center bg-bg"><ActivityIndicator color="#1A3A5C" size="large" /></View>);

  return (
    <View className="flex-1 bg-bg">
      {/* Barre de recherche multi-critères */}
      <View className="bg-white px-4 pt-3 pb-2 border-b border-[#E6EEF8]">
        <TextInput
          className="bg-bg border border-[#E6EEF8] rounded-xl h-10 px-4 text-sm text-navy"
          placeholder="Médicament, Ville, Pays, Fabricant, Pharmacie..."
          placeholderTextColor="#BACAD6"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Onglets de filtrage par état de distribution */}
      <View className="bg-white border-b border-[#E6EEF8] px-4 py-2.5 flex-row gap-2">
        {[
          { key: 'tous', label: 'Tous' },
          { key: 'en_stock_fabricant', label: 'Chez Fabricants' },
          { key: 'en_transit', label: 'En Transit' },
          { key: 'en_pharmacie', label: 'En Pharmacies' }
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

      {/* Liste des lots surveillés */}
      <ScrollView className="flex-1 px-4 pt-3" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text className="text-muted text-xs mb-3">{filtered.length} lot(s) trouvé(s)</Text>
        
        {filtered.map(lot => {
          const expired = lot.date_expiration ? new Date(lot.date_expiration) < new Date() : false;

          // Distribution des unités du lot
          const qtyAtFabricant = lot.quantite_actuelle ?? 0;
          const transitTransfers = lot.transferts?.filter((t: any) => t.statut === 'en_attente') || [];
          const receivedTransfers = lot.transferts?.filter((t: any) => t.statut === 'receptionne') || [];

          return (
            <View key={lot.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-[#E6EEF8]">
              {/* En-tête : Médicament + Pays d'origine */}
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-navy font-bold text-base">{lot.nom_medicament}</Text>
                  <Text className="text-muted text-xs font-mono mt-0.5">N° LOT : {lot.numero_lot}</Text>
                </View>
                <View className="bg-pharma-purple/10 px-2 py-0.5 rounded-full">
                  <Text className="text-[9px] font-extrabold text-pharma-purple">{lot.pays_origine?.toUpperCase()}</Text>
                </View>
              </View>

              {/* Origine du Fabricant */}
              <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-bg">
                <View className="w-5 items-center">
                  <FAIcon name="industry" size={11} color="#9AA9B8" family="FontAwesome6" />
                </View>
                <Text className="text-xs text-muted">
                  Fabricant : <Text className="font-semibold text-navy">{lot.fabricant_nom}</Text> ({lot.fabricant_ville})
                </Text>
              </View>

              {/* SECTION LOCALISATION DYNAMIQUE DES UNITÉS */}
              
              {/* 1. Unités chez le fabricant */}
              {qtyAtFabricant > 0 && (
                <View className="flex-row items-center gap-2 mt-1.5">
                  <View className="w-5 items-center">
                    <FAIcon name="boxes-stacked" size={11} color="#2E6DA4" family="FontAwesome6" />
                  </View>
                  <Text className="text-xs text-muted">
                    Stock usine : <Text className="font-semibold text-blue">{qtyAtFabricant.toLocaleString('fr-FR')}</Text> unités
                  </Text>
                </View>
              )}

              {/* 2. Unités en transit */}
              {transitTransfers.map((t: any, idx: number) => (
                <View key={`transit-${idx}`} className="flex-row items-center gap-2 mt-1.5">
                  <View className="w-5 items-center">
                    <FAIcon name="truck-ramp-box" size={11} color="#E67E22" family="FontAwesome6" />
                  </View>
                  <Text className="text-xs text-muted">
                    En transit : <Text className="font-semibold text-pharma-orange">{t.quantite_transferee.toLocaleString('fr-FR')}</Text> unités vers <Text className="font-semibold text-navy">{t.destinataire?.nom_entite}</Text> ({t.destinataire?.ville})
                  </Text>
                </View>
              ))}

              {/* 3. Unités en pharmacie */}
              {receivedTransfers.map((t: any, idx: number) => (
                <View key={`received-${idx}`} className="flex-row items-center gap-2 mt-1.5">
                  <View className="w-5 items-center">
                    <FAIcon name="house-medical" size={11} color="#27AE60" family="FontAwesome6" />
                  </View>
                  <Text className="text-xs text-muted">
                    En pharmacie : <Text className="font-semibold text-green-600">{t.quantite_transferee.toLocaleString('fr-FR')}</Text> unités chez <Text className="font-semibold text-navy">{t.destinataire?.nom_entite}</Text> ({t.destinataire?.ville})
                  </Text>
                </View>
              ))}

              {/* Date d'expiration et Alerte de péremption */}
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
            <Text className="text-muted text-xs mt-1">Aucune correspondance ou filtre trop restrictif.</Text>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
