# Phase 2 — préparation finale de la release open source

Checkpoint du 4 novembre 2026, Africa/Lagos. Préparation locale terminée,
**publication non effectuée**. Phase 1 métier reste CLOSED ; aucun nouveau lot
de hardening, migration, correction de stock ou mutation Supabase.

## A. Licence recommandée et décision restante

**Apache-2.0 recommandée** pour le code original et la documentation active
originale : réutilisation large, concession explicite de brevets limitée aux
contributions et conservation des notices. [Comparaison MIT/Apache/GPL](licensing.md).
Texte canonique et NOTICE prêts dans `docs/proposals/`, **aucun LICENSE racine
appliqué**. Le choix appartient au propriétaire.

Consentement Raouf/Mahamadou **DONE, définitivement acquis** ; pas de décision
à rouvrir. Les crédits des trois membres, TrustGrid et MIABE sont conservés.

## B. Droits tiers, médias et crédits

[Inventaire initial](assets-rights.md) : 60 fichiers, 235 330 866 octets avec
doublons, empreintes complètes et statut par fichier. Consentement des auteurs
du code distinct des droits de photographe, de personnes et d’œuvres incorporées.

- Cinq illustrations actives à provenance incomplète sauvegardées localement,
  remplacées par des SVG originaux sobres et leurs rendus PNG. Sources conservées.
- Portraits remplacés visuellement par des initiales ; noms/crédits maintenus.
- Figma ZIP : mentions shadcn/ui MIT et Unsplash retrouvées, notices conservées ;
  sources exactes des images non identifiées. Pas d’incompatibilité inventée.
- Font Awesome / Expo vector-icons et jsQR web : licences propres documentées,
  textes conservés ; le build accompagne les fichiers de notices dans `dist/legal`.
- [Manifeste de conservation locale](release/retain-local-manifest.json) :
  **46 chemins suivis**, archives/médias et huit métadonnées CLI personnelles.
  Dry-run vérifié ; **retrait de l’index non exécuté**. Sous le feu vert final,
  sauvegarde et retrait ciblé du suivi, sans suppression physique ou réécriture
  d’historique. Anciennes copies Git déjà publiques non prétendument effacées.

[THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md), [CREDITS](../CREDITS.md).
Les deux vidéos non suivies restent intactes et ne font pas partie du retrait
de l’index. Les PDFs/vidéos historiques ne sont pas réécrits.

## C. Documents et artefacts préparés

README, CONTRIBUTING, SECURITY, CREDITS, THIRD_PARTY_NOTICES, CHANGELOG ; guides
installation, architecture, DB/bootstrap, tests, limites, droits, dépendances,
versions, archives et captures. `.env.example` est fictif, sans connexion au MVP.
Seed SQL fictive avec gardes pour base personnelle vide, UUID opérateur explicites,
provisioning contrôlé ; aucun compte ou mot de passe par défaut.

CI, templates bug/amélioration/PR, trois premières tâches et une issue dépendances,
description/topics/settings en propositions, corps de Draft PR, notes de release,
manifeste de conservation locale et textes de valorisation. [Plan](release-plan.md).
L’inventaire des changements est dans [main-diff-inventory.md](release/main-diff-inventory.md).

## D. Cohérence README / vitrine / application

Positionnement : MVP expérimental de gestion et traçabilité de lots, développé
au Niger par TrustGrid dans le contexte MIABE, interfaces multirôles.
Retrait des promesses de blockchain opérationnelle, immutabilité absolue,
authenticité physique, faux QR impossible et garanties de délai non mesurées.
Statistiques sanitaires non sourcées supprimées des surfaces actives.

UI : « lot trouvé dans le registre », avertissement sur boîte physique et QR
copiable, bandeau démo global. Les identifiants internes historiques
`authentique` restent dans les types/enums ; pas de migration de cosmétique.
Fiche PDF générée renommée « fiche de lot », SHA-256 désigné empreinte et non
signature/certification. Trends KPI inventées retirées ; courbes illustratives
annoncées, fausse répartition DPH remplacée par sa limite explicite. Étiquettes
« agréé » et noms de remplacement non établis rendus neutres, sans changer
l’autorité des rôles ni les calculs transactionnels.

Vitrine existante corrigée, pas de nouvelle landing. Trois vraies captures
locales avec simulation affichée, pas des maquettes présentées comme production.
Archives MIABE distinguées par des index/avertissements, originaux binaires intacts.
**Ces nouveaux textes/images ne sont pas encore déployés.**

## E. Tests, CI et reproductibilité

| Vérification | Résultat / périmètre |
| --- | --- |
| Suite locale actuelle | 95/95 ; assertions UI renforcées sur les correspondances sans fausse authenticité. |
| Installation isolée du lockfile | `npm ci --no-audit --no-fund` réussi, sans nouvelle sélection de versions. |
| Tests / TypeScript après cette installation | 95/95 et typecheck réussis sur Node 25.8.2 Windows. |
| TypeScript sur workspace actuel | Réussi. |
| Export web | Réussi, 34 routes ; environnement fictif contrôlé, notices accompagnantes. |
| Contrôles publics | Liens locaux, YAML, motifs de secrets, bundle et dry-run du manifeste vérifiés. |
| Navigateur local | 11 contrôles : connu/inconnu, fabricant/pharmacie, DPH, indisponibilité, responsive 1440/390, absence d’appel DB en démo et d’erreur JS. |
| CI GitHub | Préparée Node 22/Linux, actions épinglées, permissions lecture seule ; **non exécutée à distance faute de push autorisé**. Aucun badge vert anticipé. |
| SQL métier | Preuves de phase 1 conservées : 104 métier, 30 P02, 60 B2 et concurrence réelle. Pas rejouées par cette CI ni dans ce sprint documentaire. |

Le bootstrap local à **huit migrations** et les **sept versions distantes** sont
explicitement distingués. Le replay accepté en phase 1 n’est pas annoncé comme
un `db reset` brut universel. La nouvelle seed est relue et gardée, **pas exécutée
sur une nouvelle base** dans ce sprint. Aucun Docker/PostgreSQL installé et aucun
projet Supabase créé. La démo réellement essayée est celle en mémoire.

Un premier export réutilisait une transformation Metro avec une ancienne URL
publique malgré les variables fictives. Correction : build `--clear`, dotenv
désactivé en CI et contrôle du bundle contre l’environnement fourni. Export final
avec URL fictive confirmée, aucun nouveau déploiement de cet artefact. Les essais
de harness interrompus sont conservés, pas comptés comme passages verts.

Expo Camera charge jsQR 1.2.0 depuis un CDN sur web ; cette requête statique est
documentée et distincte de la DB. Caméra entièrement hors ligne non promise.
Les tests physiques Android/caméra ne sont pas réalisés.

P16 : [triage complet](dependency-triage.md), 52 entrées, dont deux critiques
outillage (tar/shell-quote absents de l’entrée web). Décodage d’URL et nanoid
inclus : conditions et priorités explicites, pas d’affirmation « aucun risque ».
Lockfiles/dépendances/shims inchangés, aucun audit fix forcé.

## F. GitHub : état conservé, paramètres à finaliser

Description/topics actuellement vides, homepage application, PR externes
`collaborators_only`. Règles actives conservées : le 404 de protection classique
ne supprime pas le ruleset 17278864 (signatures, non-fast-forward/suppression,
restrictions création/mise à jour). Aucun setting modifié.

Payloads prêts : About, topics, secret scanning/push protection, signalement
privé et ruleset supplémentaire main/PR/checks, sans désactiver le précédent.
Ouverture PR externes après licence, CONTRIBUTING et CI réellement prêts.
Canal privé immédiat documenté : adresse publique du mainteneur ; pas de SLA.
Social preview PNG 1200×630 prêt, pas téléversé.

## G. Backlog préparé

Trois `good first issues` non sensibles : labels accessibles scanner,
installation Linux/PowerShell, focus clavier vitrine. Une quatrième issue
dépendances prioritaire, sans label débutant. Corps complets sous `release/issues/`.

P10, trois stocks historiques, Android/caméra/permission audio, démo métier,
advisors, no-op legacy, récupération mot de passe, accessibilité et limites
d’officine restent documentés. Aucune nouvelle correction métier engagée.
Les risques de dépendances restent visibles, pas clos par une note de triage.

## H. Git, diff complet et préservation

Branche `hardening/public-readiness-20261027`, HEAD de départ
`36aafe17bc6cb63d2298d562ea2dacc08834d050`. `main` local et distant constatés à
`f64f2c4cf5fd2d4e47816692d1350360f54196c5`. Les huit commits de préparation
précédents ont une signature valide (trust local non certifié), aucune réécriture.
Le commit signé de ce sprint est relevé dans le retour final.

Scan : 393 blobs texte de l’historique atteignable, 85 entrées texte d’archives,
contrôle des fichiers actuels. Deux motifs de PEM dans les README dotenv jadis
vendoriés correspondent exactement aux exemples officiels publics ; six
occurrences JWT anon publiques, **aucun secret propriétaire confirmé** par ces
contrôles. Pas de garantie de détection exhaustive ni rotation inventée.
Les exports DB/tokens/preuves privées et `.env` restent ignorés, jamais indexés.

Vidéos non suivies préservées :

- `demo_prototype_phase 2.mp4` : 44 245 834 octets,
  `434cce24536b683735ad335e9f774259b91dd7a7619c55043792ce3b60bb288d`.
- `demo_Pitch_MVP_Phase 3.mp4` : 39 607 226 octets,
  `63bc7f07038000203286c569f52022cf076f72c883537f4bc4b8bde7f24c1d83`.

## I. PR / merge / release / provenance

[Plan exact](release-plan.md) et payloads prêts. Après décisions : licence et
retrait ciblé approuvés dans un commit signé ; push normal de branche, Draft PR,
CI réelle, revue/checks puis merge autorisé préservant les commits déployés.
Aucune fusion automatique ni main directement poussée.

Construire depuis le SHA final approuvé, staging sans alias puis promotion si
vert pour client et vitrine existante ; aucun schéma DB à réappliquer au MVP.
Production actuelle vérifiée inchangée : `dpl_E3SKbgi9zgtKFKLoDUafgbMEZp4h`,
source `9578a1e`, alias application ; vitrine `dpl_BrmvqJRY2Gp7kx4auXHNMF2N9qW6`.
Ne pas attribuer les nouveaux textes locaux à ces anciens déploiements.

Tag signé/prerelease source envisagé : `v1.1.0-preview.1`, sans nouvel APK.
APK historique v1.0.0 : 5 juin 2026, tag `14e525bcbd9cc6eeca7c3b52e809e08159e0ec0e`,
asset 113 882 052 octets, antérieur aux correctifs ; annotation préparée, asset
ni téléchargé à nouveau, ni supprimé, ni présenté comme corrigé.

## J. Valorisation

[Textes prêts](communication.md) : résumé français, anglais, About GitHub,
LinkedIn, Patreon, communautés et pitch court Niger/TrustGrid/MIABE. Crédit des
trois membres, preuves techniques réelles, limites honnêtes ; aucune promesse
médicale/réglementaire ou sollicitation artificielle d’étoiles. Rien publié.

## K. Les deux seules décisions indispensables

1. **Licence** : accepter Apache-2.0 proposée ou choisir explicitement une autre.
2. **Publication** : feu vert distinct couvrant le plan préparé, notamment les
   46 chemins conservés localement, push/PR/merge, CI réelle, settings proposés,
   déploiements des textes/images, tag/prerelease et annotation de l’ancien APK.

Pas d’autorisation d’équipe à redemander. Aucun nouveau chantier de hardening
conditionnant cette préparation. Les contrôles distants après push sont des
gates d’exécution du plan, pas des résultats présumés déjà verts. **STOP avant
publication.**
