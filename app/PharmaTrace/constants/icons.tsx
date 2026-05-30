import { FontAwesome, FontAwesome6 } from '@expo/vector-icons';
import React from 'react';
import { Text } from 'react-native';

// Composant réutilisable pour les icônes FontAwesome
export function FAIcon({
  name,
  size = 20,
  color = '#1A3A5C',
  family = 'FontAwesome6',
}: {
  name: string;
  size?: number;
  color?: string;
  family?: 'FontAwesome' | 'FontAwesome6';
}) {
  if (family === 'FontAwesome') {
    return <FontAwesome name={name as any} size={size} color={color} />;
  }
  return <FontAwesome6 name={name as any} size={size} color={color} />;
}

// Icônes pour les onglets de navigation
export const TabIcons = {
  dashboard: { name: 'chart-bar', family: 'FontAwesome6' },
  lots: { name: 'box', family: 'FontAwesome6' },
  stock: { name: 'box', family: 'FontAwesome6' },
  create: { name: 'plus', family: 'FontAwesome6' },
  transferts: { name: 'exchange', family: 'FontAwesome' },
  scanner: { name: 'magnifying-glass', family: 'FontAwesome6' },
  account: { name: 'user', family: 'FontAwesome6' },
  home: { name: 'gopuram', family: 'FontAwesome6' },
  alerts: { name: 'triangle-exclamation', family: 'FontAwesome6' },
  inbox: { name: 'inbox', family: 'FontAwesome6' },
};

// Icônes pour les icônes d'état
export const StatusIcons = {
  success: { name: 'check', family: 'FontAwesome6' },
  error: { name: 'xmark', family: 'FontAwesome6' },
  warning: { name: 'triangle-exclamation', family: 'FontAwesome6' },
  info: { name: 'circle-info', family: 'FontAwesome6' },
};

// Icônes pour les menus
export const MenuIcons = {
  notifications: { name: 'bell', family: 'FontAwesome6' },
  security: { name: 'lock', family: 'FontAwesome6' },
  settings: { name: 'gear', family: 'FontAwesome6' },
  help: { name: 'circle-question', family: 'FontAwesome6' },
  email: { name: 'envelope', family: 'FontAwesome6' },
  phone: { name: 'phone', family: 'FontAwesome6' },
  location: { name: 'map-pin', family: 'FontAwesome6' },
  id: { name: 'id-card', family: 'FontAwesome6' },
  factory: { name: 'industry', family: 'FontAwesome6' },
  pills: { name: 'pills', family: 'FontAwesome6' },
  search: { name: 'magnifying-glass', family: 'FontAwesome6' },
  arrow: { name: 'arrow-right', family: 'FontAwesome6' },
};

// Composant pour icône de menu (pour remplacer MenuItem avec emojis)
export function MenuItemIcon({
  icon,
  size = 20,
  color = '#1A3A5C',
}: {
  icon: string;
  size?: number;
  color?: string;
}) {
  // Si c'est un emoji, retourner directement le texte
  if (/\p{Emoji}/u.test(icon)) {
    return <Text style={{ fontSize: size }}>{icon}</Text>;
  }

  // Sinon, chercher dans MenuIcons
  const iconConfig = (MenuIcons as any)[icon] || { name: 'circle', family: 'FontAwesome6' };

  return (
    <FAIcon
      name={iconConfig.name}
      size={size}
      color={color}
      family={iconConfig.family}
    />
  );
}
