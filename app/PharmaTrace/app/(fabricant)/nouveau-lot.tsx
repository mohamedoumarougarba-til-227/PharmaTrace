import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import { VERIFICATION_BASE_URL } from '../../constants/config';
import CustomDatePicker from '../../components/CustomDatePicker';
import ConfirmModal from '../../components/ConfirmModal';

const FORMES = ['Comprimé', 'Gélule', 'Sirop', 'Injectable', 'Poudre', 'Autre'];

const MOCK_LOTS = [
  {
    nom_commercial: 'Amoxicilline 500mg',
    denomination_commune: 'Amoxicilline trihydrate',
    forme_galenique: 'Comprimé',
    dosage: '500mg',
    quantite: '2000',
    numero_lot: 'FAB-2026-049',
    numero_amm: 'AMM-NIG-2024-001',
    date_fabrication: '15/01/2026',
    date_expiration: '15/01/2028',
  },
  {
    nom_commercial: 'Paracétamol Sirop',
    denomination_commune: 'Paracétamol',
    forme_galenique: 'Sirop',
    dosage: '250mg/5ml',
    quantite: '1500',
    numero_lot: 'PAR-2026-018',
    numero_amm: 'AMM-NIG-2025-014',
    date_fabrication: '03/02/2026',
    date_expiration: '03/02/2028',
  },
  {
    nom_commercial: 'Ceftriaxone 1g',
    denomination_commune: 'Ceftriaxone',
    forme_galenique: 'Injectable',
    dosage: '1g',
    quantite: '800',
    numero_lot: 'CEF-2026-112',
    numero_amm: 'AMM-NIG-2023-087',
    date_fabrication: '20/12/2025',
    date_expiration: '20/12/2027',
  },
];

export default function NouveauLotScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [form, setForm] = useState({
    nom_commercial:       '',
    denomination_commune: '',
    forme_galenique:      'Comprimé',
    dosage:               '',
    quantite:             '',
    numero_lot:           '',
    numero_amm:           '',
    date_fabrication:     '',
    date_expiration:      '',
  });
  const [loading,     setLoading]     = useState(false);
  const [showFormes,  setShowFormes]  = useState(false);
  const [mockIndex, setMockIndex] = useState(0);

  // Modals pour sélecteurs de date
  const [datePickerField, setDatePickerField] = useState<'date_fabrication' | 'date_expiration' | null>(null);

  const [infoModal, setInfoModal] = useState<{
    title: string;
    message: string;
    color: string;
    icon: string;
    onConfirm?: () => void;
  } | null>(null);

  const handleDateChange = (date: string) => {
    if (datePickerField) {
      setForm(f => ({ ...f, [datePickerField]: date }));
    }
  };

  const update = (key: keyof typeof form) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const loadMockLot = (index = mockIndex) => {
    const mock = MOCK_LOTS[index];
    setForm(f => ({
      ...f,
      nom_commercial: mock.nom_commercial,
      denomination_commune: mock.denomination_commune,
      forme_galenique: mock.forme_galenique,
      dosage: mock.dosage,
      quantite: mock.quantite,
      numero_lot: mock.numero_lot,
      numero_amm: mock.numero_amm,
      date_fabrication: mock.date_fabrication,
      date_expiration: mock.date_expiration,
    }));
  };

  const loadNextMockLot = () => {
    const nextIndex = (mockIndex + 1) % MOCK_LOTS.length;
    setMockIndex(nextIndex);
    loadMockLot(nextIndex);
  };

  const parseDateInput = (value: string) => {
    const [day, month, year] = value.split('/').map(part => part.trim());
    if (!day || !month || !year) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    const required = ['nom_commercial', 'quantite', 'numero_lot', 'date_fabrication', 'date_expiration'] as const;
    if (required.some(k => !form[k].trim())) {
      setInfoModal({
        title: 'Champs manquants',
        message: 'Veuillez remplir tous les champs obligatoires (*).',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setInfoModal({
        title: 'Session introuvable',
        message: 'Veuillez vous reconnecter pour créer un lot.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
      return;
    }

    const dateFabrication = parseDateInput(form.date_fabrication);
    const dateExpiration = parseDateInput(form.date_expiration);

    if (!dateFabrication || !dateExpiration) {
      setInfoModal({
        title: 'Format de date invalide',
        message: 'Utilisez le format JJ/MM/AAAA pour les dates.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
      return;
    }

    setLoading(true);
    try {
      const createdAt = new Date().toISOString();
      const hashSource = [
        form.numero_lot,
        form.nom_commercial,
        dateFabrication,
        userId,
        createdAt,
      ].join('|');
      const hashSha256 = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashSource
      );
      const qrCodeUrl = `${VERIFICATION_BASE_URL}?hash=${hashSha256}`;

      const { error } = await supabase.from('lots_medicaments').insert({
        numero_lot: form.numero_lot,
        nom_medicament: form.nom_commercial,
        denomination_commune: form.denomination_commune || null,
        forme_galenique: form.forme_galenique,
        dosage: form.dosage || null,
        quantite_initiale: Number(form.quantite),
        quantite_actuelle: Number(form.quantite),
        date_fabrication: dateFabrication,
        date_expiration: dateExpiration,
        fabricant_id: userId,
        numero_amm: form.numero_amm || null,
        pays_origine: 'Niger',
        hash_sha256: hashSha256,
        qr_code_url: qrCodeUrl,
        statut_actuel: 'en_stock_fabricant',
        is_archived: false,
        created_at: createdAt,
        updated_at: createdAt,
      });

      if (error) throw error;

      setInfoModal({
        title: 'Lot enregistré',
        message: `Le lot ${form.numero_lot} a été créé avec succès.`,
        color: '#27AE60',
        icon: 'circle-check',
        onConfirm: () => router.push('/(fabricant)/lots'),
      });
    } catch (error: any) {
      setInfoModal({
        title: 'Erreur',
        message: error?.message ?? 'Impossible d’enregistrer le lot.',
        color: '#C0392B',
        icon: 'triangle-exclamation',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg" keyboardShouldPersistTaps="handled">
      <View className="p-5">

        {/* Données mock */}
        <View className="bg-white border border-blue-light rounded-2xl p-4 mb-3 shadow-sm">
          <Text className="text-navy font-bold text-sm mb-1">Données mock</Text>
          <Text className="text-muted text-xs leading-relaxed mb-3">
            Charge un exemple de lot en un clic pour remplir automatiquement le formulaire.
          </Text>
          <View className="flex-row gap-2 flex-wrap">
            <TouchableOpacity
              onPress={() => loadMockLot()}
              className="px-4 py-3 rounded-xl bg-navy"
            >
              <Text className="text-white text-xs font-bold">Charger un exemple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={loadNextMockLot}
              className="px-4 py-3 rounded-xl bg-bg border border-blue-light"
            >
              <Text className="text-text text-xs font-bold">Exemple suivant</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-muted text-[11px] mt-2">
            Exemple actif: {MOCK_LOTS[mockIndex].nom_commercial}
          </Text>
        </View>

        {/* Section médicament */}
        <SectionTitle label="MÉDICAMENT" />

        <View style={isDesktop ? { flexDirection: 'row', gap: 16 } : undefined}>
          <View style={isDesktop ? { flex: 1 } : undefined}>
            <Field label="Nom commercial *" placeholder="Ex : Amoxicilline 500mg"
              value={form.nom_commercial} onChange={update('nom_commercial')} />
          </View>
          <View style={isDesktop ? { flex: 1 } : undefined}>
            <Field label="Dénomination Commune (DCI)" placeholder="Ex : Amoxicilline trihydrate"
              value={form.denomination_commune} onChange={update('denomination_commune')} />
          </View>
        </View>

        <View style={isDesktop ? { flexDirection: 'row', gap: 16, alignItems: 'flex-start' } : undefined}>
          <View style={isDesktop ? { flex: 1 } : undefined} className="mt-4">
            <Text className="text-text font-semibold text-sm mb-1">Forme galénique</Text>
            <View style={{ position: 'relative', zIndex: 10 }}>
              <TouchableOpacity
                className="w-full h-12 border border-blue-light bg-white rounded-lg px-4 flex-row justify-between items-center"
                onPress={() => setShowFormes(v => !v)}
              >
                <Text className="text-text text-sm">{form.forme_galenique}</Text>
                <Text className="text-muted">▼</Text>
              </TouchableOpacity>
              {showFormes && (
                <View 
                  className="bg-white border border-blue-light rounded-lg mt-1 shadow-sm overflow-hidden"
                  style={isDesktop ? { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99 } : undefined}
                >
                  {FORMES.map(f => (
                    <TouchableOpacity
                      key={f}
                      className="px-4 py-3 border-b border-bg"
                      onPress={() => { setForm(s => ({ ...s, forme_galenique: f })); setShowFormes(false); }}
                    >
                      <Text className={`text-sm ${f === form.forme_galenique ? 'text-navy font-bold' : 'text-text'}`}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <View style={isDesktop ? { flex: 1 } : undefined}>
            <Field label="Dosage" placeholder="Ex : 500mg, 250mg/5ml"
              value={form.dosage} onChange={update('dosage')} />
          </View>
          <View style={isDesktop ? { flex: 1 } : undefined}>
            <Field label="Quantité d'unités *" placeholder="Ex : 2000"
              value={form.quantite} onChange={update('quantite')} keyboardType="numeric" />
          </View>
        </View>

        {/* Section identification */}
        <SectionTitle label="IDENTIFICATION DU LOT" />

        <View style={isDesktop ? { flexDirection: 'row', gap: 16 } : undefined}>
          <View style={isDesktop ? { flex: 1 } : undefined}>
            <Field label="Numéro de lot *" placeholder="Ex : FAB-2026-049"
              value={form.numero_lot} onChange={update('numero_lot')} autoCapitalize="characters" />
          </View>
          <View style={isDesktop ? { flex: 1 } : undefined}>
            <Field label="Numéro AMM (optionnel)" placeholder="Ex : AMM-NIG-2024-001"
              value={form.numero_amm} onChange={update('numero_amm')} />
          </View>
        </View>

        <View style={isDesktop ? { flexDirection: 'row', gap: 16 } : undefined}>
          <View style={isDesktop ? { flex: 1 } : undefined}>
            <DateField label="Date de fabrication * (JJ/MM/AAAA)" placeholder="15/01/2026"
              value={form.date_fabrication} onChange={update('date_fabrication')} onOpenPicker={() => setDatePickerField('date_fabrication')} />
          </View>
          <View style={isDesktop ? { flex: 1 } : undefined}>
            <DateField label="Date d'expiration * (JJ/MM/AAAA)" placeholder="15/01/2028"
              value={form.date_expiration} onChange={update('date_expiration')} onOpenPicker={() => setDatePickerField('date_expiration')} />
          </View>
        </View>

        {/* Note immuabilité */}
        <View className="bg-orange/10 border-l-4 border-pharma-orange rounded-r-lg p-4 mt-4">
          <View className="flex-row items-start gap-2">
            <FAIcon name="triangle-exclamation" size={12} color="#E67E22" family="FontAwesome6" />
            <Text className="text-pharma-orange text-xs leading-relaxed flex-1">
              Vérifiez les données avant validation. L’empreinte SHA-256 est un identifiant technique, sans garantie sur le médicament physique.
            </Text>
          </View>
        </View>

        {/* Bouton */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className="w-full h-14 bg-navy rounded-xl items-center justify-center mt-6 mb-10"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <View className="flex-row items-center gap-2"><Text className="text-white font-bold text-base">Générer le QR code</Text><FAIcon name="arrow-right" size={12} color="#fff" family="FontAwesome6" /></View>
          }
        </TouchableOpacity>
      </View>

      <CustomDatePicker
        visible={datePickerField !== null}
        onClose={() => setDatePickerField(null)}
        value={datePickerField ? form[datePickerField] : ''}
        onChange={handleDateChange}
        title={datePickerField === 'date_fabrication' ? 'Date de fabrication' : 'Date d’expiration'}
      />

      {/* Info/Success/Error Modal */}
      <ConfirmModal
        visible={!!infoModal}
        title={infoModal?.title ?? ''}
        message={infoModal?.message ?? ''}
        confirmText="OK"
        confirmColor={infoModal?.color}
        icon={infoModal?.icon}
        onConfirm={async () => {
          if (infoModal?.onConfirm) {
            infoModal.onConfirm();
          }
          setInfoModal(null);
        }}
      />
    </ScrollView>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <Text className="text-blue font-bold text-xs uppercase tracking-widest mt-6 mb-3 pb-2 border-b border-blue-light">
      {label}
    </Text>
  );
}

function Field({
  label, placeholder, value, onChange, keyboardType = 'default', autoCapitalize = 'sentences',
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <View className="mt-4">
      <Text className="text-text font-semibold text-sm mb-1">{label}</Text>
      <TextInput
        className="w-full h-12 border border-blue-light bg-white rounded-lg px-4 text-sm text-text"
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function DateField({
  label, placeholder, value, onChange, onOpenPicker
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; onOpenPicker: () => void;
}) {
  return (
    <View className="mt-4">
      <Text className="text-text font-semibold text-sm mb-1">{label}</Text>
      <View className="w-full h-12 border border-blue-light bg-white rounded-lg flex-row items-center pr-2">
        <TextInput
          className="flex-1 h-full px-4 text-sm text-text"
          placeholder={placeholder}
          placeholderTextColor="#bbb"
          value={value}
          onChangeText={onChange}
          keyboardType="numbers-and-punctuation"
        />
        <TouchableOpacity
          onPress={onOpenPicker}
          className="w-10 h-10 items-center justify-center bg-blue/10 rounded-md"
        >
          <FAIcon name="calendar-days" size={16} color="#2E6DA4" family="FontAwesome6" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
