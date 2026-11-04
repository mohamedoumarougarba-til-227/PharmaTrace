# Contribuer à PharmaTrace

MVP expérimental maintenu bénévolement. Lire le [README](README.md), les [limites](docs/known-limitations.md) et l’[installation](docs/installation.md).

La licence reste en décision : la proposition Apache-2.0 n’est pas une autorisation déjà accordée. Ne proposer que des contributions dont vous pouvez accorder les droits. Après adoption, les contributions acceptées suivront la licence du projet ; conserver les notices tierces et signaler leur origine. Pas de CLA supplémentaire prévu.

1. Choisir une tâche bornée du [backlog](docs/backlog.md) ou décrire le problème avant un gros changement.
2. Créer une branche depuis la version publique actuelle. Une PR cohérente par changement. Le hardening local n’est pas encore fusionné dans `main` : vérifier la base proposée lors de la publication.
3. Données fictives et base personnelle isolée, jamais le MVP.
4. Dans `app/PharmaTrace` : `npm test`, `npx tsc --noEmit`, `npm run check:public`, `npm run build:web`.
5. Expliquer problème, solution, tests et limites. CI verte ≠ validation physique Android/caméra.

Les migrations appliquées ne sont pas réécrites. Un changement DB nécessite tests négatifs par rôle, reprise, concurrence si pertinente et aucune réparation automatique d’historiques.

Ne commiter ni `.env`, secrets, sessions, exports DB, données terrain, APK local ou vidéos historiques non suivies. Captures réelles avec données fictives et mode explicite. Ne pas ajouter une dépendance ou refonte globale pour une petite correction.

Issues pour bugs/améliorations non sensibles ; PR externes actuellement `collaborators_only`, ouverture préparée après licence et CI. Aucun délai garanti. Français ou anglais acceptés. Respecter les personnes et décrire les faits ; pas d’attaques personnelles ni données de patients. Sujet sensible : [SECURITY](SECURITY.md).
