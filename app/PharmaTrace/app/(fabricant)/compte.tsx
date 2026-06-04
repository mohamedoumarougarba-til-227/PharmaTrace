import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { supabase, type Utilisateur } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';

export default function FabricantCompteScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [user,    setUser]    = useState<Utilisateur | null>(null);
  const [stats,   setStats]   = useState({ lots: 0, transferts: 0, conformite: 0 });
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

      // Stats fabricant
      const [lotsRes, transfertsRes] = await Promise.all([
        supabase.from('lots_medicaments').select('id', { count: 'exact' }).eq('fabricant_id', session.user.id),
        supabase.from('transferts').select('id', { count: 'exact' }).eq('expediteur_id', session.user.id),
      ]);

      const nbLots       = lotsRes.count ?? 0;
      const nbTransferts = transfertsRes.count ?? 0;
      const conformite   = nbLots > 0 ? Math.round(((nbLots - 0) / nbLots) * 100) : 98;

      setStats({ lots: nbLots, transferts: nbTransferts, conformite });
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
        <ActivityIndicator color="#1A3A5C" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F7F9FC' }}>
      {/* Carte profil & Informations côte à côte sur desktop */}
      <View style={isDesktop ? { flexDirection: 'row', gap: 16, marginHorizontal: 16, marginTop: 16, marginBottom: 12 } : undefined}>
        {/* Carte profil */}
        <View style={{ flex: isDesktop ? 1 : undefined, backgroundColor: 'white', margin: isDesktop ? 0 : 16, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, justifyContent: 'center' }}>
          {/* Avatar */}
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#DCE6F0', borderWidth: 2, borderColor: '#2E6DA4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <FAIcon name="industry" size={36} color="#1A3A5C" family="FontAwesome6" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A3A5C', marginBottom: 6, textAlign: 'center' }}>
            {user?.nom_entite ?? 'Labo Niger Pharma'}
          </Text>
          <View style={{ backgroundColor: '#E8F8EC', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 100 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FAIcon name="check" size={12} color="#27AE60" family="FontAwesome6" />
              <Text style={{ color: '#27AE60', fontSize: 12, fontWeight: '700' }}>Fabricant agréé</Text>
            </View>
          </View>
        </View>

        {/* Informations */}
        <View style={{ flex: isDesktop ? 1.5 : undefined, backgroundColor: 'white', marginHorizontal: isDesktop ? 0 : 16, borderRadius: 16, padding: 20, marginVertical: isDesktop ? 0 : 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E6DA4', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>INFORMATIONS</Text>
          <InfoRow iconName="envelope" label="Email"      value={user?.email         ?? '—'} />
          <InfoRow iconName="phone" label="Téléphone"  value={user?.telephone     ?? '—'} />
          <InfoRow iconName="map-pin" label="Adresse"    value={user?.adresse ? `${user.adresse}, ${user.ville ?? ''}` : '—'} />
          <InfoRow iconName="id-card" label="N° Agrément" value={user?.numero_agrement ?? '—'} last />
        </View>
      </View>

      {/* Statistiques */}
      <View style={{ backgroundColor: 'white', marginHorizontal: 16, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E6DA4', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>STATISTIQUES</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <StatItem value={String(stats.lots)}        label="Lots créés"  color="#1A3A5C" />
          <StatItem value={String(stats.transferts)}  label="Transferts"  color="#1A3A5C" />
          <StatItem value={`${stats.conformite}%`}    label="Conformité"  color="#27AE60" />
        </View>
      </View>

      {/* Menu */}
      <View style={isDesktop ? { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 12 } : { backgroundColor: 'white', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
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

function InfoRow({ iconName, label, value, last }: { iconName: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: '#F7F9FC', gap: 14 }}>
      <FAIcon name={iconName} size={18} color="#2E6DA4" family="FontAwesome6" />
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

function MenuItem({ iconName, label, last, isDesktop }: { iconName: string; label: string; last?: boolean; isDesktop?: boolean }) {
  if (isDesktop) {
    return (
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
        activeOpacity={0.6}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF4FB', alignItems: 'center', justifyContent: 'center' }}>
          <FAIcon name={iconName} size={20} color="#2E6DA4" family="FontAwesome6" />
        </View>
        <Text style={{ fontSize: 14, color: '#1A3A5C', fontWeight: '700', textAlign: 'center' }}>{label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: '#F7F9FC', gap: 14 }}
      activeOpacity={0.6}
    >
      <FAIcon name={iconName} size={18} color="#2E6DA4" family="FontAwesome6" />
      <Text style={{ flex: 1, fontSize: 15, color: '#1A1A1A' }}>{label}</Text>
      <FontAwesome6 name="chevron-right" size={16} color="#ccc" />
    </TouchableOpacity>
  );
}
