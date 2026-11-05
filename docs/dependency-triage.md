# Dépendances — triage P16 daté du 3 novembre 2026

Lockfiles inchangés ; aucune mise à jour de dépendance, aucun `npm audit fix --force`. Le comptage actuel diffère de l’audit historique parce que les avis évoluent. `npm audit --json` : **52 entrées de paquets**, 2 critiques, 15 élevées, 31 modérées, 4 faibles. `--omit=dev` donne les mêmes 52 : Expo et son CLI sont dans dependencies, donc ce filtre n’identifie pas à lui seul le runtime web. Le package racine dotenv n’est pas le runtime de l’application.

## Exposition constatée

Inspection des sources de la sourcemap de l’entrée web (1 435 modules). La présence indique du code inclus, pas l’activation de toutes les fonctions vulnérables. L’absence concerne cet export web ; elle ne démontre pas l’absence dans un build natif futur.

| Chemin | Gravité npm | Exposition / priorité |
| --- | --- | --- |
| Expo CLI → shell-quote 1.8.4 | Critique | Absent de l’entrée web ; injection quote() si données non fiables utilisées pour fabriquer une commande shell, risque outillage. Ne pas exécuter templates/commandes non fiables ; mise à jour compatible à planifier. |
| Expo CLI → tar 7.5.16 | Critique | Absent de l’entrée web ; extraction d’archives dans l’outillage, pas un endpoint du serveur statique. Mettre à jour la chaîne compatible ; pas d’extraction d’archives non fiables. |
| plist / outils Expo → xmldom, node-forge, compression, image-size, yaml | Élevée selon paquet | Paquets absents de cette entrée web ; conditions spécifiques XML/certificat/archive ou outils dev. Ne pas exposer Metro sur Internet, ne pas traiter de projets/templates non fiables. Ce n’est pas « sans risque ». |
| expo-router / navigation → query-string → decode-uri-component 0.2.2 | Élevée propagée | Inclus, décodage de paramètres/URL : risque DoS client sur entrées malformées volumineuses à prioriser. Pas de preuve d’accès DB ou de corruption de stock ; aucune exploitation sur le MVP testée ici. |
| navigation → nanoid 3.3.12 | Élevée | Inclus ; avis sur tailles négatives/zéro contrôlées par attaquant. Les appels repérés dans le code navigation utilisent nanoid() sans taille externe ; ce constat ne certifie pas tout le graphe. |
| Supabase auth-js 2.64.4 / supabase-js 2.45.0 | Faible | Inclus, avis routage d’entrées malformées. Auth/RLS métier testées en phase 1 ; cela ne supprime pas l’avis de la librairie. Upgrade coordonné avec shims et web/native. |

Un module utilitaire de `@expo/cli` apparaît dans l’entrée web ; ne pas assimiler l’absence de tar/shell-quote à l’absence de tout code CLI. La release source expérimentale documente ces risques ; elle n’est pas annoncée comme un logiciel d’officine de production. Aucun risque nouveau de corruption métier n’a été démontré qui justifierait de rouvrir le gate clos.

## Tâche de suivi bornée

Créer une issue P16 prioritaire pour remonter la chaîne Expo Router/décodage et les correctifs compatibles tar/shell-quote, puis 95 tests, typecheck/export, revue des sourcemaps et essais natifs. Ne pas accepter le downgrade Expo ou upgrade majeur proposé automatiquement par npm sans étude SDK 54 ; ne pas retirer les shims en parallèle sans preuve. P16 reste PARTIAL, pas fermé par ce triage.

Sources primaires : [shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv), [decode-uri-component](https://github.com/advisories/GHSA-qr28-fpjm-wq7f), [nanoid](https://github.com/advisories/GHSA-28wg-ghj8-5hjv), [auth-js](https://github.com/advisories/GHSA-8r88-6cj9-9fh5). Les JSON complets et chemins npm sont conservés dans les preuves locales ignorées.

## Toutes les entrées signalées

| Paquet | Version(s) installée(s) | Gravité npm | Modules dans l’entrée web |
| --- | --- | --- | ---: |
| `@babel/core` | 7.29.0 | low | 0 |
| `@expo/cli` | 54.0.25 | moderate | 1 |
| `@expo/config` | 12.0.13 | moderate | 0 |
| `@expo/config-plugins` | 54.0.4 | moderate | 0 |
| `@expo/fingerprint` | 0.15.5 | moderate | 0 |
| `@expo/metro-config` | 54.0.16 | moderate | 0 |
| `@expo/prebuild-config` | 54.0.8 | moderate | 0 |
| `@jest/transform` | 29.7.0 | moderate | 0 |
| `@react-native/babel-plugin-codegen` | 0.81.5 | moderate | 0 |
| `@react-native/babel-preset` | 0.81.5 | moderate | 0 |
| `@react-native/codegen` | 0.81.5 | moderate | 0 |
| `@react-native/community-cli-plugin` | 0.81.5 | moderate | 0 |
| `@react-native/dev-middleware` | 0.81.5 | moderate | 0 |
| `@react-navigation/core` | 7.17.4 | high | 77 |
| `@supabase/auth-js` | 2.64.4 | low | 14 |
| `@supabase/supabase-js` | 2.45.0 | low | 7 |
| `@xmldom/xmldom` | 0.8.13, 0.9.10 | high | 0 |
| `babel-jest` | 29.7.0 | moderate | 0 |
| `babel-plugin-istanbul` | 6.1.1 | moderate | 0 |
| `babel-preset-expo` | 54.0.11 | moderate | 0 |
| `baseline-browser-mapping` | 2.10.32 | moderate | 0 |
| `brace-expansion` | 5.0.6, 1.1.14, 2.1.1 | high | 0 |
| `browserslist` | 4.28.2 | high | 0 |
| `chromium-edge-launcher` | 0.2.0 | moderate | 0 |
| `compression` | 1.8.1 | high | 0 |
| `decode-uri-component` | 0.2.2 | high | 1 |
| `deepmerge` | 4.3.1 | low | 0 |
| `expo` | 54.0.35 | moderate | 30 |
| `expo-asset` | 12.0.13 | moderate | 12 |
| `expo-constants` | 18.0.13 | moderate | 3 |
| `expo-linking` | 8.0.12 | moderate | 7 |
| `expo-router` | 6.0.24 | high | 110 |
| `expo-splash-screen` | 31.0.13 | moderate | 0 |
| `glob` | 7.2.3, 13.0.6 | moderate | 0 |
| `image-size` | 1.2.1 | high | 0 |
| `js-yaml` | 3.14.2, 4.2.0 | high | 0 |
| `minimatch` | 10.2.5, 3.1.5, 9.0.9 | moderate | 0 |
| `nanoid` | 3.3.12 | high | 1 |
| `node-forge` | 1.4.0 | high | 0 |
| `postcss` | 8.4.49, 8.5.15 | high | 0 |
| `postcss-selector-parser` | 6.1.2 | moderate | 0 |
| `query-string` | 7.1.3 | high | 1 |
| `react-native` | 0.81.5 | moderate | 0 |
| `react-native-reanimated` | 4.1.7 | moderate | 278 |
| `rimraf` | 3.0.2 | moderate | 0 |
| `shell-quote` | 1.8.4 | critical | 0 |
| `source-map-js` | 1.2.1 | high | 0 |
| `tar` | 7.5.16 | critical | 0 |
| `test-exclude` | 6.0.0 | moderate | 0 |
| `undici` | 6.26.0 | high | 0 |
| `uuid` | 7.0.3 | moderate | 0 |
| `xcode` | 3.0.1 | moderate | 0 |
