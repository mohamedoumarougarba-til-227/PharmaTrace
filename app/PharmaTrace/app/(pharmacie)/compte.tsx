import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, type Utilisateur } from '../../lib/supabase';

export default function PharmacieCompteScreen() {
  const [user,    setUser]    = useState<Utilisateur | null>(null);
  const [stats,   setStats]   = useState({ enStock: 0, recus: 0, verifications: 0 });
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      // Profil
      const { data: profile } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (profile) setUser(profile);

      // Stats pharmacie
      const [stockRes, recusRes, verifRes] = await Promise.all([
        supabase.from('lots_medicaments').select('id', { count: 'exact' }).eq('statut_actuel', 'en_pharmacie').eq('is_archived', false),
        supabase.from('transferts').select('id', { count: 'exact' }).eq('destinataire_id', session.user.id).eq('statut', 'receptionne'),
        supabase.from('historique_scans').select('id', { count: 'exact' }).eq('scanneur_id', session.user.id),
      ]);

      setStats({
        enStock:       stockRes.count ?? 0,
        recus:         recusRes.count ?? 0,
        verifications: verifRes.count ?? 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F9FC' }}>
        <ActivityIndicator color="#27AE60" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F7F9FC' }}>
      {/* Carte profil */}
      <View style={{ backgroundColor: 'white', margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#E8F8EC', borderWidth: 2, borderColor: '#27AE60', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 32 }}>💊</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A3A5C', marginBottom: 6 }}>
          {user?.nom_entite ?? 'Pharmacie Centrale'}
        </Text>
        <View style={{ backgroundColor: '#E8F8EC', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 100 }}>
          <Text style={{ color: '#27AE60', fontSize: 12, fontWeight: '700' }}>✓ Pharmacie agréée</Text>
        </View>
      </View>

      {/* Informations */}
      <View style={{ backgroundColor: 'white', marginHorizontal: 16, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#27AE60', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>INFORMATIONS</Text>
        <InfoRow icon="📧" label="Email"       value={user?.email         ?? '—'} />
        <InfoRow icon="📱" label="Téléphone"   value={user?.telephone     ?? '—'} />
        <InfoRow icon="📍" label="Adresse"     value={user?.adresse ? `${user.adresse}, ${user.ville ?? ''}` : '—'} />
        <InfoRow icon="🪪" label="N° Agrément" value={user?.numero_agrement ?? '—'} last />
      </View>

      {/* Statistiques */}
      <View style={{ backgroundColor: 'white', marginHorizontal: 16, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#27AE60', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>STATISTIQUES</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <StatItem value={String(stats.enStock)}       label="En stock"      color="#1A3A5C" />
          <StatItem value={String(stats.recus)}         label="Reçus"         color="#1A3A5C" />
          <StatItem value={String(stats.verifications)} label="Vérifications" color="#27AE60" />
        </View>
      </View>

      {/* Menu */}
      <View style={{ backgroundColor: 'white', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
        <MenuItem icon="🔔" label="Notifications" />
        <MenuItem icon="🔒" label="Sécurité" />
        <MenuItem icon="⚙️" label="Paramètres" />
        <MenuItem icon="❓" label="Aide & Support" last />
      </View>

      {/* Bouton déconnexion */}
      <TouchableOpacity
        onPress={handleLogout}
        disabled={loggingOut}
        style={{ marginHorizontal: 16, marginBottom: 32, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#C0392B', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: loggingOut ? 0.6 : 1 }}
      >
        {loggingOut
          ? <ActivityIndicator color="#C0392B" size="small" />
          : <>
              <Text style={{ fontSize: 16 }}>↩️</Text>
              <Text style={{ color: '#C0392B', fontWeight: '700', fontSize: 15 }}>Se déconnecter</Text>
            </>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: '#F7F9FC', gap: 14 }}>
      <Text style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 14, color: '#1A1A1A', fontWeight: '500' }}>{value}</Text>
      </View>
    </View>
  );
}

function StatItem({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 28, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#999' }}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, last }: { icon: string; label: string; last?: boolean }) {
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: '#F7F9FC', gap: 14 }}
      activeOpacity={0.6}
    >
      <Text style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{icon}</Text>
      <Text style={{ flex: 1, fontSize: 15, color: '#1A1A1A' }}>{label}</Text>
      <Text style={{ color: '#ccc', fontSize: 16 }}>›</Text>
    </TouchableOpacity>
  );
}
