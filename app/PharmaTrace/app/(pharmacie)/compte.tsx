import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { supabase, type Utilisateur } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';

export default function PharmacieCompteScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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
      {/* Carte profil & Informations côte à côte sur desktop */}
      <View style={isDesktop ? { flexDirection: 'row', gap: 12, marginHorizontal: 12, marginTop: 10, marginBottom: 8 } : undefined}>
        {/* Carte profil */}
        <View style={{ flex: isDesktop ? 1 : undefined, backgroundColor: 'white', margin: isDesktop ? 0 : 16, borderRadius: 16, padding: isDesktop ? 12 : 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, justifyContent: 'center' }}>
          <View style={{ width: isDesktop ? 56 : 72, height: isDesktop ? 56 : 72, borderRadius: isDesktop ? 28 : 36, backgroundColor: '#E8F8EC', borderWidth: 2, borderColor: '#27AE60', alignItems: 'center', justifyContent: 'center', marginBottom: isDesktop ? 6 : 12 }}>
            <FAIcon name="pills" size={isDesktop ? 26 : 36} color="#27AE60" family="FontAwesome6" />
          </View>
          <Text style={{ fontSize: isDesktop ? 16 : 20, fontWeight: '800', color: '#1A3A5C', marginBottom: isDesktop ? 4 : 6, textAlign: 'center' }}>
            {user?.nom_entite ?? 'Pharmacie Centrale'}
          </Text>
          <View style={{ backgroundColor: '#E8F8EC', paddingHorizontal: isDesktop ? 10 : 14, paddingVertical: isDesktop ? 2 : 4, borderRadius: 100 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FAIcon name="check" size={isDesktop ? 10 : 12} color="#27AE60" family="FontAwesome6" />
              <Text style={{ color: '#27AE60', fontSize: isDesktop ? 11 : 12, fontWeight: '700' }}>Pharmacie agréée</Text>
            </View>
          </View>
        </View>

        {/* Informations */}
        <View style={{ flex: isDesktop ? 1.5 : undefined, backgroundColor: 'white', marginHorizontal: isDesktop ? 0 : 16, borderRadius: 16, padding: isDesktop ? 12 : 20, marginVertical: isDesktop ? 0 : 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#27AE60', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: isDesktop ? 8 : 16 }}>INFORMATIONS</Text>
          <InfoRow iconName="envelope" label="Email"       value={user?.email         ?? '—'} isDesktop={isDesktop} />
          <InfoRow iconName="phone" label="Téléphone"   value={user?.telephone     ?? '—'} isDesktop={isDesktop} />
          <InfoRow iconName="map-pin" label="Adresse"     value={user?.adresse ? `${user.adresse}, ${user.ville ?? ''}` : '—'} isDesktop={isDesktop} />
          <InfoRow iconName="id-card" label="N° Agrément" value={user?.numero_agrement ?? '—'} isDesktop={isDesktop} last />
        </View>
      </View>

      {/* Statistiques */}
      <View style={{ backgroundColor: 'white', marginHorizontal: isDesktop ? 12 : 16, borderRadius: 16, padding: isDesktop ? 12 : 20, marginBottom: isDesktop ? 8 : 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#27AE60', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: isDesktop ? 8 : 16 }}>STATISTIQUES</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <StatItem value={String(stats.enStock)}       label="En stock"      color="#1A3A5C" isDesktop={isDesktop} />
          <StatItem value={String(stats.recus)}         label="Reçus"         color="#1A3A5C" isDesktop={isDesktop} />
          <StatItem value={String(stats.verifications)} label="Vérifications" color="#27AE60" isDesktop={isDesktop} />
        </View>
      </View>

      {/* Menu */}
      <View style={isDesktop ? { flexDirection: 'row', gap: 10, marginHorizontal: 12, marginBottom: 8 } : { backgroundColor: 'white', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
        <MenuItem iconName="bell" label="Notifications" isDesktop={isDesktop} />
        <MenuItem iconName="lock" label="Sécurité" isDesktop={isDesktop} />
        <MenuItem iconName="gear" label="Paramètres" isDesktop={isDesktop} />
        <MenuItem iconName="circle-question" label="Aide & Support" isDesktop={isDesktop} last />
      </View>

      {/* Bouton déconnexion (Masqué sur Desktop car présent dans le dock/sidebar) */}
      {!isDesktop && (
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          style={{ marginHorizontal: 16, marginBottom: 32, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#C0392B', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: loggingOut ? 0.6 : 1 }}
        >
          {loggingOut
            ? <ActivityIndicator color="#C0392B" size="small" />
            : <>
                <FontAwesome6 name="arrow-right-from-bracket" size={16} color="#C0392B" />
                <Text style={{ color: '#C0392B', fontWeight: '700', fontSize: 15 }}>Se déconnecter</Text>
              </>
          }
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function InfoRow({ iconName, label, value, last, isDesktop }: { iconName: string; label: string; value: string; last?: boolean; isDesktop?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: isDesktop ? 6 : 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: '#F7F9FC', gap: isDesktop ? 10 : 14 }}>
      <FAIcon name={iconName} size={isDesktop ? 14 : 18} color="#27AE60" family="FontAwesome6" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isDesktop ? 10 : 11, color: '#999', marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: isDesktop ? 13 : 14, color: '#1A1A1A', fontWeight: '500' }}>{value}</Text>
      </View>
    </View>
  );
}

function StatItem({ value, label, color, isDesktop }: { value: string; label: string; color: string; isDesktop?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: isDesktop ? 2 : 4 }}>
      <Text style={{ fontSize: isDesktop ? 22 : 28, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: isDesktop ? 10 : 11, color: '#999' }}>{label}</Text>
    </View>
  );
}

function MenuItem({ iconName, label, last, isDesktop }: { iconName: string; label: string; last?: boolean; isDesktop?: boolean }) {
  if (isDesktop) {
    return (
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
        activeOpacity={0.6}
      >
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F8EC', alignItems: 'center', justifyContent: 'center' }}>
          <FAIcon name={iconName} size={14} color="#27AE60" family="FontAwesome6" />
        </View>
        <Text style={{ fontSize: 12, color: '#1A3A5C', fontWeight: '700', textAlign: 'center' }}>{label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: '#F7F9FC', gap: 14 }}
      activeOpacity={0.6}
    >
      <FAIcon name={iconName} size={18} color="#27AE60" family="FontAwesome6" />
      <Text style={{ flex: 1, fontSize: 15, color: '#1A1A1A' }}>{label}</Text>
      <FontAwesome6 name="chevron-right" size={16} color="#ccc" />
    </TouchableOpacity>
  );
}
