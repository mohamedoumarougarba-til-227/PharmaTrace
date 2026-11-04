# Plan final de publication — préparé, non exécuté

## Décisions fermées

1. Adopter ou remplacer la recommandation **Apache-2.0** pour le code original
   et la documentation active originale. Accord équipe acquis, jamais rouvert.
2. Autoriser la publication selon ce plan, incluant le manifeste précis de
   conservation locale, l’intégration GitHub, les settings proposés et le
   déploiement des nouveaux textes/images. Aucun de ces actes distants n’est
   exécuté pendant la préparation.

Version proposée : `v1.1.0-preview.1` source, prerelease sans nouvel APK.
La licence choisie est appliquée dans un dernier commit signé, puis toutes les
mentions « en décision » sont actualisées. Les droits tiers restent distincts.

## Périmètre Git / droits

Inventaire complet `main..branche` à régénérer avant push ; ne pas limiter la
revue au sprint documentaire. Contrôler secrets et contenus avant publication.
Les originaux restent locaux. Le manifeste `release/retain-local-manifest.json`
prépare le retrait ciblé de l’index des archives à droits incomplets et metadata
CLI. Le script `release/retain-local.cjs` est en dry-run par défaut ; `--apply`
ne sera utilisé qu’après feu vert. Il sauvegarde/vérifie, sans suppression de
fichier, reset, clean, force-push ou réécriture d’histoire. Les deux vidéos non
suivies ne doivent jamais être ajoutées.

Ce plan n’efface pas les anciennes copies déjà publiques dans Git. Les crédits
TrustGrid/MIABE restent dans README/CREDITS et la notice proposée. Aucun `LICENSE`
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

1. Appliquer la décision de licence, les mentions définitives et le manifeste
   approuvé ; commit signé. Contrôler diff indexé, secrets, vidéos et HEAD.
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
