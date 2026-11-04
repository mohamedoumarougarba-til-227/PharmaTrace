# Installation et développement

## Démo locale

Git, Node.js 22 LTS, npm et navigateur. Aucun Docker/PostgreSQL local requis. Se placer dans `app/PharmaTrace` ; le package racine historique ne démarre pas l’application.

```sh
npm ci
cp .env.example .env
# PowerShell : Copy-Item .env.example .env
npm run web
```

Conserver les valeurs fictives, puis choisir un rôle Démo. Données en mémoire, écritures métier désactivées ; code connu `FAB-2026-049`. Effacer le stockage du site ou revenir à la connexion réelle pour sortir de la simulation. Aucune donnée personnelle.

## Service réel isolé

Créer votre environnement Supabase personnel vide, Auth compris ; jamais l’URL, les comptes ou sessions du MVP du propriétaire. Suivre [database.md](database.md). `.env` contient seulement l’URL de ce projet et sa clé publique legacy `anon` compatible avec le client verrouillé. Aucun secret/service_role ou mot de passe DB dans `EXPO_PUBLIC_*`.

```sh
npm test
npx tsc --noEmit
npm run check:public
npm run build:web
```

`dist/` est l’export statique. Servir les fichiers puis rediriger vers `index.html` si aucun fichier ne correspond. La vitrine se sert séparément depuis `landing/`.

## Mobile

SDK Expo 54 / React Native 0.81 : vérifier la compatibilité exacte d’Expo Go ou utiliser un development build adapté. Ne pas supposer que l’Expo Go courant accepte encore SDK 54. `npm start` prépare Metro ; `npm run build:android` nécessite EAS, votre propre compte/projet et votre signature. Ne pas publier un fork sous les identifiants EAS/paquet TrustGrid. Caméra et permissions demandent un test physique distinct. Ancien APK ≠ client web corrigé.

Les shims Metro et le gel Supabase sont décrits dans [architecture](architecture.md) et [triage](dependency-triage.md), sans retrait aveugle dans ce sprint.
