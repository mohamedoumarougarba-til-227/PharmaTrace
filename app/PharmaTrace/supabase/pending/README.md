# Historique de la phase restrictive

Le candidat `20261027205457_restrict_legacy_verification_access.sql` a été créé
avec la CLI puis conservé hors de `migrations/` pendant A/B1. Son brouillon gardé
est préservé dans `docs/archive/lot-03b2-guarded-preflight.sql`.

Après les gates autorisés B2, la restriction finale est enregistrée sous
`20261028232100_restrict_legacy_public_access.sql` dans `migrations/`.
Ne pas réappliquer le brouillon ni le candidat archivé.

Les anciennes 59 assertions décrivent le premier candidat ; la cible actuelle
est testée par `tests/p03b2_legacy_compat.sql` (60 assertions) et les tests HTTP.
Pour la validation installée, utiliser
`node scripts/prepare-lot03b2-rehearsal.cjs --installed` et exécuter le SQL généré
sur le projet autorisé. Ce SQL annule toutes ses fixtures avant de rendre les résultats.
Voir [le rapport B2](../../../../docs/lot-03b2-restriction.md).
