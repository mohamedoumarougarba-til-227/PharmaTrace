import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import ConfirmModal from '../../components/ConfirmModal';

const NIVEAU_MAP: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  critique:      { label: 'CRITIQUE',      icon: 'circle-exclamation', bg: '#FDE8E8', text: '#C0392B', border: '#C0392B' },
  avertissement: { label: 'AVERTISSEMENT', icon: 'triangle-exclamation', bg: '#FEF4E0', text: '#E67E22', border: '#E67E22' },
  info:          { label: 'INFO',          icon: 'circle-info', bg: '#EEF4FB', text: '#2E6DA4', border: '#2E6DA4' },
};

const STATUT_MAP: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  ouverte:             { label: 'Nouvelle', bg: '#EAECEE', text: '#5D6D7E', icon: 'clock' },
  en_cours_traitement: { label: 'En cours', bg: '#FEF9E7', text: '#F39C12', icon: 'spinner' },
  resolue:             { label: 'Résolue',  bg: '#E8F8EC', text: '#27AE60', icon: 'circle-check' },
  archive:             { label: 'Archivée', bg: '#EAEDED', text: '#7F8C8D', icon: 'box-archive' },
};

export default function AlertesScreen() {
  const [alertes, setAlertes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string>('toutes');
  const [pendingAction, setPendingAction] = useState<{ id: string; type: 'prendre_en_charge' | 'resoudre' } | null>(null);

  const loadAlertes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alertes')
        .select('id, type_alerte, niveau, description, ville_concernee, created_at, statut')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAlertes(data ?? []);
    } catch (e) {
      console.error(e);
      setAlertes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadAlertes(); }, []));
  const onRefresh = async () => { setRefreshing(true); await loadAlertes(); };

  const handleAction = (id: string, currentStatut: string) => {
    if (currentStatut === 'ouverte') {
      setPendingAction({ id, type: 'prendre_en_charge' });
    } else if (currentStatut === 'en_cours_traitement') {
      setPendingAction({ id, type: 'resoudre' });
    }
  };

  const executePrendreEnCharge = async () => {
    if (!pendingAction) return;
    try {
      const { error } = await supabase
        .from('alertes')
        .update({ statut: 'en_cours_traitement' })
        .eq('id', pendingAction.id);
      if (error) throw error;
      setPendingAction(null);
      loadAlertes();
    } catch (err) {
      console.error(err);
      if (Platform.OS === 'web') {
        window.alert("Erreur : Impossible de mettre à jour l'alerte.");
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour l\'alerte.');
      }
    }
  };

  const executeResoudre = async () => {
    if (!pendingAction) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('alertes')
        .update({ 
          statut: 'resolue',
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', pendingAction.id);
      if (error) throw error;
      setPendingAction(null);
      loadAlertes();
    } catch (err) {
      console.error(err);
      if (Platform.OS === 'web') {
        window.alert("Erreur : Impossible de résoudre l'alerte.");
      } else {
        Alert.alert('Erreur', 'Impossible de résoudre l\'alerte.');
      }
    }
  };

  if (loading) return (<View className="flex-1 items-center justify-center bg-bg"><ActivityIndicator color="#1A3A5C" size="large" /></View>);

  const filteredAlertes = alertes.filter(a => {
    if (filterStatut === 'toutes') return true;
    return a.statut === filterStatut;
  });

  return (
    <View className="flex-1 bg-bg">
      {/* Filtres par statut */}
      <View className="bg-white border-b border-bg px-4 py-3 flex-row gap-2">
        {[
          { key: 'toutes', label: 'Toutes' },
          { key: 'ouverte', label: 'Nouvelles' },
          { key: 'en_cours_traitement', label: 'En cours' },
          { key: 'resolue', label: 'Résolues' }
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

      <ScrollView className="flex-1 p-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text className="text-muted text-xs mb-3">
          {filteredAlertes.length} alertes affichées · {alertes.filter(a => a.statut === 'ouverte' && a.niveau === 'critique').length} critiques en attente
        </Text>
        
        {filteredAlertes.map(a => {
          const n = NIVEAU_MAP[a.niveau] || NIVEAU_MAP.info;
          const s = STATUT_MAP[a.statut] || STATUT_MAP.ouverte;
          return (
            <View key={a.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4" style={{ borderLeftColor: n.border }}>
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-row gap-2">
                  {/* Niveau Badge */}
                  <View className="px-2 py-1 rounded-full" style={{ backgroundColor: n.bg }}>
                    <View className="flex-row items-center gap-1">
                      <FAIcon name={n.icon} size={10} color={n.text} family="FontAwesome6" />
                      <Text className="text-[10px] font-extrabold" style={{ color: n.text }}>{n.label}</Text>
                    </View>
                  </View>
                  
                  {/* Statut Badge */}
                  <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                    <View className="flex-row items-center gap-1">
                      <FAIcon name={s.icon} size={9} color={s.text} family="FontAwesome6" />
                      <Text className="text-[10px] font-extrabold" style={{ color: s.text }}>{s.label}</Text>
                    </View>
                  </View>
                </View>
                
                <Text className="text-muted text-[10px]">{new Date(a.created_at).toLocaleDateString('fr-FR')} {new Date(a.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              
              <Text className="text-navy font-bold text-sm mb-2">{a.type_alerte.replace(/_/g, ' ').toUpperCase()}</Text>
              <Text className="text-muted text-xs leading-relaxed mb-3">{a.description}</Text>
              
              <View className="flex-row justify-between items-center pt-2 border-t border-bg">
                <View className="flex-row items-center gap-1">
                  <FAIcon name="map-pin" size={11} color="#999" family="FontAwesome6" />
                  <Text className="text-xs text-muted">{a.ville_concernee || 'Nationale'}</Text>
                </View>
                
                {a.statut !== 'resolue' && a.statut !== 'archive' ? (
                  <TouchableOpacity
                    onPress={() => handleAction(a.id, a.statut)}
                    className="px-3 py-1.5 bg-navy rounded-lg border border-navy shadow-sm"
                  >
                    <Text className="text-white text-xs font-bold">
                      {a.statut === 'ouverte' ? 'Prendre en charge' : 'Résoudre'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View className="flex-row items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                    <FAIcon name="check" size={10} color="#27AE60" family="FontAwesome6" />
                    <Text className="text-green-600 text-xs font-bold">Traitée</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
        {filteredAlertes.length === 0 && (
          <View className="items-center justify-center py-12">
            <FAIcon name="circle-check" size={48} color="#27AE60" family="FontAwesome6" />
            <Text className="text-navy font-bold mt-3">Aucune alerte dans cette catégorie</Text>
            <Text className="text-muted text-xs mt-1">Le réseau est totalement sécurisé.</Text>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      {/* Confirmation Modals */}
      <ConfirmModal
        visible={pendingAction?.type === 'prendre_en_charge'}
        title="Prendre en charge l'alerte"
        message="Voulez-vous marquer cette alerte comme étant en cours de traitement ? Cela informera l'équipe de surveillance."
        confirmText="Confirmer"
        cancelText="Annuler"
        confirmColor="#8E44AD"
        icon="spinner"
        onConfirm={executePrendreEnCharge}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmModal
        visible={pendingAction?.type === 'resoudre'}
        title="Résoudre l'alerte"
        message="Voulez-vous marquer cette alerte comme résolue ? Cette action est définitive."
        confirmText="Résoudre"
        cancelText="Annuler"
        confirmColor="#27AE60"
        icon="circle-check"
        onConfirm={executeResoudre}
        onCancel={() => setPendingAction(null)}
      />
    </View>
  );
}

