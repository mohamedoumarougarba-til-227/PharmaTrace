/**
 * Configuration globale de l'application PharmaTrace.
 * Centralise les URLs et autres paramètres de configuration pour faciliter le déploiement.
 */

// URL de base utilisée pour la vérification des lots via scan de code QR.
// En développement, vous pouvez définir la variable d'environnement EXPO_PUBLIC_VERIFICATION_BASE_URL
// dans votre fichier .env pour utiliser par exemple un lien Vercel de pré-production ou une URL locale.
export const VERIFICATION_BASE_URL = 
  process.env.EXPO_PUBLIC_VERIFICATION_BASE_URL || 
  'https://pharmatrace.vercel.app/verify';
