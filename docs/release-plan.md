# Plan final de publication — gate 3B local exécuté, publication en attente

## Décision de licence acquise ; publication non autorisée

**Apache-2.0 retenue le 4 novembre 2026 et appliquée localement** au code original
et aux créations originales dont les droits sont établis. LICENSE canonique,
NOTICE et références actives finalisés. Accord équipe acquis, jamais rouvert.

**Gate 3B autorisé et exécuté localement le 5 novembre 2026** : les 46 chemins
du manifeste ont été sauvegardés, vérifiés puis retirés de l’index uniquement.
Originaux, sauvegardes, empreintes et historique conservés. Le commit signé de
ce gate ne comprend que ces retraits, exclusions et ajustements documentaires.
**Gate 3C push/Draft PR en attente d’autorisation distincte.** Aucun push, PR,
merge, tag, release, setting ou déploiement n’est autorisé par ce gate local.

Version proposée : `v1.1.0-preview.1` source, prerelease sans nouvel APK.
La finalisation locale de licence fait l’objet d’un commit signé distinct.
Les droits tiers restent distincts et les textes canoniques tiers inchangés.

## Périmètre Git / droits

Inventaire complet `main..branche` à régénérer avant push ; ne pas limiter la
revue au sprint documentaire. Contrôler secrets et contenus avant publication.
Les originaux restent locaux. Le manifeste `release/retain-local-manifest.json`
enregistre le retrait ciblé de l’index des archives à droits incomplets et metadata
CLI. Le script `release/retain-local.cjs --apply` a été exécuté au gate 3B après
sauvegarde et relecture des 46 copies, sans suppression de fichier, reset, clean,
force-push ou réécriture d’histoire. Les deux vidéos non suivies ne doivent jamais
être ajoutées. Les inventaires et justifications restent suivis.

Ce plan n’efface pas les anciennes copies déjà publiques dans Git. Les crédits
TrustGrid/MIABE restent dans README/CREDITS et le NOTICE racine. Aucun `LICENSE`
ne s’applique implicitement aux œuvres tierces exclues.

## GitHub observé et settings proposés

Au relevé : dépôt public, `main` historique, description/topics vides, homepage
vers l’application, `collaborators_only`, secret scanning/push protection et
Dependabot security updates désactivés. Un endpoint de protection classique
retourne 404 mais **le ruleset actif 17278864 protège les branches** : interdiction
de suppression/non-fast-forward, signatures requises, restrictions création/
mise à jour, bypass administrateur. Ne pas conclure « main non protégé » du 404.

Proposition `release/github-settings.json` : description, topics, homepage,
signalement privé, secret scanning/push protection disponibles sur dépôt public.
Le champ PR acceptera `all` seulement après licence, CONTRIBUTING et CI prêts.
Ne jamais désactiver le ruleset ou ses signatures pour simplifier un push.
Ajouter un passage par PR et le check effectivement créé `app-checks` sur main,
en conservant les protections existantes ; relever son nom exact après première
exécution, pas un check inventé qui bloquerait les merges. Toute modification
du ruleset reste dans le feu vert final, avec export avant/après.

## Ordre exact après feu vert

1. **FAIT localement au gate 3B** : LICENSE/NOTICE conservés, sauvegardes et
   retrait des seuls 46 chemins autorisés, exclusions et documentation à jour,
   contrôles du diff/copies/vidéos puis commit signé distinct. Ne pas répéter
   le retrait ni rouvrir les phases closes. Les étapes suivantes attendent un
   nouveau feu vert.
2. Push normal de la branche de préparation vers origin, sans pousser main
   directement. Le ruleset exige un acteur autorisé pour créer/mettre à jour
   la branche ; utiliser le bypass existant autorisé, pas désactiver les règles.
3. Créer une **Draft PR** vers main, corps dans `release/pr-body.md`. Attendre la
   CI distante réelle. Ne pas présenter les validations locales comme un run
   GitHub déjà vert. Ajouter le check requis après qu’il existe.
4. Contrôler le diff complet et la CI ; passage Ready et merge seulement au
   feu vert explicite couvrant cette intégration. Préférer un merge commit
   préservant `9578a1e` et les commits signés déployés comme ancêtres. Pas de
   rebase, amend, force-push ou fusion automatique. Relever le SHA de merge et
   sa provenance/signature.
5. Construire le client depuis ce SHA exact avec l’environnement public MVP
   autorisé, un seul artefact staged production sans alias ; tester puis
   promouvoir cet artefact si vert. Aucun bootstrap/migration à réappliquer au
   MVP : le schéma métier est déjà installé. Mettre à jour la vitrine existante
   depuis le même snapshot, staging puis promotion validée. Enregistrer projet,
   SHA, deployment ID, hash du bundle et alias ; l’ancien déploiement de phase 1
   ne contient pas les nouveaux textes préparés localement.
6. Finaliser About/topics, canal sécurité et PR externes, conserver les
   protections ; créer les trois premières tâches et l’issue de suivi dépendances et leurs labels. Charger
   `images/social-preview.png` dans l’aperçu social GitHub (interface si nécessaire).
7. Créer un tag signé `v1.1.0-preview.1` sur le SHA approuvé, pousser ce tag après
   vérification, puis créer la prerelease source avec `release/release-notes.md`
   actualisé et résultats CI réels. Ne pas attacher l’ancien APK comme corrigé.
8. Annoter la release historique v1.0.0 avec date/SHA/limites ; pas de suppression
   d’asset. Préparer ensuite la communication, sans post ni message automatique.

## Checks et limites

Local : installation verrouillée, 95 tests existants, TypeScript, export,
contrôle public, revue droits/secrets et captures fictives. PostgreSQL n’est pas
exécuté par cette CI ; les preuves réelles métier sont le gate phase 1 accepté.
Le seed est destiné à une base personnelle isolée, pas au propriétaire.
Android/caméra, dette npm/advisors, deep-link, trois stocks et no-op legacy
restent au backlog documenté. Les anciens onglets doivent être rechargés.

Sources : [API PR policy](https://docs.github.com/en/rest/repos/repos),
[signalements privés](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

## Payloads préparés, aucune requête de mutation exécutée

Après licence/CI et autorisation : PATCH dépôt avec `github-about.json`, PUT `topics` avec `github-topics.json`, PATCH dépôt avec `github-security.json`, PUT `private-vulnerability-reporting` sans corps. Exemple CLI : `gh api --method PATCH repos/mohamedoumarougarba-til-227/PharmaTrace --input docs/release/github-about.json`. Ne pas envoyer `github-settings.json` comme payload unique : c’est une vue de coordination.

`github-main-checks-ruleset.json` propose un ruleset supplémentaire main seulement, préservant 17278864 inchangé. Vérifier le nom réel du check après le premier run, puis POST `rulesets`. Passage par PR/checks, discussions résolues ; aucun quota de review supplémentaire n’est imposé à une équipe dont les reviewers GitHub disponibles ne sont pas établis. Bypass administrateur limité aux PR dans ce nouveau ruleset. La revue/autorisation propriétaire reste explicite, sans auto-merge.
