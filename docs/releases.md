# Versions, déploiements et APK historique

## Déploiement métier validé

Client source `9578a1e77d64f8044e440232e8af7e7f6afd40cd` (inclut `691e2d3`), livraison documentée par `36aafe17bc6cb63d2298d562ea2dacc08834d050`.
Production Vercel `dpl_E3SKbgi9zgtKFKLoDUafgbMEZp4h`, alias [application](https://pharmatraceapp.vercel.app/), promue le 3 novembre 2026 depuis le staging testé, même bundle. [Preuves de livraison](phase-1-business-delivery.md).
Vitrine [existante](https://pharmatrace-eta.vercel.app/) inchangée pendant ce gate.

Les nouveaux textes/images de préparation open source sont locaux : aucun déploiement supplémentaire autorisé par ce sprint. Après intégration finale, construire un nouvel artefact à partir du SHA exact approuvé, le tester en staging puis promouvoir et relever ID/alias/hash ; ne pas prétendre que l’ancien ID contient ces nouveaux textes.

## Ancien Android

Release GitHub `v1.0.0`, publiée le 5 juin 2026 à 05:21:38 UTC, tag résolu vers `14e525bcbd9cc6eeca7c3b52e809e08159e0ec0e` ; asset `PharmaTrace_v1.0.0.apk`, 113 882 052 octets. La release affiche `target_commitish: main`, mais le SHA du tag est la référence précise. Aucun nouveau téléchargement ou rebuild APK dans ce sprint.

Cet APK précède les correctifs de sécurité/métier. Ne pas le présenter comme client corrigé, certifié ou validé physiquement. Son SHA256 binaire n’a pas été recalculé ici ; taille et métadonnées API ne remplacent pas une empreinte. Préparer une annotation historique/prerelease sans supprimer l’asset ; modification GitHub uniquement au feu vert.

## Prochaine release source proposée

`v1.1.0-preview.1`, prerelease GitHub, après licence et CI distante verte. Pas de nouvel APK attaché. Les champs Expo/package historiques `1.0.0` ne constituent pas une nouvelle version Android ; le tag source identifie les corrections. Notes prêtes dans [release-notes.md](release/release-notes.md). Le SHA final sera celui du merge approuvé, pas `main` implicite ni un SHA prédit.
