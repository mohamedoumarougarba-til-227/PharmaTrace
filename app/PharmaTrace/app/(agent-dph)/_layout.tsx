import { Tabs, router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, TouchableOpacity, useWindowDimensions, Platform } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { FAIcon } from "../../constants/icons";
import { supabase } from "../../lib/supabase";
import { getBusinessAccess } from "../../lib/businessRole";
import ConfirmModal from "../../components/ConfirmModal";

// ─── Types ──────────────────────────────────────────────────────────────────
type NavItem = {
  route: string;
  label: string;
  icon: string;
  matchPaths: string[];
};

const NAV_ITEMS: NavItem[] = [
  { route: "/(agent-dph)/", label: "Accueil", icon: "gopuram", matchPaths: ["/", "/index"] },
  { route: "/(agent-dph)/alertes", label: "Alertes", icon: "triangle-exclamation", matchPaths: ["/alertes"] },
  { route: "/(agent-dph)/lots", label: "Lots", icon: "box", matchPaths: ["/lots"] },
];

// ─── Logout Helper for Mobile/Header ──────────────────────────────────────────
function LogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginRight: 16 }}>
      <FontAwesome6 name="arrow-right-from-bracket" size={20} color="rgba(255,255,255,0.85)" />
    </TouchableOpacity>
  );
}

// ─── Sidebar Nav Item ───────────────────────────────────────────────────────
function SidebarItem({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const bgColor = active
    ? "rgba(255,255,255,0.12)"
    : hovered
    ? "rgba(255,255,255,0.06)"
    : "transparent";

  const iconColor = active ? "#9B59B6" : hovered ? "#D2B4DE" : "rgba(255,255,255,0.55)";
  const textColor = active ? "#FFFFFF" : hovered ? "#EBDEF0" : "rgba(255,255,255,0.55)";

  const webHoverProps =
    Platform.OS === "web"
      ? {
          // @ts-ignore – web-only mouse events
          onMouseEnter: () => {
            setHovered(true);
            if (collapsed) setShowTooltip(true);
          },
          onMouseLeave: () => {
            setHovered(false);
            setShowTooltip(false);
          },
        }
      : {};

  return (
    <TouchableOpacity
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 11,
        paddingHorizontal: collapsed ? 0 : 20,
        justifyContent: collapsed ? "center" : "flex-start",
        backgroundColor: bgColor,
        borderLeftWidth: active ? 3 : 0,
        borderLeftColor: active ? "#9B59B6" : "transparent",
        marginLeft: active ? 0 : 3,
        marginBottom: 2,
        position: "relative",
      }}
      {...webHoverProps}
    >
      <FAIcon name={item.icon} size={18} color={iconColor} family="FontAwesome6" />
      {!collapsed && (
        <Text
          style={{
            color: textColor,
            fontWeight: active ? "700" : "500",
            fontSize: 13,
            marginLeft: 14,
            letterSpacing: 0.2,
          }}
        >
          {item.label}
        </Text>
      )}
      {/* Tooltip when collapsed */}
      {collapsed && showTooltip && (
        <View
          style={{
            position: "absolute",
            left: 56,
            top: 8,
            backgroundColor: "#2C133C",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
            zIndex: 999,
            // @ts-ignore – web shadow
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
            {item.label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Sidebar Component ──────────────────────────────────────────────────────
function Sidebar({
  collapsed,
  onToggle,
  onPressLogout,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onPressLogout: () => void;
}) {
  const pathname = usePathname();

  const isActive = (paths: string[]) => {
    return paths.some((p) => {
      if (p === "/" || p === "/index") {
        return pathname === "/" || pathname === "/index" || pathname === "/(agent-dph)" || pathname === "/(agent-dph)/";
      }
      return pathname.endsWith(p);
    });
  };

  const [collapseHovered, setCollapseHovered] = useState(false);

  return (
    <View
      style={{
        width: collapsed ? 56 : 220,
        backgroundColor: "#2C133C",
        paddingTop: 20,
        paddingBottom: 16,
        justifyContent: "space-between",
        // @ts-ignore – web transition
        transition: "width 0.2s ease",
      }}
    >
      {/* ── Branding ── */}
      <View>
        <View
          style={{
            paddingHorizontal: collapsed ? 8 : 20,
            marginBottom: 28,
            alignItems: collapsed ? "center" : "flex-start",
          }}
        >
          {collapsed ? (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#9B59B6", fontWeight: "900", fontSize: 15 }}>PT</Text>
            </View>
          ) : (
            <>
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 17, letterSpacing: 0.5 }}>
                PharmaTrace
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 3, fontWeight: "500" }}>
                Surveillance Nationale
              </Text>
            </>
          )}
        </View>

        {/* ── Séparateur ── */}
        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: collapsed ? 8 : 16, marginBottom: 12 }} />

        {/* ── Navigation ── */}
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.route} item={item} active={isActive(item.matchPaths)} collapsed={collapsed} />
        ))}
      </View>

      {/* ── Bottom Section (Logout & Collapse Toggle) ── */}
      <View style={{ gap: 4 }}>
        {/* Logout Button */}
        <TouchableOpacity
          onPress={onPressLogout}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 11,
            paddingHorizontal: collapsed ? 0 : 20,
            justifyContent: collapsed ? "center" : "flex-start",
            backgroundColor: "transparent",
            marginLeft: 3,
            marginBottom: 6,
          }}
        >
          <FAIcon name="arrow-right-from-bracket" size={16} color="#E74C3C" family="FontAwesome6" />
          {!collapsed && (
            <Text
              style={{
                color: "#E74C3C",
                fontWeight: "600",
                fontSize: 13,
                marginLeft: 14,
                letterSpacing: 0.2,
              }}
            >
              Se déconnecter
            </Text>
          )}
        </TouchableOpacity>

        {/* ── Collapse/Expand Toggle ── */}
        <TouchableOpacity
          onPress={onToggle}
          activeOpacity={0.7}
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 10,
            marginHorizontal: collapsed ? 8 : 16,
            borderRadius: 8,
            backgroundColor: collapseHovered ? "rgba(255,255,255,0.08)" : "transparent",
          }}
          {...(Platform.OS === "web"
            ? {
                // @ts-ignore
                onMouseEnter: () => setCollapseHovered(true),
                onMouseLeave: () => setCollapseHovered(false),
              }
            : {})}
        >
          <FAIcon
            name={collapsed ? "angles-right" : "angles-left"}
            size={12}
            color="rgba(255,255,255,0.35)"
            family="FontAwesome6"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Layout ────────────────────────────────────────────────────────────
export default function AgentDPHLayout() {
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const access = await getBusinessAccess();
        if (access.status !== 'AUTHORIZED' || access.role !== 'agent_dph') {
          router.replace("/(auth)/login");
        } else {
          setLoading(false);
        }
      } catch (err) {
        router.replace("/(auth)/login");
      }
    };

    checkAccess();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#8E44AD" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // ── Tabs Configuration ──
  const tabsElement = (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: isDesktop ? "#FFFFFF" : "#8E44AD" },
        headerTintColor: isDesktop ? "#2C133C" : "#fff",
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerShadowVisible: isDesktop,
        headerRight: isDesktop ? undefined : () => <LogoutButton onPress={() => setShowLogoutModal(true)} />,
        tabBarStyle: isDesktop
          ? { display: "none" as const }
          : {
              backgroundColor: "#fff",
              borderTopColor: "#DCE6F0",
              height: 64,
            },
        tabBarActiveTintColor: "#8E44AD",
        tabBarInactiveTintColor: "#999",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Surveillance nationale",
          tabBarLabel: "Accueil",
          tabBarIcon: ({ color }) => <FAIcon name="gopuram" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="alertes"
        options={{
          title: "Alertes",
          tabBarLabel: "Alertes",
          tabBarIcon: ({ color }) => <FAIcon name="triangle-exclamation" size={20} color={color} family="FontAwesome6" />,
        }}
      />
      <Tabs.Screen
        name="lots"
        options={{
          title: "Tous les lots",
          tabBarLabel: "Lots",
          tabBarIcon: ({ color }) => <FAIcon name="box" size={20} color={color} family="FontAwesome6" />,
        }}
      />
    </Tabs>
  );

  // ── Desktop: Sidebar + Content ──
  return (
    <View style={{ flex: 1 }}>
      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed((c) => !c)} 
            onPressLogout={() => setShowLogoutModal(true)} 
          />
          <View style={{ flex: 1 }}>{tabsElement}</View>
        </View>
      ) : (
        tabsElement
      )}
      <ConfirmModal
        visible={showLogoutModal}
        title="Se déconnecter"
        message="Voulez-vous vraiment vous déconnecter ?"
        confirmText="Déconnexion"
        cancelText="Annuler"
        confirmColor="#E74C3C"
        icon="arrow-right-from-bracket"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </View>
  );
}
