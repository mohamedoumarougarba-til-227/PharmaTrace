# Versions, déploiements et APK historique

## Préversion publiée — 5 novembre 2026

[Préversion source v1.1.0-preview.1](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/releases/tag/v1.1.0-preview.1), sous Apache-2.0 pour les créations originales aux droits établis. Le tag annoté signé et vérifié cible `9a18cf85aa7ff396e8fd65eceed918a5e2aed249`, merge signé de la [PR nº 1](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/pull/1), sans réécriture des 11 commits de préparation. Ce tag reste immuable ; les corrections documentaires ultérieures de main ne le déplacent pas.

Déploiements constatés lors de la publication et reconfirmés le 5 novembre 2026 :

| Surface | Déploiement READY | Sources et accès |
| --- | --- | --- |
| Application | `dpl_9A3fGoycXNgEU9HByDxsMcQBArPH` | Build Git main `9a18cf85…` ; [application](https://pharmatraceapp.vercel.app/). |
| Vitrine | `dpl_3WFDryY7GjdN6xY3TVh3znup1Bp1` | Fichiers suivis du même commit ; artefact de production testé avant promotion ; [vitrine](https://pharmatrace-eta.vercel.app/). |

La [CI main de publication](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/actions/runs/42102309187) a réellement réussi : 95 tests locaux, TypeScript, contrôles publics et export web. Les assertions SQL et la concurrence réelle restent des preuves de phase 1, pas des jobs de cette CI. [Notes publiées](release/release-notes.md) · [Rapport de clôture et checkpoints datés](phase-2-open-source-readiness.md).

Les alias sont évolutifs : une fusion ultérieure dans main peut reconstruire le client automatiquement. Les IDs ci-dessus décrivent la publication, pas une garantie que ces domaines serviront éternellement ces artefacts. La vitrine n’est pas intégrée à Git et se déploie séparément.

## Limites conservées

P16/P17 PARTIAL ; validation physique Android/caméra absente ; deep-link automatique et démo métier complète au backlog. Trois stocks historiques incohérents restent intacts et bloqués. Une correspondance au registre ne certifie pas l’authenticité physique d’une boîte. [Limites connues](known-limitations.md).

## Android historique — v1.0.0

[Release v1.0.0](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/releases/tag/v1.0.0), publiée le 5 juin 2026 à 05:21:38 UTC, tag résolu vers `14e525bcbd9cc6eeca7c3b52e809e08159e0ec0e` ; asset `PharmaTrace_v1.0.0.apk`, 113 882 052 octets. L’asset est conservé, sans nouvel APK joint à la préversion source. Le digest SHA-256 fourni par GitHub est `87f229b9380f42fb8bc7e5f8f896e0943797cb247ff7076bd46f1aa771f0a00a` ; il ne s’agit pas d’un nouveau hachage local du binaire.

Cet APK précède les correctifs de sécurité/métier ; sa release porte une annotation d’archive. Ne pas le présenter comme client corrigé, certifié ou validé physiquement. Les champs natifs historiques `1.0.0` ne constituent pas une nouvelle version Android.

## Livraison antérieure — 3 novembre 2026

Client source `9578a1e77d64f8044e440232e8af7e7f6afd40cd` (inclut `691e2d3`), livraison documentée par `36aafe17bc6cb63d2298d562ea2dacc08834d050`. Ancienne production `dpl_E3SKbgi9zgtKFKLoDUafgbMEZp4h`, promue depuis le staging testé. Cette référence historique ne désigne plus l’alias actuel et ne contenait pas les nouvelles formulations de publication. [Preuves de livraison conservées](phase-1-business-delivery.md) · [Plan historique](release-plan.md).
