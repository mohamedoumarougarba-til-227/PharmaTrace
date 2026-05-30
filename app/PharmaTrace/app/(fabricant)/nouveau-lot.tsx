import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { sha256 } from 'js-sha256';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';

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
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs obligatoires (*).');
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      Alert.alert('Session introuvable', 'Veuillez vous reconnecter pour créer un lot.');
      return;
    }

    const dateFabrication = parseDateInput(form.date_fabrication);
    const dateExpiration = parseDateInput(form.date_expiration);

    if (!dateFabrication || !dateExpiration) {
      Alert.alert('Format de date invalide', 'Utilisez le format JJ/MM/AAAA pour les dates.');
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
      const hashSha256 = sha256(hashSource);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(form.numero_lot)}`;

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

      Alert.alert('Lot enregistré', `Le lot ${form.numero_lot} a été créé avec succès.`, [
        { text: 'Voir mes lots', onPress: () => router.push('/(fabricant)/lots') },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message ?? 'Impossible d’enregistrer le lot.');
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

        <Field label="Nom commercial *" placeholder="Ex : Amoxicilline 500mg"
          value={form.nom_commercial} onChange={update('nom_commercial')} />

        <Field label="Dénomination Commune (DCI)" placeholder="Ex : Amoxicilline trihydrate"
          value={form.denomination_commune} onChange={update('denomination_commune')} />

        {/* Forme galénique */}
        <Text className="text-text font-semibold text-sm mt-4 mb-1">Forme galénique</Text>
        <TouchableOpacity
          className="w-full h-12 border border-blue-light bg-white rounded-lg px-4 flex-row justify-between items-center"
          onPress={() => setShowFormes(v => !v)}
        >
          <Text className="text-text text-sm">{form.forme_galenique}</Text>
          <Text className="text-muted">▼</Text>
        </TouchableOpacity>
        {showFormes && (
          <View className="bg-white border border-blue-light rounded-lg mt-1 shadow-sm overflow-hidden">
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

        <Field label="Dosage" placeholder="Ex : 500mg, 250mg/5ml"
          value={form.dosage} onChange={update('dosage')} />

        <Field label="Quantité d'unités *" placeholder="Ex : 2000"
          value={form.quantite} onChange={update('quantite')} keyboardType="numeric" />

        {/* Section identification */}
        <SectionTitle label="IDENTIFICATION DU LOT" />

        <Field label="Numéro de lot officiel *" placeholder="Ex : FAB-2026-049"
          value={form.numero_lot} onChange={update('numero_lot')} autoCapitalize="characters" />

        <Field label="Numéro AMM (optionnel)" placeholder="Ex : AMM-NIG-2024-001"
          value={form.numero_amm} onChange={update('numero_amm')} />

        <Field label="Date de fabrication * (JJ/MM/AAAA)" placeholder="15/01/2026"
          value={form.date_fabrication} onChange={update('date_fabrication')} keyboardType="numbers-and-punctuation" />

        <Field label="Date d'expiration * (JJ/MM/AAAA)" placeholder="15/01/2028"
          value={form.date_expiration} onChange={update('date_expiration')} keyboardType="numbers-and-punctuation" />

        {/* Note immuabilité */}
        <View className="bg-orange/10 border-l-4 border-pharma-orange rounded-r-lg p-4 mt-4">
          <View className="flex-row items-start gap-2">
            <FAIcon name="triangle-exclamation" size={12} color="#E67E22" family="FontAwesome6" />
            <Text className="text-pharma-orange text-xs leading-relaxed flex-1">
              Une fois enregistré, le numéro de lot, la date de fabrication et l'empreinte SHA-256 ne pourront plus être modifiés.
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
