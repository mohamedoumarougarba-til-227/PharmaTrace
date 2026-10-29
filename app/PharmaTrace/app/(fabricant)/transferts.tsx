import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FAIcon } from '../../constants/icons';
import { supabase } from '../../lib/supabase';
import { decideTransfer, workflowError } from '../../lib/businessWorkflows';
import CustomDatePicker from '../../components/CustomDatePicker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import ConfirmModal from '../../components/ConfirmModal';

const STATUT_MAP: Record<string, { label: string; bg: string; text: string; color: string }> = {
  en_attente:  { label: 'En attente',   bg: '#FEF4E0', text: '#E67E22', color: '#E67E22' },
  receptionne: { label: 'Réceptionné',  bg: '#E8F8EC', text: '#27AE60', color: '#27AE60' },
  refuse:      { label: 'Refusé',       bg: '#FDE8E8', text: '#C0392B', color: '#C0392B' },
  annule:      { label: 'Annulé',       bg: '#F0F4F8', text: '#6B7D90', color: '#8A9BA8' },
};

export default function TransfertsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transferts, setTransferts] = useState<any[]>([]);

  // Filtres
  const [search, setSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('tous'); // 'tous', 'en_attente', 'receptionne', 'refuse'
  const [cityFilter, setCityFilter] = useState('');
  const [startDate, setStartDate] = useState(''); // Format "JJ/MM/AAAA"
  const [endDate, setEndDate] = useState(''); // Format "JJ/MM/AAAA"
  const [showFilters, setShowFilters] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'start' | 'end' | null>(null);
  const [cancelTransferTarget, setCancelTransferTarget] = useState<any | null>(null);
  const [successModal, setSuccessModal] = useState<{
    title: string;
    message: string;
    color: string;
    icon: string;
  } | null>(null);

  const loadTransferts = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTransferts([]);
        return;
      }

      const { data, error } = await supabase
        .from('transferts')
        .select('id, quantite_transferee, date_initiation, statut, lot_id(id, nom_medicament, numero_lot), destinataire_id(nom_entite, ville, pays)')
        .eq('expediteur_id', session.user.id)
        .order('date_initiation', { ascending: false });

      if (error) throw error;
      setTransferts(data ?? []);
    } catch (error) {
      console.error(error);
      setTransferts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cancelTransferExecution = async (transfertId: string) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSuccessModal({
          title: 'Session expirée',
          message: 'Veuillez vous reconnecter pour effectuer cette action.',
          color: '#C0392B',
          icon: 'triangle-exclamation'
        });
        return;
      }

      await decideTransfer(transfertId, 'annule');

      setSuccessModal({
        title: 'Succès',
        message: 'Le transfert a été annulé avec succès et la quantité a été restituée au lot.',
        color: '#27AE60',
        icon: 'circle-check'
      });
      await loadTransferts();
    } catch (error) {
      console.error(error);
      setSuccessModal({
        title: 'Erreur',
        message: workflowError(error),
        color: '#C0392B',
        icon: 'triangle-exclamation'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTransfer = (t: any) => {
    setCancelTransferTarget(t);
  };

  useFocusEffect(
    useCallback(() => {
      loadTransferts();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransferts();
  };

  // Convertir le format JJ/MM/AAAA en objet Date
  const parseDate = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(y, m, d);
      }
    }
    return null;
  };

  // Filtrer les transferts en local
  const filteredTransferts = useMemo(() => {
    return transferts.filter(t => {
      // 1. Recherche par nom pharmacie, médicament ou numéro lot
      const pharmName = (t.destinataire_id?.nom_entite || '').toLowerCase();
      const lotName = (t.lot_id?.nom_medicament || '').toLowerCase();
      const lotNum = (t.lot_id?.numero_lot || '').toLowerCase();
      const query = search.toLowerCase();
      if (query && !pharmName.includes(query) && !lotName.includes(query) && !lotNum.includes(query)) {
        return false;
      }

      // 2. Statut
      if (selectedStatut !== 'tous' && t.statut !== selectedStatut) {
        return false;
      }

      // 3. Ville / Pays
      const city = (t.destinataire_id?.ville || '').toLowerCase();
      const country = (t.destinataire_id?.pays || '').toLowerCase();
      const cityQuery = cityFilter.toLowerCase();
      if (cityQuery && !city.includes(cityQuery) && !country.includes(cityQuery)) {
        return false;
      }

      // 4. Intervalle de dates
      const tDate = new Date(t.date_initiation);
      tDate.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour la comparaison de date pure

      if (startDate) {
        const start = parseDate(startDate);
        if (start && tDate < start) return false;
      }

      if (endDate) {
        const end = parseDate(endDate);
        if (end && tDate > end) return false;
      }

      return true;
    });
  }, [transferts, search, selectedStatut, cityFilter, startDate, endDate]);

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleDateSelect = (date: string) => {
    if (datePickerField === 'start') {
      setStartDate(date);
    } else if (datePickerField === 'end') {
      setEndDate(date);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color="#1A3A5C" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-bg">
      {/* Barre de recherche et bouton de filtres */}
      <View className="bg-white border-b border-blue-light px-4 py-3 shadow-sm">
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center border border-blue-light bg-bg rounded-xl px-3">
            <FAIcon name="magnifying-glass" size={14} color="#6B7D90" family="FontAwesome6" />
            <TextInput
              className="flex-1 h-10 px-2 text-navy font-semibold text-sm"
              placeholder="Rechercher pharmacie, lot, médicament..."
              placeholderTextColor="#9AA9B8"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <FAIcon name="xmark" size={14} color="#6B7D90" family="FontAwesome6" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(v => !v)}
            className={`w-10 h-10 items-center justify-center border rounded-xl ${
              showFilters || cityFilter || startDate || endDate
                ? 'bg-blue/10 border-blue' 
                : 'bg-white border-blue-light'
            }`}
          >
            <FAIcon name="sliders" size={16} color={showFilters || cityFilter || startDate || endDate ? '#2E6DA4' : '#6B7D90'} family="FontAwesome6" />
          </TouchableOpacity>
        </View>

        {/* Panneau de filtres avancés */}
        {(showFilters || cityFilter || startDate || endDate) && (
          <View className="mt-3 pt-3 border-t border-bg">
            {/* Ville / Pays */}
            <View className="flex-row items-center border border-blue-light bg-bg rounded-xl px-3 mb-2">
              <FAIcon name="map-pin" size={12} color="#6B7D90" family="FontAwesome6" />
              <TextInput
                className="flex-1 h-9 px-2 text-navy font-semibold text-xs"
                placeholder="Filtrer par Ville ou Pays (ex: Niamey, Niger)..."
                placeholderTextColor="#9AA9B8"
                value={cityFilter}
                onChangeText={setCityFilter}
              />
              {cityFilter ? (
                <TouchableOpacity onPress={() => setCityFilter('')}>
                  <FAIcon name="xmark" size={12} color="#6B7D90" family="FontAwesome6" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Dates de début et de fin */}
            <View className="flex-row gap-2 items-center">
              <TouchableOpacity
                onPress={() => setDatePickerField('start')}
                className="flex-1 h-9 border border-blue-light bg-bg rounded-xl px-3 flex-row items-center justify-between"
              >
                <Text className="text-navy font-semibold text-xs" numberOfLines={1}>
                  {startDate || 'Date début'}
                </Text>
                <FAIcon name="calendar" size={11} color="#6B7D90" family="FontAwesome" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDatePickerField('end')}
                className="flex-1 h-9 border border-blue-light bg-bg rounded-xl px-3 flex-row items-center justify-between"
              >
                <Text className="text-navy font-semibold text-xs" numberOfLines={1}>
                  {endDate || 'Date fin'}
                </Text>
                <FAIcon name="calendar" size={11} color="#6B7D90" family="FontAwesome" />
              </TouchableOpacity>

              {(startDate || endDate) && (
                <TouchableOpacity
                  onPress={clearDateFilters}
                  className="w-9 h-9 items-center justify-center bg-pharma-red/10 border border-pharma-red/20 rounded-xl"
                >
                  <FAIcon name="trash" size={12} color="#C0392B" family="FontAwesome" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Pilules de Statut */}
        <View className="flex-row flex-wrap gap-1.5 mt-3">
          {['tous', 'en_attente', 'receptionne', 'refuse', 'annule'].map((st) => {
            const isActive = selectedStatut === st;
            let label = 'Tous';
            let activeBg = 'bg-navy';
            let activeText = 'text-white';
            
            if (st === 'en_attente') {
              label = 'En cours';
              activeBg = 'bg-[#FEF4E0] border border-[#E67E22]/30';
              activeText = 'text-[#E67E22]';
            } else if (st === 'receptionne') {
              label = 'Réceptionnés';
              activeBg = 'bg-[#E8F8EC] border border-[#27AE60]/30';
              activeText = 'text-[#27AE60]';
            } else if (st === 'refuse') {
              label = 'Refusés';
              activeBg = 'bg-[#FDE8E8] border border-[#C0392B]/30';
              activeText = 'text-[#C0392B]';
            } else if (st === 'annule') {
              label = 'Annulés';
              activeBg = 'bg-[#F0F4F8] border border-[#6B7D90]/30';
              activeText = 'text-[#6B7D90]';
            }

            return (
              <TouchableOpacity
                key={st}
                onPress={() => setSelectedStatut(st)}
                className={`py-1.5 px-2.5 rounded-lg items-center justify-center border ${
                  isActive 
                    ? activeBg + ' border-transparent' 
                    : 'bg-bg border-blue-light'
                }`}
              >
                <Text className={`text-[10px] font-extrabold uppercase ${isActive ? activeText : 'text-muted'}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3A5C" />}
      >
        <Text className="text-muted text-[10px] font-bold uppercase tracking-wider mb-3">
          {filteredTransferts.length} transfert(s) filtré(s) sur {transferts.length} au total
        </Text>

        {filteredTransferts.length === 0 && (
          <View className="bg-white rounded-2xl p-6 mb-3 border border-blue-light items-center justify-center">
            <FAIcon name="exchange" size={32} color="#ccc" family="FontAwesome" />
            <Text className="text-navy font-bold text-sm mt-3 text-center">Aucun transfert ne correspond</Text>
            <Text className="text-muted text-xs mt-1 text-center">Ajustez vos filtres de recherche ou de date.</Text>
          </View>
        )}

        {filteredTransferts.map(t => {
          const s = STATUT_MAP[t.statut] || { label: t.statut, bg: '#eee', text: '#333', color: '#ccc' };
          const formattedDate = new Date(t.date_initiation).toLocaleDateString('fr-FR');
          
          return (
            <View 
              key={t.id} 
              className="mb-3 rounded-2xl bg-white shadow-sm border border-[#E6EEF8] border-l-[5px]" 
              style={{ overflow: 'hidden', borderLeftColor: s.color, opacity: t.statut === 'annule' ? 0.55 : 1 }}
            >
              <Swipeable
                renderRightActions={() => {
                  if (t.statut !== 'en_attente') return null;
                  return (
                    <TouchableOpacity
                      onPress={() => handleCancelTransfer(t)}
                      style={{
                        backgroundColor: '#C0392B',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 80,
                        height: '100%',
                      }}
                    >
                      <FAIcon name="trash" size={18} color="#fff" family="FontAwesome" />
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 4 }}>Annuler</Text>
                    </TouchableOpacity>
                  );
                }}
              >
                <View className="bg-white p-4">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="text-navy font-black text-sm">{t.lot_id?.nom_medicament ?? 'Lot'}</Text>
                      <Text className="text-muted text-xs mt-0.5">
                        {t.lot_id?.numero_lot ?? '—'}  ·  <Text className="font-extrabold text-navy">{t.quantite_transferee}</Text> unités
                      </Text>
                    </View>
                    <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                      <Text className="text-[10px] font-extrabold uppercase" style={{ color: s.text }}>{s.label}</Text>
                    </View>
                  </View>
                  
                  <View className="pt-2 mt-2 border-t border-bg flex-row justify-between items-end">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <FAIcon name="hospital" size={10} color="#2E6DA4" family="FontAwesome6" />
                        <Text className="text-xs text-navy font-bold">{t.destinataire_id?.nom_entite ?? 'Pharmacie'}</Text>
                      </View>
                      
                      {(t.destinataire_id?.ville || t.destinataire_id?.pays) && (
                        <View className="flex-row items-center gap-1.5">
                          <FAIcon name="map-pin" size={10} color="#6B7D90" family="FontAwesome6" />
                          <Text className="text-[10px] text-muted font-semibold">
                            {[t.destinataire_id?.ville, t.destinataire_id?.pays].filter(Boolean).join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      {t.statut === 'en_attente' && (
                        <TouchableOpacity
                          onPress={() => handleCancelTransfer(t)}
                          style={{
                            backgroundColor: '#C0392B',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Annuler</Text>
                        </TouchableOpacity>
                      )}
                      <Text className="text-[9px] text-muted font-bold uppercase tracking-wide">
                        Le {formattedDate}
                      </Text>
                    </View>
                  </View>
                </View>
              </Swipeable>
            </View>
          );
        })}
      </ScrollView>

      {/* Date Pickers Modals */}
      <CustomDatePicker
        visible={datePickerField === 'start'}
        onClose={() => setDatePickerField(null)}
        value={startDate}
        onChange={handleDateSelect}
        title="Filtrer à partir du"
      />
      <CustomDatePicker
        visible={datePickerField === 'end'}
        onClose={() => setDatePickerField(null)}
        value={endDate}
        onChange={handleDateSelect}
        title="Filtrer jusqu'au"
      />

      {/* Reusable ConfirmModal for Cancellation */}
      <ConfirmModal
        visible={!!cancelTransferTarget}
        title="Annuler le transfert"
        message={cancelTransferTarget ? `Voulez-vous vraiment annuler le transfert de ${cancelTransferTarget.quantite_transferee} unités de "${cancelTransferTarget.lot_id?.nom_medicament ?? ''}" vers "${cancelTransferTarget.destinataire_id?.nom_entite ?? ''}" ?\n\nCette action restituera les unités au stock de ce lot.` : ''}
        confirmText="Confirmer l'annulation"
        cancelText="Retour"
        confirmColor="#C0392B"
        icon="trash"
        onConfirm={async () => {
          if (cancelTransferTarget) {
            await cancelTransferExecution(cancelTransferTarget.id);
            setCancelTransferTarget(null);
          }
        }}
        onCancel={() => setCancelTransferTarget(null)}
      />

      {/* Success/Error ConfirmModal */}
      <ConfirmModal
        visible={!!successModal}
        title={successModal?.title ?? ''}
        message={successModal?.message ?? ''}
        confirmText="OK"
        confirmColor={successModal?.color}
        icon={successModal?.icon}
        onConfirm={async () => setSuccessModal(null)}
      />
    </View>
  </GestureHandlerRootView>
  );
}
