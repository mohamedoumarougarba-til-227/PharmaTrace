import { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { FAIcon } from '../../constants/icons';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';

export default function AgentDPHDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_lots: 0, scans_24h: 0, alertes_critiques: 0, total_suspects: 0, pharmacies_actives: 0 });
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('supervision_stats').select('*').single();
      if (error) throw error;
      setStats({
        total_lots: data.total_lots ?? 0,
        scans_24h: data.scans_24h ?? 0,
        alertes_critiques: data.alertes_critiques ?? 0,
        total_suspects: data.total_suspects ?? 0,
        pharmacies_actives: data.pharmacies_actives ?? 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadStats(); }, []));

  if (loading) return (<View className="flex-1 items-center justify-center bg-bg"><ActivityIndicator color="#1A3A5C" size="large" /></View>);

  return (
    <ScrollView className="flex-1 bg-bg">
      <View 
        style={[
          { backgroundColor: "#8E44AD", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
          isDesktop && { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, marginHorizontal: 20, marginTop: 16 }
        ]}
      >
        <Text className="text-white/60 text-sm">Interface de supervision · rôle DPH</Text>
        <Text className="text-white font-black text-xl mt-1">Supervision du registre MVP</Text>
        <Text className="text-white/40 text-xs mt-1">Niger · Données du registre expérimental</Text>
      </View>

      <View style={{ padding: 20 }}>
        {/* KPIs */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <KPICard 
            label="Lots enregistrés" 
            value={String(stats.total_lots)} 
            color="#2E6DA4" 
            trend="Compteur du registre"
            isUp={true}
            svgPath="M 15 30 C 35 28, 55 12, 75 22 C 95 32, 105 8, 115 10"
            svgFillPath="M 15 30 C 35 28, 55 12, 75 22 C 95 32, 105 8, 115 10 L 115 40 L 15 40 Z"
            gradientId="dph-lots"
            endY={10}
            isDesktop={isDesktop}
          />
          <KPICard 
            label="Scans 24h" 
            value={String(stats.scans_24h)} 
            color="#27AE60" 
            trend={stats.scans_24h > 0 ? "Scans enregistrés" : "Aucun scan"}
            isUp={stats.scans_24h > 0}
            svgPath={stats.scans_24h > 0 ? "M 15 28 C 35 32, 55 24, 75 16 C 95 8, 105 14, 115 8" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35"}
            svgFillPath={stats.scans_24h > 0 ? "M 15 28 C 35 32, 55 24, 75 16 C 95 8, 105 14, 115 8 L 115 40 L 15 40 Z" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35 L 115 40 L 15 40 Z"}
            gradientId="dph-scans"
            endY={stats.scans_24h > 0 ? 8 : 35}
            isDesktop={isDesktop}
          />
          <KPICard 
            label="Alertes critiques" 
            value={String(stats.alertes_critiques)} 
            color="#C0392B" 
            trend={stats.alertes_critiques > 0 ? "Attention" : "Aucune alerte critique"}
            isUp={stats.alertes_critiques > 0}
            svgPath={stats.alertes_critiques > 0 ? "M 15 35 C 35 32, 55 28, 75 18 C 95 8, 105 10, 115 5" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35"}
            svgFillPath={stats.alertes_critiques > 0 ? "M 15 35 C 35 32, 55 28, 75 18 C 95 8, 105 10, 115 5 L 115 40 L 15 40 Z" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35 L 115 40 L 15 40 Z"}
            gradientId="dph-alertes"
            endY={stats.alertes_critiques > 0 ? 5 : 35}
            isDesktop={isDesktop}
          />
          <KPICard 
            label="Lots suspects" 
            value={String(stats.total_suspects)} 
            color="#E67E22" 
            trend={stats.total_suspects > 0 ? "Risque élevé" : "Aucun"}
            isUp={stats.total_suspects > 0}
            svgPath={stats.total_suspects > 0 ? "M 15 25 C 35 20, 55 35, 75 18 C 95 8, 105 14, 115 12" : "M 15 15 C 35 18, 55 22, 75 28 C 95 32, 105 35, 115 35"}
            svgFillPath={stats.total_suspects > 0 ? "M 15 25 C 35 20, 55 35, 75 18 C 95 8, 105 14, 115 12 L 115 40 L 15 40 Z" : "M 15 15 C 35 18, 55 22, 75 28 C 95 32, 105 35, 115 35 L 115 40 L 15 40 Z"}
            gradientId="dph-suspects"
            endY={stats.total_suspects > 0 ? 12 : 35}
            isDesktop={isDesktop}
          />
          <KPICard 
            label="Pharmacies actives" 
            value={String(stats.pharmacies_actives)} 
            color="#8E44AD" 
            trend={stats.pharmacies_actives > 0 ? "Actives" : "Aucune"}
            isUp={stats.pharmacies_actives > 0}
            svgPath={stats.pharmacies_actives > 0 ? "M 15 35 C 35 32, 55 28, 75 18 C 95 8, 105 10, 115 5" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35"}
            svgFillPath={stats.pharmacies_actives > 0 ? "M 15 35 C 35 32, 55 28, 75 18 C 95 8, 105 10, 115 5 L 115 40 L 15 40 Z" : "M 15 35 C 35 35, 55 35, 75 35 C 95 35, 105 35, 115 35 L 115 40 L 15 40 Z"}
            gradientId="dph-pharmacies"
            endY={stats.pharmacies_actives > 0 ? 5 : 35}
            isDesktop={isDesktop}
          />
        </View>

        {/* Desktop Columns */}
        <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 20 }}>
          {/* Section: Scan results (Left on desktop) */}
          <View style={{ flex: isDesktop ? 1.5 : 1 }}>
            <Text className="text-navy font-bold text-base mb-3">Lecture des indicateurs</Text>
            <Text className="text-muted text-sm">Les compteurs proviennent du registre. Une alerte n’établit pas une contrefaçon physique. La répartition détaillée des résultats reste à implémenter. Les petites courbes des cartes sont illustratives, sans série temporelle.</Text>
          </View>

          {/* Section: Warning/Alerts (Right on desktop) */}
          <View style={{ flex: isDesktop ? 1 : 1, justifyContent: "flex-start" }}>
            <Text className="text-navy font-bold text-base mb-3">Alertes & Actions</Text>
            <View className="bg-pharma-red/10 border-l-4 border-pharma-red rounded-r-xl p-4 mb-5">
              <View className="flex-row items-center gap-2 mb-1">
                <FAIcon name="triangle-exclamation" size={16} color="#C0392B" family="FontAwesome6" />
                <Text className="text-pharma-red font-bold text-sm">{stats.alertes_critiques} alertes critiques ouvertes</Text>
              </View>
              <Text className="text-muted text-xs mt-1">Nécessitent une attention immédiate →</Text>
            </View>
          </View>
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
  isDesktop: boolean;
}) {
  return (
    <View 
      style={[
        {
          flex: 1,
          borderRadius: 16,
          padding: 16,
          minWidth: isDesktop ? 160 : "44%",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: "#E6EEF8",
          height: 106,
          // @ts-ignore – web shadow
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }
      ]}
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

function StatRow({ label, icon, value, color, percent }: { label: string; icon: string; value: string; color: string; percent: number }) {
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <View className="flex-row items-center gap-2">
          <FAIcon name={icon} size={14} color={color} family="FontAwesome6" />
          <Text className="text-text text-sm font-semibold">{label}</Text>
        </View>
        <Text className="text-muted text-sm">{value} ({percent}%)</Text>
      </View>
      <View className="h-2 bg-bg rounded-full overflow-hidden">
        <View className="h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}
