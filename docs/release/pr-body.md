## Problème et solution

Le main public historique ne reflète pas les corrections déjà installées sur le MVP. Cette PR intègre vérification honnête, rôles et surfaces minimales, transactions métier et préparation open source du projet expérimental.

## Zones concernées

Client Expo, migrations/fixtures SQL, tests, documentation, CI et vitrine existante. Pas de nouveau backend, blockchain, landing ou refonte globale. Les crédits TrustGrid/MIABE sont conservés.

## Validation

95 tests locaux, typecheck/export et contrôles publics ; phase 1 : métier SQL 104, P02 30, B2 60, HTTP 46 et concurrence PostgreSQL réelle. Voir rapports datés pour terrain et limites. CI distante à renseigner après push autorisé ; aucun test physique Android implicite.

## Risques et publication

Migrations déjà installées : ne pas les réappliquer sur MVP. Anciens bundles à recharger, écritures brutes fermées. Trois stocks historiques bloqués, pas réparés. Dépendances triées sans upgrade forcé. Apache-2.0 appliquée localement aux contributions originales aux droits établis ; licences tierces conservées. Retrait ciblé des 46 chemins incertains à autoriser et vérifier avant push/PR : ne pas présenter ce retrait comme déjà fait. Les nouveaux textes/images attendent leur déploiement distinct et traçable.

PR à créer en Draft, aucune fusion automatique.
