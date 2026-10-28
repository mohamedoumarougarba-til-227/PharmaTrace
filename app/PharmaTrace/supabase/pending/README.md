# Phase restrictive en attente

`20261027205457_restrict_legacy_verification_access.sql` a été créée avec la CLI,
puis conservée hors de `migrations/` pour empêcher une application accidentelle
par `supabase db push` pendant LOT 0.3A.

**NON APPLIQUÉE.** Ne pas la déplacer, l'appliquer ou la pousser sans le feu vert
LOT 0.3B et une stratégie validée pour les anciens clients déjà chargés.
Voir [le checkpoint LOT 0.3A](../../../../docs/lot-03a-additive.md).

Pendant B1, ce fichier a été révisé comme proposition B2 : lectures anonymes vides
via RLS, et INSERT de scan ancien absorbé sans persistance. Un garde SQL interdit
son exécution : cette implémentation n'a PAS été testée sur PostgreSQL/PostgREST.
Seule la réaction de l'ancien JavaScript à des réponses simulées a été observée.
Les 59 assertions antérieures décrivent le candidat avant cette révision, conservé
dans `docs/archive/lot-03b-restrictive-before-b1.sql`. Il faut adapter ces assertions
et valider les réponses HTTP réelles avant toute levée du garde.
Voir [la proposition et les preuves B1](../../../../docs/lot-03b1-production.md).
