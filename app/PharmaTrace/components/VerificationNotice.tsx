import { Text, View } from 'react-native';
import type { VerificationSource } from '../lib/verification';

export default function VerificationNotice({ source, journalFailed }: {
  source?: VerificationSource;
  journalFailed: boolean;
}) {
  return (
    <View>
      <Text style={{ color: '#1A3A5C', backgroundColor: '#F0F4F8', padding: 12, borderRadius: 8, marginBottom: 12 }}>
        MVP expérimental : une correspondance décrit le registre, sans prouver l’authenticité physique de la boîte. Un QR peut être copié.
      </Text>
      {source === 'demo' && (
        <Text accessibilityRole="alert" style={{ color: '#1A3A5C', backgroundColor: '#FFF0C2', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          DÉMONSTRATION — Données simulées en mémoire, non persistantes. Aucune validation du backend réel.
        </Text>
      )}
      {journalFailed && (
        <Text accessibilityRole="alert" style={{ color: '#1A3A5C', backgroundColor: '#FFF0C2', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          Le résultat est conservé, mais le scan n’a pas pu être enregistré.
        </Text>
      )}
    </View>
  );
}
