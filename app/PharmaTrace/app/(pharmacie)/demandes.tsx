import { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { createRequests, decideRequests, workflowError, type WorkflowIntent } from '../../lib/businessWorkflows';
import { getBusinessPartners, getManufacturerCatalog } from '../../lib/workflowReads';
import { FAIcon } from '../../constants/icons';
import ConfirmModal from '../../components/ConfirmModal';

type FabricantOption = {
  id: string;
  nom_entite: string;
};

type CatalogItem = {
  nom_medicament: string;
  dosage: string;
  forme_galenique: string | null;
};

type CartItem = {
  nom_medicament: string;
  dosage: string;
  forme_galenique: string;
  quantite: string;
  isCustom: boolean;
};

type GroupedDemande = {
  id: string; // group_id or individual row id
  groupe_id: string | null;
  statut: string;
  created_at: string;
  fabricant: string;
  notes_pharmacie: string | null;
  items: {
    id: string;
    nom_medicament: string;
    dosage: string;
    forme_galenique: string | null;
    quantite_demandee: number;
    statut: string;
    notes_fabricant: string | null;
    transfert_id: string | null;
  }[];
};

export default function MesDemandesScreen() {
  const requestIntent = useRef<WorkflowIntent>({});
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [groupedDemandes, setGroupedDemandes] = useState<GroupedDemande[]>([]);
  const [fabricants, setFabricants] = useState<FabricantOption[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedDemande | null>(null);
  const [cancelTarget, setCancelTarget] = useState<GroupedDemande | null>(null);

  // Formulaire de création
  const [selectedFabricantId, setSelectedFabricantId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalNote, setGlobalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Saisie de l'item en cours d'ajout
  const [selectedCatalogIndex, setSelectedCatalogIndex] = useState<string>('custom');
  const [itemForm, setItemForm] = useState({
    nomMedicament: '',
    dosage: '',
    formeGalenique: '',
    quantite: '',
  });

  const [showFabricantPicker, setShowFabricantPicker] = useState(false);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    color: string;
    icon: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Récupérer les demandes individuelles
      const { data: listData, error: listError } = await supabase
        .from('demandes_stock')
        .select('id, nom_medicament, dosage, forme_galenique, quantite_demandee, notes_pharmacie, notes_fabricant, statut, created_at, groupe_id, fabricant_id(nom_entite), transfert_id')
        .eq('pharmacie_id', session.user.id)
        .order('created_at', { ascending: false });

      if (listError) throw listError;

      // Groupement par groupe_id ou par ID de ligne si groupe_id est absent
      const groupsMap: { [key: string]: GroupedDemande } = {};
      (listData ?? []).forEach((row: any) => {
        const key = row.groupe_id || row.id;
        if (!groupsMap[key]) {
          groupsMap[key] = {
            id: key,
            groupe_id: row.groupe_id,
            statut: row.statut,
            created_at: row.created_at,
            fabricant: row.fabricant_id?.nom_entite ?? 'Fabricant',
            notes_pharmacie: row.notes_pharmacie,
            items: [],
          };
        }
        groupsMap[key].items.push({
          id: row.id,
          nom_medicament: row.nom_medicament,
          dosage: row.dosage,
          forme_galenique: row.forme_galenique,
          quantite_demandee: row.quantite_demandee,
          statut: row.statut,
          notes_fabricant: row.notes_fabricant,
          transfert_id: row.transfert_id,
        });
      });

      // Mettre à jour le statut global du groupe
      Object.values(groupsMap).forEach((g) => {
        const statuses = g.items.map((i) => i.statut);
        if (statuses.every((s) => s === 'en_attente')) {
          g.statut = 'en_attente';
        } else if (statuses.every((s) => s === 'satisfait')) {
          g.statut = 'satisfait';
        } else if (statuses.every((s) => s === 'refuse')) {
          g.statut = 'refuse';
        } else if (statuses.every((s) => s === 'annule')) {
          g.statut = 'annule';
        } else {
          g.statut = 'partiel'; // statut mixte
        }
      });

      const sortedGroups = Object.values(groupsMap).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setGroupedDemandes(sortedGroups);

      // 2. Récupérer la liste des fabricants pour le dropdown
      const fabData = await getBusinessPartners();
      setFabricants(fabData ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleFabricantChange = async (fabId: string) => {
    setSelectedFabricantId(fabId);
    setCart([]);
    setCatalog([]);
    if (!fabId) return;

    setLoadingCatalog(true);
    try {
      const data = await getManufacturerCatalog(fabId);

      // Déduplication du catalogue
      const uniqueItems: CatalogItem[] = [];
      const keys = new Set<string>();
      (data ?? []).forEach((item) => {
        const key = `${item.nom_medicament.toLowerCase()}-${item.dosage.toLowerCase()}-${(item.forme_galenique || '').toLowerCase()}`;
        if (!keys.has(key)) {
          keys.add(key);
          uniqueItems.push({
            nom_medicament: item.nom_medicament,
            dosage: item.dosage,
            forme_galenique: item.forme_galenique,
          });
        }
      });

      setCatalog(uniqueItems);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleCatalogSelect = (indexStr: string) => {
    setSelectedCatalogIndex(indexStr);
    if (indexStr === 'custom') {
      setItemForm({ nomMedicament: '', dosage: '', formeGalenique: '', quantite: '' });
    } else {
      const idx = parseInt(indexStr, 10);
      const item = catalog[idx];
      if (item) {
        setItemForm({
          nomMedicament: item.nom_medicament,
          dosage: item.dosage,
          formeGalenique: item.forme_galenique ?? '',
          quantite: '',
        });
      }
    }
  };

  const addItemToCart = () => {
    if (!itemForm.nomMedicament.trim() || !itemForm.dosage.trim() || !itemForm.quantite.trim()) {
      setConfirmModal({
        title: 'Champs requis',
        message: 'Veuillez saisir le nom, le dosage et la quantité.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
        onConfirm: () => setConfirmModal(null),
      });
      return;
    }

    const qtyVal = parseInt(itemForm.quantite, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setConfirmModal({
        title: 'Quantité invalide',
        message: 'La quantité doit être un nombre supérieur à 0.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
        onConfirm: () => setConfirmModal(null),
      });
      return;
    }

    const newItem: CartItem = {
      nom_medicament: itemForm.nomMedicament.trim(),
      dosage: itemForm.dosage.trim(),
      forme_galenique: itemForm.formeGalenique.trim() || 'Comprimé',
      quantite: String(qtyVal),
      isCustom: selectedCatalogIndex === 'custom',
    };

    setCart([...cart, newItem]);
    // Reset item form
    setItemForm({ nomMedicament: '', dosage: '', formeGalenique: '', quantite: '' });
    setSelectedCatalogIndex('custom');
  };

  const removeItemFromCart = (index: number) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };

  const handleCreateRequest = async () => {
    if (!selectedFabricantId) {
      setConfirmModal({
        title: 'Fabricant requis',
        message: 'Veuillez choisir un fabricant destinataire.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
        onConfirm: () => setConfirmModal(null),
      });
      return;
    }

    if (cart.length === 0) {
      setConfirmModal({
        title: 'Panier vide',
        message: 'Veuillez ajouter au moins un produit à votre demande.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
        onConfirm: () => setConfirmModal(null),
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const insertRows = cart.map((item) => ({
        fabricant_id: selectedFabricantId,
        nom_medicament: item.nom_medicament,
        dosage: item.dosage,
        forme_galenique: item.forme_galenique,
        quantite: Number(item.quantite),
        note: globalNote.trim() || null,
      }));

      await createRequests(insertRows, requestIntent.current);

      setShowCreateModal(false);
      setCart([]);
      setGlobalNote('');
      setSelectedFabricantId('');
      setShowFabricantPicker(false);
      setShowCatalogPicker(false);
      await loadData();

      setConfirmModal({
        title: 'Demande envoyée',
        message: `Votre demande contenant ${insertRows.length} produit(s) a été transmise avec succès.`,
        color: '#27AE60',
        icon: 'circle-check',
        onConfirm: () => setConfirmModal(null),
      });
    } catch (e) {
      console.error(e);
      setConfirmModal({
        title: 'Erreur',
        message: workflowError(e),
        color: '#C0392B',
        icon: 'triangle-exclamation',
        onConfirm: () => setConfirmModal(null),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelGroupRequest = async (group: GroupedDemande) => {
    try {
      // Annuler toutes les demandes du groupe qui sont en attente
      const ids = group.items.filter(i => i.statut === 'en_attente').map(i => i.id);
      if (ids.length === 0) return;

      await decideRequests(ids, 'annule');

      await loadData();
      setConfirmModal({
        title: 'Demande annulée',
        message: 'La demande de stock a été annulée avec succès.',
        color: '#7F8C8D',
        icon: 'circle-check',
        onConfirm: () => setConfirmModal(null),
      });
    } catch (e) {
      console.error(e);
      setConfirmModal({
        title: 'Erreur',
        message: workflowError(e),
        color: '#C0392B',
        icon: 'triangle-exclamation',
        onConfirm: () => setConfirmModal(null),
      });
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'en_attente':
        return { bg: 'bg-pharma-orange/10', text: 'text-pharma-orange', label: 'En attente' };
      case 'satisfait':
        return { bg: 'bg-pharma-green/10', text: 'text-pharma-green', label: 'Satisfait' };
      case 'refuse':
        return { bg: 'bg-pharma-red/10', text: 'text-pharma-red', label: 'Refusé' };
      case 'partiel':
        return { bg: 'bg-blue-50', text: 'text-blue', label: 'Partiel' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Annulé' };
    }
  };

  if (loading && groupedDemandes.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#27AE60" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {/* Header / Actions */}
      <View className="px-4 py-3 bg-white border-b border-blue-light flex-row justify-between items-center">
        <View>
          <Text className="text-navy font-bold text-base">{groupedDemandes.length} demandes effectuées</Text>
          <Text className="text-muted text-xs mt-0.5">Demander du stock auprès des fabricants</Text>
        </View>
        <TouchableOpacity
          onPress={() => { requestIntent.current = {}; setShowCreateModal(true); }}
          className="bg-pharma-green px-4 h-10 rounded-lg flex-row items-center gap-2"
        >
          <FAIcon name="plus" size={14} color="#fff" family="FontAwesome6" />
          <Text className="text-white font-bold text-sm">Créer une demande</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {groupedDemandes.map((d) => {
          const style = getStatusStyle(d.statut);
          return (
            <TouchableOpacity
              key={d.id}
              onPress={() => setSelectedGroup(d)}
              className="bg-white rounded-xl p-4 mb-3 border border-blue-light shadow-sm"
              activeOpacity={0.7}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-navy font-bold text-base">Demande de réapprovisionnement</Text>
                  <Text className="text-muted text-xs mt-0.5">Pour : {d.fabricant}</Text>
                </View>
                <View className={`${style.bg} px-2 py-0.5 rounded-full`}>
                  <Text className={`${style.text} text-[10px] font-bold uppercase`}>{style.label}</Text>
                </View>
              </View>

              {/* Résumé des items */}
              <View className="my-2 bg-bg/50 p-2.5 rounded-lg border border-blue-light/40">
                {d.items.map((it, index) => (
                  <Text key={it.id} className="text-xs text-navy font-medium mb-1">
                    • {it.nom_medicament} {it.dosage} · <Text className="font-bold text-blue">{it.quantite_demandee} u.</Text>
                  </Text>
                ))}
              </View>

              <View className="flex-row justify-between items-center border-t border-bg pt-3">
                <Text className="text-muted text-[10px]">
                  Envoyée le : {new Date(d.created_at).toLocaleDateString('fr-FR')}
                </Text>
                
                {d.items.some(i => i.statut === 'en_attente') && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setCancelTarget(d);
                    }}
                    className="px-3 py-1 border border-pharma-red/30 rounded-lg"
                  >
                    <Text className="text-pharma-red text-xs font-semibold">Annuler tout</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {groupedDemandes.length === 0 && (
          <View className="items-center justify-center py-12">
            <FAIcon name="clipboard-list" size={48} color="#BACAD6" family="FontAwesome6" />
            <Text className="text-navy font-bold text-base mt-4">Aucune demande</Text>
            <Text className="text-muted text-xs mt-2 text-center">
              Faites vos demandes de réapprovisionnement en cliquant sur le bouton ci-dessus.
            </Text>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      {/* Modal Formulaire de Création */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCreateModal(false);
          setCart([]);
          setSelectedFabricantId('');
          setGlobalNote('');
          setShowFabricantPicker(false);
          setShowCatalogPicker(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4 border-b border-bg pb-3">
              <Text className="text-navy font-black text-lg">Nouvelle Demande Multi-Produits</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setCart([]);
                  setSelectedFabricantId('');
                  setGlobalNote('');
                  setShowFabricantPicker(false);
                  setShowCatalogPicker(false);
                }}
                className="p-1"
              >
                <FAIcon name="xmark" size={18} color="#C0392B" family="FontAwesome6" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={true}>
              <View className="gap-4">
                {/* Choix Fabricant */}
                <View style={{ zIndex: 20 }}>
                  <Text className="text-navy font-bold text-xs mb-1.5">Fabricant destinataire *</Text>
                  <TouchableOpacity
                    className="h-12 border border-blue-light rounded-xl px-4 flex-row items-center justify-between bg-bg/50 active:bg-blue-light/10"
                    onPress={() => {
                      setShowFabricantPicker(v => !v);
                      setShowCatalogPicker(false);
                    }}
                  >
                    <Text className="text-navy font-bold text-sm">
                      {selectedFabricantId 
                        ? (fabricants.find(f => f.id === selectedFabricantId)?.nom_entite ?? 'Sélectionner un fabricant...')
                        : 'Sélectionner un fabricant...'}
                    </Text>
                    <FAIcon name={showFabricantPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#6B7D90" family="FontAwesome6" />
                  </TouchableOpacity>

                  {showFabricantPicker && (
                    <View className="mt-2 border border-blue-light rounded-xl overflow-hidden bg-white shadow-sm max-h-48">
                      <ScrollView nestedScrollEnabled className="flex-grow">
                        <TouchableOpacity
                          className="px-4 py-3 border-b border-bg bg-white active:bg-[#F3F8FF]"
                          onPress={() => {
                            handleFabricantChange('');
                            setShowFabricantPicker(false);
                          }}
                        >
                          <Text className="text-navy font-bold text-xs">Sélectionner un fabricant...</Text>
                        </TouchableOpacity>
                        {fabricants.map((f) => (
                          <TouchableOpacity
                            key={f.id}
                            className={`px-4 py-3 border-b border-bg active:bg-[#F3F8FF] ${selectedFabricantId === f.id ? 'bg-[#F3F8FF]' : 'bg-white'}`}
                            onPress={() => {
                              handleFabricantChange(f.id);
                              setShowFabricantPicker(false);
                            }}
                          >
                            <Text className={`font-bold text-xs ${selectedFabricantId === f.id ? 'text-blue' : 'text-navy'}`}>
                              {f.nom_entite}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {selectedFabricantId ? (
                  <View className="border border-blue-light/50 bg-[#F4F9FD] p-4 rounded-xl">
                    <Text className="text-navy font-extrabold text-xs mb-3">Ajouter un produit à la demande :</Text>
                    {loadingCatalog ? (
                      <ActivityIndicator size="small" color="#1A3A5C" className="my-2" />
                    ) : (
                      <View className="gap-3">
                        {/* Dropdown catalogue */}
                        <View style={{ zIndex: 10 }}>
                          <Text className="text-muted text-[10px] uppercase font-bold mb-1">Médicaments du catalogue fabricant</Text>
                          <TouchableOpacity
                            className="h-10 border border-blue-light rounded-xl px-3 flex-row items-center justify-between bg-white active:bg-blue-light/10"
                            onPress={() => {
                              setShowCatalogPicker(v => !v);
                              setShowFabricantPicker(false);
                            }}
                          >
                            <Text className="text-navy font-semibold text-xs flex-1" numberOfLines={1}>
                              {selectedCatalogIndex === 'custom'
                                ? 'Saisie manuelle (autre produit)'
                                : (() => {
                                    const idx = parseInt(selectedCatalogIndex, 10);
                                    const c = catalog[idx];
                                    return c ? `${c.nom_medicament} (${c.dosage} · ${c.forme_galenique || '—'})` : 'Saisie manuelle (autre produit)';
                                  })()}
                            </Text>
                            <FAIcon name={showCatalogPicker ? 'chevron-up' : 'chevron-down'} size={12} color="#6B7D90" family="FontAwesome6" />
                          </TouchableOpacity>

                          {showCatalogPicker && (
                            <View className="mt-1 border border-blue-light rounded-xl overflow-hidden bg-white shadow-sm max-h-48">
                              <ScrollView nestedScrollEnabled className="flex-grow">
                                <TouchableOpacity
                                  className={`px-3 py-2 border-b border-bg active:bg-[#F3F8FF] ${selectedCatalogIndex === 'custom' ? 'bg-[#F3F8FF]' : 'bg-white'}`}
                                  onPress={() => {
                                    handleCatalogSelect('custom');
                                    setShowCatalogPicker(false);
                                  }}
                                >
                                  <Text className={`font-bold text-xs ${selectedCatalogIndex === 'custom' ? 'text-blue' : 'text-navy'}`}>
                                    Saisie manuelle (autre produit)
                                  </Text>
                                </TouchableOpacity>
                                {catalog.map((c, idx) => (
                                  <TouchableOpacity
                                    key={idx}
                                    className={`px-3 py-2 border-b border-bg active:bg-[#F3F8FF] ${selectedCatalogIndex === String(idx) ? 'bg-[#F3F8FF]' : 'bg-white'}`}
                                    onPress={() => {
                                      handleCatalogSelect(String(idx));
                                      setShowCatalogPicker(false);
                                    }}
                                  >
                                    <Text className={`font-bold text-xs ${selectedCatalogIndex === String(idx) ? 'text-blue' : 'text-navy'}`}>
                                      {c.nom_medicament} ({c.dosage} · {c.forme_galenique || '—'})
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>

                        {/* Nom (editable si custom) */}
                        <View className="flex-row gap-2">
                          <View className="flex-2">
                            <Text className="text-muted text-[10px] uppercase font-bold mb-1">Nom commercial</Text>
                            <TextInput
                              className="bg-white border border-blue-light rounded-xl h-10 px-3 text-xs text-navy"
                              placeholder="Ex : Ceftriaxone"
                              value={itemForm.nomMedicament}
                              onChangeText={(t) => setItemForm({ ...itemForm, nomMedicament: t })}
                              editable={selectedCatalogIndex === 'custom'}
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-muted text-[10px] uppercase font-bold mb-1">Dosage</Text>
                            <TextInput
                              className="bg-white border border-blue-light rounded-xl h-10 px-3 text-xs text-navy"
                              placeholder="Ex : 1g"
                              value={itemForm.dosage}
                              onChangeText={(t) => setItemForm({ ...itemForm, dosage: t })}
                            />
                          </View>
                        </View>

                        <View className="flex-row gap-2">
                          <View className="flex-1">
                            <Text className="text-muted text-[10px] uppercase font-bold mb-1">Forme galénique</Text>
                            <TextInput
                              className="bg-white border border-blue-light rounded-xl h-10 px-3 text-xs text-navy"
                              placeholder="Ex : Comprimé, Injection"
                              value={itemForm.formeGalenique}
                              onChangeText={(t) => setItemForm({ ...itemForm, formeGalenique: t })}
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-muted text-[10px] uppercase font-bold mb-1">Quantité (u.)</Text>
                            <TextInput
                              className="bg-white border border-blue-light rounded-xl h-10 px-3 text-xs text-navy font-bold"
                              placeholder="Nombre"
                              keyboardType="numeric"
                              value={itemForm.quantite}
                              onChangeText={(t) => setItemForm({ ...itemForm, quantite: t.replace(/[^0-9]/g, '') })}
                            />
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={addItemToCart}
                          className="h-10 bg-navy rounded-xl items-center justify-center mt-1"
                        >
                          <Text className="text-white font-bold text-xs">Ajouter au panier</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : null}

                {/* Panier d'items */}
                {cart.length > 0 && (
                  <View className="border border-blue-light p-3 rounded-xl bg-white">
                    <Text className="text-navy font-black text-xs mb-2">Panier de la demande ({cart.length})</Text>
                    {cart.map((item, index) => (
                      <View key={index} className="flex-row justify-between items-center py-2 border-b border-bg flex-wrap gap-2">
                        <View className="flex-1 pr-2">
                          <Text className="text-navy font-bold text-xs">{item.nom_medicament}</Text>
                          <Text className="text-muted text-[10px]">{item.dosage} · {item.forme_galenique}</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                          <Text className="text-blue font-black text-sm">{item.quantite} u.</Text>
                          <TouchableOpacity onPress={() => removeItemFromCart(index)} className="p-1">
                            <FAIcon name="trash" size={13} color="#C0392B" family="FontAwesome" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Note globale */}
                <View>
                  <Text className="text-navy font-bold text-xs mb-1.5">Note globale de commande (optionnel)</Text>
                  <TextInput
                    className="bg-bg border border-blue-light rounded-xl p-3 text-sm text-navy"
                    placeholder="Précisions pour la livraison globale de la commande..."
                    placeholderTextColor="#bbb"
                    value={globalNote}
                    onChangeText={setGlobalNote}
                    multiline
                    numberOfLines={2}
                    style={{ minHeight: 50, textAlignVertical: 'top' }}
                  />
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-3 mt-6 pt-3 border-t border-bg">
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setCart([]);
                  setSelectedFabricantId('');
                  setGlobalNote('');
                  setShowFabricantPicker(false);
                  setShowCatalogPicker(false);
                }}
                className="flex-1 h-12 border border-blue-light rounded-xl items-center justify-center"
              >
                <Text className="text-navy font-bold text-sm">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateRequest}
                disabled={submitting || cart.length === 0}
                className={`flex-1 h-12 rounded-xl items-center justify-center ${cart.length === 0 ? 'bg-pharma-green/40' : 'bg-pharma-green'}`}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-sm">Envoyer la demande</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Détails d'une Demande Groupée */}
      <Modal
        visible={selectedGroup !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedGroup(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4 border-b border-bg pb-3">
              <Text className="text-navy font-black text-lg">Détails Demande</Text>
              <TouchableOpacity onPress={() => setSelectedGroup(null)} className="p-1">
                <FAIcon name="xmark" size={18} color="#C0392B" family="FontAwesome6" />
              </TouchableOpacity>
            </View>

            {selectedGroup && (
              <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={true}>
                <View className="gap-3">
                  <View className="border-b border-bg pb-2">
                    <Text className="text-navy font-black text-sm">Fabricant : {selectedGroup.fabricant}</Text>
                    <Text className="text-muted text-[10px] mt-0.5">Envoyée le {new Date(selectedGroup.created_at).toLocaleString('fr-FR')}</Text>
                  </View>

                  <Text className="text-navy font-bold text-xs uppercase tracking-wider mt-1">Produits demandés :</Text>
                  
                  {selectedGroup.items.map((item) => {
                    const itemStyle = getStatusStyle(item.statut);
                    return (
                      <View key={item.id} className="bg-bg/40 border border-blue-light/50 rounded-xl p-3 mb-2">
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-navy font-bold text-xs flex-1 mr-2">{item.nom_medicament}</Text>
                          <View className={`${itemStyle.bg} px-2 py-0.5 rounded-full`}>
                            <Text className={`${itemStyle.text} text-[9px] font-bold uppercase`}>{itemStyle.label}</Text>
                          </View>
                        </View>
                        <Text className="text-muted text-[10px] mb-1">Dosage : {item.dosage} · Forme : {item.forme_galenique || '—'}</Text>
                        <Text className="text-navy text-xs font-bold">Quantité : {item.quantite_demandee} unités</Text>
                        
                        {item.notes_fabricant && (
                          <View className="mt-2 bg-white p-2 rounded border border-blue-light/30">
                            <Text className="text-[9px] text-muted font-bold uppercase">Notes Fabricant</Text>
                            <Text className="text-navy text-[10px] font-medium">{item.notes_fabricant}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  <View className="py-2 border-t border-bg mt-2">
                    <Text className="text-muted text-[10px] uppercase tracking-wider mb-1">Note globale pharmacie</Text>
                    <Text className="text-navy text-xs font-medium">{selectedGroup.notes_pharmacie ?? 'Aucune note globale.'}</Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setSelectedGroup(null)}
              className="mt-6 w-full h-12 bg-navy rounded-xl items-center justify-center"
            >
              <Text className="text-white font-bold text-sm">Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation Annulation */}
      <ConfirmModal
        visible={!!cancelTarget}
        title="Annuler la demande"
        message="Voulez-vous vraiment annuler tous les articles en attente de cette demande ?"
        confirmText="Annuler la demande"
        cancelText="Conserver"
        confirmColor="#C0392B"
        icon="triangle-exclamation"
        onConfirm={async () => {
          if (cancelTarget) {
            await handleCancelGroupRequest(cancelTarget);
            setCancelTarget(null);
          }
        }}
        onCancel={() => setCancelTarget(null)}
      />

      {/* Success/Error Alerts */}
      <ConfirmModal
        visible={!!confirmModal}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        confirmText="OK"
        confirmColor={confirmModal?.color}
        icon={confirmModal?.icon}
        onConfirm={async () => {
          if (confirmModal?.onConfirm) {
            confirmModal.onConfirm();
          }
          setConfirmModal(null);
        }}
      />
    </View>
  );
}
