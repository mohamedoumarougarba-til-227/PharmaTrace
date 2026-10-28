# Phase restrictive en attente

`20261027205457_restrict_legacy_verification_access.sql` a été créée avec la CLI,
puis conservée hors de `migrations/` pour empêcher une application accidentelle
par `supabase db push` pendant LOT 0.3A.

**NON APPLIQUÉE.** Ne pas la déplacer, l'appliquer ou la pousser sans le feu vert
LOT 0.3B et une stratégie validée pour les anciens clients déjà chargés.
Voir [le checkpoint LOT 0.3A](../../../../docs/lot-03a-additive.md).
