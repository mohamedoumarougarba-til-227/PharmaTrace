# PharmaTrace

**MVP expérimental de gestion et traçabilité de lots de médicaments**, développé au Niger par **TrustGrid**, dans le contexte du **MIABE Hackathon 2026**.

Fabricants, pharmacies et rôle de supervision DPH disposent d’interfaces métier. Le public recherche un lot par identifiant. Une correspondance décrit le registre ; elle ne garantit pas l’authenticité physique d’une boîte. Un QR peut être copié. Le MVP n’implémente pas de blockchain ni de certification officielle.

[Application](https://pharmatraceapp.vercel.app/) · [Rechercher un lot](https://pharmatraceapp.vercel.app/verify) · [Vitrine existante](https://pharmatrace-eta.vercel.app/) · [Installer](docs/installation.md) · [Contribuer](CONTRIBUTING.md)

> **Préversion publiée le 5 novembre 2026 : [v1.1.0-preview.1](https://github.com/mohamedoumarougarba-til227/PharmaTrace/releases/tag/v1.1.0-preview.1)**, issue du merge signé `9a18cf85aa7ff396e8fd65eceed918a5e2aed249`. Application et vitrine en production : [Versions](docs/releases.md). **Licence Apache-2.0** pour le code original et les créations originales dont les droits sont établis : [LICENSE](LICENSE), [NOTICE](NOTICE) et [périmètre](docs/licensing.md). Les éléments tiers et archives à droits incertains ne sont pas re-licenciés.

## Fonctions

| Interface | Fonctions |
| --- | --- |
| Fabricant | Enregistrer des lots, générer des QR, traiter des demandes, transférer et annuler sous conditions. |
| Pharmacie | Demander, recevoir, consulter le stock et rechercher un lot. |
| Supervision DPH | Consulter les données du registre ; aucun partenariat institutionnel revendiqué. |
| Public | Correspondance minimale, absence, entrée invalide ou service indisponible. |

Les rôles réels sont provisionnés par un opérateur. Stock, transferts et demandes associées passent par des transactions PostgreSQL/RPC. Une erreur de journalisation ne transforme pas le résultat établi d’une recherche.

## Essayer

Les boutons **Démo** de la connexion ouvrent des données fictives en mémoire. Ils ne reproduisent ni la persistance, ni les règles RLS, ni tous les workflows ; les écritures métier y sont désactivées. Code fictif connu : `FAB-2026-049`, **après activation de la démo**. Ce code ne garantit aucun résultat en mode réel. Ne saisir aucune donnée patient ou opération réelle sur ce MVP public.

![Recherche publique locale, données simulées](docs/images/verification-demo.png)

[Autres captures réelles de l’interface locale en simulation](docs/screenshots.md), sans validation terrain implicite.

## Installer

Node.js 22 LTS et npm. Versions applicatives verrouillées dans le lockfile.

```sh
git clone https://github.com/mohamedoumarougarba-til227/PharmaTrace.git
cd PharmaTrace/app/PharmaTrace
npm ci
cp .env.example .env
# PowerShell : Copy-Item .env.example .env
npm run web
```

Pour visiter la démo locale, conserver les valeurs fictives de `.env.example` et choisir un rôle Démo. Pour le mode réel : **votre propre Supabase isolé**, [bootstrap documenté](docs/database.md), clé publique uniquement. Ne jamais connecter une copie de développement au Supabase MVP du propriétaire. Aucun secret/service_role dans `EXPO_PUBLIC_*`.

```sh
npm test
npx tsc --noEmit
npm run check:public
npm run build:web
```

La CI publique exécute ces contrôles sans credentials ni base distante : [exécution réussie sur le commit de publication](https://github.com/mohamedoumarougarba-til227/PharmaTrace/actions/runs/42102309187). Les tests SQL nécessitent une base isolée ; ils ne sont pas exécutés par GitHub Actions. [Validation](docs/testing.md).

## Structure et limites

- `app/PharmaTrace/` : Expo SDK 54, React Native 0.81, React 19, Expo Router, NativeWind, Supabase Auth/PostgreSQL/RLS/RPC.
- `landing/` : vitrine HTML/CSS/JS existante.
- `docs/` : documentation actuelle et checkpoints datés.
- `ressources/` : archives MIABE, médias et design, avec droits distincts.

[Architecture](docs/architecture.md) · [Limites](docs/known-limitations.md) · [Backlog](docs/backlog.md) · [Dépendances](docs/dependency-triage.md) · [Archives MIABE](docs/historical-material.md) · [Droits tiers](THIRD_PARTY_NOTICES.md)

Le bootstrap local rejoue **huit migrations**, avec un prérequis historique ; le MVP distant possède **sept versions**. Ne pas appliquer aveuglément `supabase db push` sur une base existante. Trois lots historiques à stock incohérent restent intacts et bloqués. Deep-link QR automatique, validation physique Android/caméra et démo métier complète restent au backlog.

## Contribution, sécurité et support

[CONTRIBUTING](CONTRIBUTING.md) : issues reproductibles, PR ciblées, données fictives et tests. Les contributions externes sont ouvertes ; `main` reste protégé par les rulesets et la CI. [Quatre issues publiques et backlog](docs/backlog.md).

[SECURITY](SECURITY.md) fournit un canal privé. Ne publier ni session, ni donnée personnelle, ni preuve exploitable sur le MVP. Support bénévole, sans SLA, usage clinique ou réglementaire validé.

## TrustGrid — Niger

| Membre historique | Contribution historique |
| --- | --- |
| Mohamed Oumarou Garba | Coordination, produit, UI/UX, QA et présentation. |
| Mahamadou Garba Zakou | Backend, Supabase et identifiants SHA-256. |
| Abdoul Raouf Harouna Moussa | Frontend, React Native et QR. |

L’accord de l’équipe pour l’ouverture est acquis. Crédits TrustGrid et MIABE conservés ; droits tiers distincts. [Crédits](CREDITS.md) · [Changelog](CHANGELOG.md) · [Versions / ancien APK](docs/releases.md)
