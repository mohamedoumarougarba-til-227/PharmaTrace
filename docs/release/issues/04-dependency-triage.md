# Mettre à jour la chaîne de dépendances compatible SDK 54 après triage ciblé

Labels proposés : dependencies, security, help wanted. **Pas good first issue.**

L’audit npm daté signale 52 paquets, dont deux critiques de l’outillage. Les
sources web montrent decode-uri-component, query-string et nanoid inclus ;
les conditions et priorités sont détaillées dans docs/dependency-triage.md.

Périmètre : correctifs compatibles étudiés, lockfile revu et tests, sans
`npm audit fix --force`, downgrade Expo ou upgrade majeur non validé. Ne pas
modifier simultanément les shims pour masquer les erreurs.

Acceptation : comparaison des avis/chemins avant-après, tests existants,
typecheck/export avec environnement public contrôlé, revue des modules web et
essais natifs explicitement séparés. Aucun test de charge/exploit sur le MVP.
