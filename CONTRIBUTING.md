# Contribuer à PharmaTrace

MVP expérimental maintenu bénévolement. Lire le [README](README.md), les [limites](docs/known-limitations.md) et l’[installation](docs/installation.md).

Le code original et les créations originales dont les droits sont établis sont sous [Apache-2.0](LICENSE), avec les crédits du [NOTICE](NOTICE). Ne proposer que des contributions dont vous pouvez accorder les droits. Sauf indication explicite contraire, les contributions intentionnellement soumises pour inclusion suivent Apache-2.0, conformément à sa section 5 ; conserver les notices tierces et signaler leur origine. Les œuvres tierces ne sont pas re-licenciées. Pas de CLA supplémentaire prévu.

1. Choisir une tâche bornée du [backlog](docs/backlog.md) ou décrire le problème avant un gros changement.
2. Depuis votre fork ou clone, créer une branche depuis `main` à jour et proposer une Draft PR vers `main`. Une PR cohérente par changement. Le hardening est intégré depuis la PR nº 1 ; le tag historique `v1.1.0-preview.1` reste fixé à `9a18cf85aa7ff396e8fd65eceed918a5e2aed249`.
3. Données fictives et base personnelle isolée, jamais le MVP.
4. Dans `app/PharmaTrace` : `npm test`, `npx tsc --noEmit`, `npm run check:public`, `npm run build:web`.
5. Expliquer problème, solution, tests et limites. CI verte ≠ validation physique Android/caméra.

Les migrations appliquées ne sont pas réécrites. Un changement DB nécessite tests négatifs par rôle, reprise, concurrence si pertinente et aucune réparation automatique d’historiques.

Ne commiter ni `.env`, secrets, sessions, exports DB, données terrain, APK local ou vidéos historiques non suivies. Captures réelles avec données fictives et mode explicite. Ne pas ajouter une dépendance ou refonte globale pour une petite correction.

Issues pour bugs/améliorations non sensibles ; les PR externes sont ouvertes. Les protections de `main` imposent signatures, passage par PR et check `app-checks` réussi ; ne pas les contourner ni demander l’accès aux secrets de production. Les tests de contribution utilisent des valeurs fictives. Aucun délai garanti. Le français reste la langue principale ; les contributions en anglais sont acceptées. Respecter les personnes et décrire les faits ; pas d’attaques personnelles ni données de patients. Sujet sensible : [SECURITY](SECURITY.md).
