import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';

const FORMES = ['Comprimé', 'Gélule', 'Sirop', 'Injectable', 'Poudre', 'Autre'];

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

  const update = (key: keyof typeof form) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    const required = ['nom_commercial', 'quantite', 'numero_lot', 'date_fabrication', 'date_expiration'] as const;
    if (required.some(k => !form[k].trim())) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs obligatoires (*).');
      return;
    }
    setLoading(true);
    // TODO: appeler Supabase Edge Function create-lot
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    Alert.alert('✅ Lot enregistré !', `Le lot ${form.numero_lot} a été créé avec succès.`, [
      { text: 'Voir mes lots', onPress: () => router.push('/(fabricant)/lots') },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-bg" keyboardShouldPersistTaps="handled">
      <View className="p-5">

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
          <Text className="text-pharma-orange text-xs leading-relaxed">
            ⚠️  Une fois enregistré, le numéro de lot, la date de fabrication et l'empreinte SHA-256 ne pourront plus être modifiés.
          </Text>
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
            : <Text className="text-white font-bold text-base">Générer le QR code →</Text>
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
