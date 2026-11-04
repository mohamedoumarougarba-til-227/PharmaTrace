import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DemoBanner() {
  const pathname = usePathname();
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('pt_demo_mode').then(value => {
      if (active) setDemo(value === 'true');
    }).catch(() => { if (active) setDemo(false); });
    return () => { active = false; };
  }, [pathname]);
  return demo ? (
    <Text accessibilityRole="alert" style={{ padding: 10, backgroundColor: '#FFF0C2', color: '#1A3A5C', textAlign: 'center' }}>
      DÉMONSTRATION — Données fictives en mémoire. Écritures métier désactivées ; aucune validation du service réel.
    </Text>
  ) : null;
}
