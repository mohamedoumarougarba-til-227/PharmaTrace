import { useState, type KeyboardEvent } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';

const FEEDBACK_URL = 'https://tally.so/r/aOeY72';

export default function FeedbackBar() {
  const [openFailed, setOpenFailed] = useState(false);
  const [focused, setFocused] = useState(false);

  const openFeedback = async () => {
    try {
      await Linking.openURL(FEEDBACK_URL);
      setOpenFailed(false);
    } catch {
      setOpenFailed(true);
    }
  };

  // React Native Web's Pressable does not activate a role="link" div on Enter.
  // Keep this DOM event web-only; native activation still uses onPress.
  const webKeyboardProps = Platform.OS === 'web' ? {
    onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        event.preventDefault();
        void openFeedback();
      }
    },
  } : {};

  return (
    <View style={{ backgroundColor: '#EEF4FA', flexShrink: 0 }}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Donner un avis / Signaler un problème — formulaire externe Tally"
        accessibilityHint="Ouvre le navigateur. Ne partagez aucune donnée sensible dans le formulaire."
        onPress={openFeedback}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...webKeyboardProps}
        style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: focused ? '#153E63' : 'transparent' }}
      >
        <Text style={{ color: '#153E63', fontSize: 14, fontWeight: '600', textAlign: 'center', textDecorationLine: 'underline' }}>
          Donner un avis / Signaler un problème
        </Text>
      </Pressable>
      {openFailed ? (
        <Text
          accessibilityLiveRegion="polite"
          selectable
          style={{ color: '#8C2424', paddingHorizontal: 16, paddingBottom: 10, textAlign: 'center' }}
        >
          Impossible d’ouvrir le formulaire. Réessayez ou ouvrez https://tally.so/r/aOeY72 dans votre navigateur.
        </Text>
      ) : null}
    </View>
  );
}
