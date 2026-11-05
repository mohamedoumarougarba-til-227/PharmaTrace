import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';

export default function PharmacieDashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ transferts_attente: 0, lots_stock: 0, scans_today: 0, alertes: 0 });

  const loadKPIs = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // transferts en attente pour cette pharmacie
      const transfertsRes = await supabase
        .from('transferts')
        .select('id', { count: 'exact' })
        .eq('destinataire_id', session.user.id)
        .eq('statut', 'en_attente');

      // lots en stock pour cette pharmacie (transferts reçus)
      const lotsRes = await supabase
        .from('transferts')
        .select('lot_id(date_expiration)')
        .eq('destinataire_id', session.user.id)
        .eq('statut', 'receptionne');

      const todayStr = new Date().toISOString().split('T')[0];
      const activeLotsCount = (lotsRes.data ?? []).filter((t: any) => {
        return t.lot_id?.date_expiration ? t.lot_id.date_expiration >= todayStr : true;
      }).length;

      // scans aujourd'hui par ce pharmacien
      const scansRes = await supabase
        .from('historique_scans')
        .select('id', { count: 'exact' })
        .eq('scanneur_id', session.user.id)
        .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());

      // alertes ouvertes concernant la même ville du profil
      const profile = await supabase.from('utilisateurs').select('ville').eq('id', session.user.id).single();
      const ville = profile.data?.ville;
      const alertesRes = await supabase
        .from('alertes')
        .select('id', { count: 'exact' })
        .eq('statut', 'ouverte')
        .eq('ville_concernee', ville ?? undefined);

      setKpis({
        transferts_attente: transfertsRes.count ?? 0,
        lots_stock: activeLotsCount,
        scans_today: scansRes.count ?? 0,
        alertes: alertesRes.count ?? 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadKPIs();
    }, []),
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#27AE60" size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg">
      {/* Header */}
      <View 
        className="bg-pharma-green"
        style={isDesktop ? { paddingHorizontal: 24, paddingVertical: 20, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 } : { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 }}
      >
        <Text className="text-white/60 text-sm">Bienvenue,</Text>
        <Text className="text-white font-black text-xl mt-1">Espace pharmacie</Text>
        <Text className="text-white/40 text-xs mt-1">Compte pharmacie</Text>
      </View>

      <Text className="text-muted text-xs mb-3">Compteurs du registre ; courbes illustratives sans historique mesuré.</Text>
        <View style={isDesktop ? { padding: 24 } : { padding: 20 }}>
        {/* KPIs */}
        <View style={isDesktop ? { flexDirection: 'row', gap: 12, marginBottom: 20 } : { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <KPICard 
            label="Transferts en cours" 
            value={String(kpis.transferts_attente)} 
            color="#E67E22" 
            trend={kpis.transferts_attente > 0 ? "Lots entrants" : "Aucun flux"}
            isUp={kpis.transferts_attente > 0}
            svgPath={kpis.transferts_attente > 0 ? "M 15 25 C 35 20, 55 35, 75 18 C 95 8, 105 14, 115 12" : "M 15 15 C 35 18, 55 22, 75 28 C 95 32, 105 35, 115 35"}
            svgFillPath={kpis.transferts_attente > 0 ? "M 15 25 C 35 20, 55 35, 75 18 C 95 8, 105 14, 115 12 L 115 40 L 15 40 Z" : "M 15 15 C 35 18, 55 22, 75 28 C 95 32, 105 35, 115 35 L 115 40 L 15 40 Z"}
            gradientId="pharma-transit"
            endY={kpis.transferts_attente > 0 ? 12 : 35}
            isDesktop={isDesktop}
          />
          <KPICard 
            label="Lots en stock" 
            value={String(kpis.lots_stock)} 
            color="#27AE60" 
            trend={kpis.lots_stock > 0 ? "Lots consultables" : "Stock vide"}
            isUp={kpis.lots_stock > 0}
            svgPath={kpis.lots_stock > 0 ? "M 15 28 C 35 32, 55 24, 75 16 C 95 8, 105 14, 115 8" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35"}
            svgFillPath={kpis.lots_stock > 0 ? "M 15 28 C 35 32, 55 24, 75 16 C 95 8, 105 14, 115 8 L 115 40 L 15 40 Z" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35 L 115 40 L 15 40 Z"}
            gradientId="pharma-stock"
            endY={kpis.lots_stock > 0 ? 8 : 35}
            isDesktop={isDesktop}
          />
          <KPICard 
            label="Scans aujourd'hui" 
            value={String(kpis.scans_today)} 
            color="#2E6DA4" 
            trend={kpis.scans_today > 0 ? "Scans enregistrés" : "Aucun scan"}
            isUp={kpis.scans_today > 0}
            svgPath={kpis.scans_today > 0 ? "M 15 30 C 35 28, 55 12, 75 22 C 95 32, 105 8, 115 10" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35"}
            svgFillPath={kpis.scans_today > 0 ? "M 15 30 C 35 28, 55 12, 75 22 C 95 32, 105 8, 115 10 L 115 40 L 15 40 Z" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35 L 115 40 L 15 40 Z"}
            gradientId="pharma-scans"
            endY={kpis.scans_today > 0 ? 10 : 35}
            isDesktop={isDesktop}
          />
          <KPICard 
            label="Alertes actives" 
            value={String(kpis.alertes)} 
            color="#C0392B" 
            trend={kpis.alertes > 0 ? "Risque critique" : "Aucune alerte affichée"}
            isUp={kpis.alertes > 0}
            svgPath={kpis.alertes > 0 ? "M 15 35 C 35 32, 55 28, 75 18 C 95 8, 105 10, 115 5" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35"}
            svgFillPath={kpis.alertes > 0 ? "M 15 35 C 35 32, 55 28, 75 18 C 95 8, 105 10, 115 5 L 115 40 L 15 40 Z" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35 L 115 40 L 15 40 Z"}
            gradientId="pharma-alertes"
            endY={kpis.alertes > 0 ? 5 : 35}
            isDesktop={isDesktop}
          />
        </View>

        {/* Alerte transferts en attente */}
        {kpis.transferts_attente > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(pharmacie)/transferts')}
            className="bg-pharma-orange/10 border-l-4 border-pharma-orange rounded-r-xl p-4 mb-5"
          >
            <View className="flex-row items-center gap-2 mb-1">
              <FAIcon name="bolt" size={16} color="#E67E22" family="FontAwesome6" />
              <Text className="text-pharma-orange font-bold text-sm">
                {kpis.transferts_attente} lot{kpis.transferts_attente > 1 ? 's attendent' : ' attend'} votre réception
              </Text>
            </View>
            <Text className="text-muted text-xs mt-1">Appuyez pour voir les transferts entrants →</Text>
          </TouchableOpacity>
        )}

        {/* Actions rapides */}
        <Text className="text-navy font-bold text-base mb-3">Actions rapides</Text>
        
        <View style={isDesktop ? { flexDirection: 'row', gap: 16 } : undefined}>
          <TouchableOpacity
            onPress={() => router.push('/(pharmacie)/verifier')}
            className="bg-pharma-green rounded-xl items-center justify-center flex-row gap-2"
            style={isDesktop ? { flex: 1, height: 56 } : { width: '100%', height: 56, marginBottom: 12 }}
          >
            <FAIcon name="magnifying-glass" size={16} color="#fff" family="FontAwesome6" />
            <Text className="text-white font-bold text-base">Vérifier un médicament</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(pharmacie)/stock')}
            className="bg-white border border-blue-light rounded-xl items-center justify-center flex-row gap-2"
            style={isDesktop ? { flex: 1, height: 56 } : { width: '100%', height: 56 }}
          >
            <FAIcon name="box" size={16} color="#1A3A5C" family="FontAwesome6" />
            <Text className="text-navy font-semibold text-base">Voir mon stock</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function KPICard({ 
  label, 
  value, 
  color, 
  trend, 
  isUp, 
  svgPath, 
  svgFillPath, 
  gradientId,
  endY,
  isDesktop
}: { 
  label: string; 
  value: string; 
  color: string; 
  trend: string; 
  isUp: boolean;
  svgPath: string;
  svgFillPath: string;
  gradientId: string;
  endY: number;
  isDesktop?: boolean;
}) {
  return (
    <View 
      className="flex-1 rounded-2xl p-4 relative overflow-hidden bg-white border border-[#E6EEF8] shadow-sm" 
      style={isDesktop ? { height: 106, minWidth: 160 } : { height: 106, minWidth: '44%' }}
    >
      {/* Label & Valeur */}
      <View className="z-10 justify-between h-full">
        <View>
          <Text className="text-muted text-[10px] font-bold uppercase tracking-wider">{label}</Text>
          <Text className="font-black text-3xl mt-0.5" style={{ color }}>{value}</Text>
        </View>
        
        {/* Trend Indicator */}
        <View className="flex-row items-center gap-1">
          <FAIcon 
            name={isUp ? 'arrow-trend-up' : 'arrow-trend-down'} 
            size={9} 
            color={isUp ? '#27AE60' : '#E67E22'} 
            family="FontAwesome6" 
          />
          <Text className={`text-[9px] font-extrabold ${isUp ? 'text-green-600' : 'text-pharma-orange'}`}>
            {trend}
          </Text>
        </View>
      </View>
      
      {/* Background Sparkline SVG */}
      <View className="absolute bottom-0 right-0 w-24 h-12 opacity-80 pointer-events-none">
        <Svg width="100%" height="100%" viewBox="0 0 120 40">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
          
          {/* Y-Axis Line */}
          <Line x1="15" y1="5" x2="15" y2="35" stroke="#E6EEF8" strokeWidth="1" />
          
          {/* Horizontal Gridlines */}
          <Line x1="15" y1="10" x2="115" y2="10" stroke="#F1F5FA" strokeWidth="0.8" strokeDasharray="2,2" />
          <Line x1="15" y1="22" x2="115" y2="22" stroke="#F1F5FA" strokeWidth="0.8" strokeDasharray="2,2" />
          <Line x1="15" y1="34" x2="115" y2="34" stroke="#F1F5FA" strokeWidth="0.8" strokeDasharray="2,2" />
          
          {/* Y-Axis Tick Marks */}
          <Line x1="11" y1="10" x2="15" y2="10" stroke="#BACAD6" strokeWidth="1" />
          <Line x1="11" y1="22" x2="15" y2="22" stroke="#BACAD6" strokeWidth="1" />
          <Line x1="11" y1="34" x2="15" y2="34" stroke="#BACAD6" strokeWidth="1" />
 
          {/* Remplissage de dégradé sous la courbe */}
          <Path d={svgFillPath} fill={`url(#${gradientId})`} />
          {/* Ligne de tendance */}
          <Path d={svgPath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
          
          {/* Glowing dot at endpoint */}
          <Circle cx="115" cy={endY} r="4" fill={color} opacity="0.3" />
          <Circle cx="115" cy={endY} r="2" fill={color} />
        </Svg>
      </View>
    </View>
  );
}
