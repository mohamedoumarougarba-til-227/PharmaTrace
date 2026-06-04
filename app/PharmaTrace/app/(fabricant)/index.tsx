import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';

type LotSummary = {
  id: string;
  nom_medicament: string;
  numero_lot: string;
  dosage: string | null;
  statut_actuel: string;
};

export default function FabricantDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ total: 0, stock: 0, transit: 0, pharmacie: 0 });
  const [lots, setLots] = useState<LotSummary[]>([]);
  const [manufacturerName, setManufacturerName] = useState('NIPHAR (La Nigérienne)');
  const [manufacturerCity, setManufacturerCity] = useState('Niamey');

  const loadDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLots([]);
        setKpis({ total: 0, stock: 0, transit: 0, pharmacie: 0 });
        return;
      }

      const [profileRes, lotsRes, totalRes, stockRes, transitRes, pharmacieRes] = await Promise.all([
        supabase
          .from('utilisateurs')
          .select('nom_entite, ville')
          .eq('id', session.user.id)
          .single(),
        supabase
          .from('lots_medicaments')
          .select('id, nom_medicament, numero_lot, dosage, statut_actuel')
          .eq('fabricant_id', session.user.id)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('lots_medicaments')
          .select('id', { count: 'exact', head: true })
          .eq('fabricant_id', session.user.id)
          .eq('is_archived', false),
        supabase
          .from('lots_medicaments')
          .select('id', { count: 'exact', head: true })
          .eq('fabricant_id', session.user.id)
          .eq('statut_actuel', 'en_stock_fabricant')
          .eq('is_archived', false)
          .gt('quantite_actuelle', 0),
        supabase
          .from('transferts')
          .select('id', { count: 'exact', head: true })
          .eq('expediteur_id', session.user.id)
          .eq('statut', 'en_attente'),
        supabase
          .from('transferts')
          .select('id', { count: 'exact', head: true })
          .eq('expediteur_id', session.user.id)
          .eq('statut', 'receptionne'),
      ]);

      if (profileRes.data) {
        setManufacturerName(profileRes.data.nom_entite);
        if (profileRes.data.ville) {
          setManufacturerCity(profileRes.data.ville);
        }
      }

      setLots((lotsRes.data ?? []) as LotSummary[]);
      setKpis({
        total: totalRes.count ?? 0,
        stock: stockRes.count ?? 0,
        transit: transitRes.count ?? 0,
        pharmacie: pharmacieRes.count ?? 0,
      });
    } catch (error) {
      console.error(error);
      setLots([]);
      setKpis({ total: 0, stock: 0, transit: 0, pharmacie: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#1A3A5C" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3A5C" />}
    >
      {/* Header coloré dynamique */}
      <View className="px-5 pt-6 pb-6 bg-navy">
        <Text className="text-white/60 text-xs font-bold uppercase tracking-wider">Bienvenue,</Text>
        <Text className="text-white font-black text-xl mt-1">{manufacturerName}</Text>
        <Text className="text-white/40 text-xs mt-1">Fabricant agréé · {manufacturerCity}</Text>
      </View>

      <View className="p-5">
        {/* KPI Cards avec micro-graphiques premium */}
        <Text className="text-navy font-bold text-base mb-3">Vue d'ensemble</Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          <KPICard 
            label="Total lots"   
            value={String(kpis.total)} 
            color="#2E6DA4" 
            trend="+12% ce mois"
            isUp={true}
            svgPath="M 15 30 C 35 28, 55 12, 75 22 C 95 32, 105 8, 115 10"
            svgFillPath="M 15 30 C 35 28, 55 12, 75 22 C 95 32, 105 8, 115 10 L 115 40 L 15 40 Z"
            gradientId="grad-total"
            endY={10}
          />
          <KPICard 
            label="En stock"     
            value={String(kpis.stock)} 
            color="#27AE60" 
            trend="+5% cette sem."
            isUp={true}
            svgPath="M 15 28 C 35 32, 55 24, 75 16 C 95 8, 105 14, 115 8"
            svgFillPath="M 15 28 C 35 32, 55 24, 75 16 C 95 8, 105 14, 115 8 L 115 40 L 15 40 Z"
            gradientId="grad-stock"
            endY={8}
          />
          <KPICard 
            label="En transit"   
            value={String(kpis.transit)} 
            color="#E67E22" 
            trend={kpis.transit > 0 ? "En livraison" : "Aucun flux"}
            isUp={kpis.transit > 0}
            svgPath={kpis.transit > 0 ? "M 15 25 C 35 20, 55 35, 75 18 C 95 8, 105 14, 115 12" : "M 15 15 C 35 18, 55 22, 75 28 C 95 32, 105 35, 115 35"}
            svgFillPath={kpis.transit > 0 ? "M 15 25 C 35 20, 55 35, 75 18 C 95 8, 105 14, 115 12 L 115 40 L 15 40 Z" : "M 15 15 C 35 18, 55 22, 75 28 C 95 32, 105 35, 115 35 L 115 40 L 15 40 Z"}
            gradientId="grad-transit"
            endY={kpis.transit > 0 ? 12 : 35}
          />
          <KPICard 
            label="En pharmacie" 
            value={String(kpis.pharmacie)} 
            color="#8E44AD" 
            trend={kpis.pharmacie > 0 ? "+18% cumulé" : "Aucun lot reçu"}
            isUp={kpis.pharmacie > 0}
            svgPath={kpis.pharmacie > 0 ? "M 15 35 C 35 32, 55 28, 75 18 C 95 8, 105 10, 115 5" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35"}
            svgFillPath={kpis.pharmacie > 0 ? "M 15 35 C 35 32, 55 28, 75 18 C 95 8, 105 10, 115 5 L 115 40 L 15 40 Z" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35 L 115 40 L 15 40 Z"}
            gradientId="grad-pharma"
            endY={kpis.pharmacie > 0 ? 5 : 35}
          />
        </View>

        {/* Action principale */}
        <Link href="/(fabricant)/nouveau-lot" asChild>
          <TouchableOpacity className="w-full h-14 bg-navy rounded-xl items-center justify-center mb-3 shadow-sm active:opacity-95">
            <Text className="text-white font-bold text-base">+ Enregistrer un nouveau lot</Text>
          </TouchableOpacity>
        </Link>

        {/* Derniers lots */}
        <Text className="text-navy font-bold text-base mt-4 mb-3">Mes 5 derniers lots</Text>
        {lots.map(lot => (
          <TouchableOpacity
            key={lot.id}
            className="bg-white rounded-xl px-4 py-4 mb-2 shadow-sm flex-row justify-between items-center border border-[#E6EEF8] active:bg-[#F3F8FF]"
            onPress={() => router.push({ pathname: '/(fabricant)/[id]', params: { id: lot.id } })}
          >
            <View className="flex-1">
              <Text className="text-navy font-black text-sm">{lot.nom_medicament}</Text>
              <Text className="text-muted text-xs mt-1">{lot.numero_lot} · {lot.dosage ?? '—'}</Text>
            </View>
            <StatusBadge statut={lot.statut_actuel} />
          </TouchableOpacity>
        ))}

        {lots.length === 0 && (
          <View className="bg-white rounded-xl p-4 mb-2 border border-blue-light">
            <Text className="text-navy font-semibold text-sm">Aucun lot pour le moment</Text>
            <Text className="text-muted text-xs mt-1">Créez votre premier lot pour le voir apparaître ici.</Text>
          </View>
        )}

        <Link href="/(fabricant)/lots" asChild>
          <TouchableOpacity className="mt-2 items-center py-3 active:opacity-80">
            <Text className="text-blue text-sm font-semibold">Voir tous mes lots →</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

// ─── Composants locaux ────────────────────────────────────────────────────────

function KPICard({ 
  label, 
  value, 
  color, 
  trend, 
  isUp, 
  svgPath, 
  svgFillPath, 
  gradientId,
  endY
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
}) {
  return (
    <View className="flex-1 rounded-2xl p-4 min-w-[44%] relative overflow-hidden bg-white border border-[#E6EEF8] shadow-sm" style={{ height: 106 }}>
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

function StatusBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    en_stock_fabricant: { label: 'En stock',     bg: '#EEF4FB', text: '#2E6DA4' },
    en_transit:         { label: 'En transit',   bg: '#FEF4E0', text: '#E67E22' },
    en_pharmacie:       { label: 'En pharmacie', bg: '#E8F8EC', text: '#27AE60' },
    archive:            { label: 'Archivé',      bg: '#F0F0F0', text: '#999' },
  };
  const s = map[statut] ?? map['archive'];
  return (
    <View className="px-3 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
      <Text className="text-[10px] font-extrabold uppercase" style={{ color: s.text }}>{s.label}</Text>
    </View>
  );
}
