# LOT 0.3B1 — nouveau client public, sans restriction DB

Checkpoint du 28 octobre 2026, Africa/Lagos. Production promue et contrôlée.
**Aucun changement de schéma, policy, grant ou vue en DB. Migration B non appliquée,
même en transaction de répétition.** Préparation B2 uniquement sur les fichiers locaux.

## A. Vercel

| Surface | Avant | Après |
| --- | --- | --- |
| App publique `pharmatraceapp.vercel.app` | `dpl_AswPKQ419gWeETYouS6uBnkEV3XT` | `dpl_HHgjvx39Fr1wGc7YWvwwSUsmEyF9` |
| Vitrine `pharmatrace-eta.vercel.app` | `dpl_BrmvqJRY2Gp7kx4auXHNMF2N9qW6` | Même ID, URL immuable et alias |
| Alias de branche git-main | Ancien déploiement app | Toujours ancien, branche non modifiée |

Projet app `prj_7tFBlhbPLp8bFotCCaIYXZqxAUDT`, équipe
`team_pQ4FsZcdMFInwjusV89CFHBm`. Nouveau déploiement READY, URL immuable :
[pharmatraceapp-qek0odakp](https://pharmatraceapp-qek0odakp-mohameds-projects-0af41c6a.vercel.app).

La promotion directe du preview `dpl_7ZNQbHBjz47w4tjoB69ssZmbgzvt` par l'API a
échoué avec HTTP 422. La production publique est restée ancienne à ce stade.
La documentation distingue la promotion d'un preview et celle d'une production
en attente ; le [workflow staged production](https://vercel.com/docs/cli/deploying-from-cli)
a donc été utilisé avec le même export prebuilt, sans reconstruire le JavaScript.

`deploy --prebuilt --prod --skip-domain` a créé le nouveau déploiement. La CLI lui
a attribué son alias technique de projet ; le domaine public demandé restait
explicitement sur l'ancien ID, vérifié par MCP. Quatre contrôles ont ensuite
validé cet artefact en attente : SHA256, entrée invalide, FAB absent, seule RPC
attendue. L'appel MCP `request_promote` sur ce déploiement a réussi.
Le domaine public résout ensuite le nouvel ID ; `list_deployment_aliases` confirme
`pharmatraceapp.vercel.app` et l'alias technique sur le nouveau déploiement.

La vitrine n'a reçu aucune mutation. Aucun changement Git, fusion, push ou
modification de `main` n'a été nécessaire à la promotion.

## B. Artefact et configuration

Commit source correspondant : `ee511b0ffc822c01a244a739a1d47dac07e3b617`.
L'app et ses bibliothèques locales ne présentent aucun diff par rapport à ce commit.
Il s'agit d'un déploiement CLI prebuilt, pas d'une construction déclenchée par Git.
Le MCP ne fournit pas de SHA Git pour ce preview (`meta` vide) : la correspondance
est attestée localement, sans inventer une provenance Git fournie par Vercel.

Les trois copies suivantes sont identiques octet pour octet : export conservé,
package prebuilt conservé, JavaScript servi par le preview validé. Après staging
et promotion, le JavaScript servi par la nouvelle production possède la même empreinte :

```text
/_expo/static/js/web/entry-e68b2feb2cf2a00b5f1e0dabfdede921.js
3071389 octets
SHA256 8822d0ba0157f1ee7a901b7a88069656a10baa9164909f8d7bc6b265746b81ec
```

Les variables utiles sont incorporées à la construction statique Expo :
`EXPO_PUBLIC_SUPABASE_URL=https://qctedpyydisawsknahso.supabase.co` et la clé
publique `EXPO_PUBLIC_SUPABASE_ANON_KEY`. La clé présente dans le bundle est
identique à celle validée en A ; ses claims indiquent `role=anon` et le bon `ref`.
Sa valeur n'est pas publiée dans ce rapport. Aucun secret service_role n'est
nécessaire au navigateur. Les requêtes observées ciblent effectivement ce MVP.

Aucun placeholder n'est utilisé comme configuration active. Le bundle contient
encore les branches démo et le secours de configuration historiques de la source ;
leur présence textuelle ne signifie pas leur activation. Les adresses
`example.invalid` de cette étape appartiennent seulement aux comptes fictifs de test.

## C. Validation publique

| Scénario | Attendu | Obtenu en production |
| --- | --- | --- |
| Page principale | Page chargée puis routage public | 200 et interface du vérificateur |
| Vérificateur | Nouveau bundle opérationnel | Formulaire et requêtes nouvelles observés |
| Code fictif connu | Correspondance réellement obtenue | Médicament fictif correspondant, six champs publics |
| Code inconnu | NOT_FOUND | « Lot non trouvé » |
| FAB inexistant | Aucun résultat fabriqué | « Lot non trouvé », aucun médicament/fabricant inventé |
| Entrée invalide | INVALID_INPUT sans requête | « Code invalide », aucun RPC supplémentaire |
| URL QR valide collée | Extraire `hash`, puis rechercher | Correspondance fictive attendue |
| URL QR invalide collée | INVALID_INPUT sans requête | « Code invalide », aucun RPC supplémentaire |
| Ouverture directe `/verify?hash=...` | Observer le deep-link séparément | Formulaire vide, pas de recherche automatique : limite P10 confirmée |
| Lot archivé | État archive, pas de positif actif | « Lot archivé », pas AUTHENTIQUE |
| Lot expiré | État expiré | « EXPIRÉ » avec fixture sûre |
| Projection privée | Aucun UUID lot/stock/contact | Six clés exactes, sans champs privés |
| Ambiguïté numéro/hash | UNAVAILABLE | « Vérification indisponible » |
| Panne RPC contrôlée | UNAVAILABLE, pas de repli | Conforme, interception réseau du seul navigateur isolé |

Le test direct de deep-link est une observation de limite, pas un test vert de
fonctionnalité automatique. Aucune correction P10 n'a été incorporée à l'artefact
promu. Le QR caméra/native n'est pas validé physiquement.

## D. Réseau et contrat

Le contexte navigateur public ne produit que des POST à
`/rest/v1/rpc/verify_public_lot`, sans SELECT général des lots et sans INSERT scan.
La réponse connue contient exactement :

```text
date_expiration, dosage, etat, fabricant_public, nom_medicament, numero_lot
```

Les parcours métier montrent les nouvelles surfaces :

| Parcours | Requête observée |
| --- | --- |
| Autorisation du compte | POST `rpc/get_my_role` |
| Profil propre | POST `rpc/get_my_profile` |
| Annuaire pharmacie/fabricant | POST `rpc/get_business_partners` |
| Catalogue médicament | POST `rpc/get_manufacturer_catalog` |
| Journal secondaire | POST `rpc/record_verification_scan` |
| Détail fabricant | GET `business_lots` |
| Supervision DPH | GET `supervision_stats` |

Les dashboards et workflows conservés utilisent aussi leurs lectures métier
lots/transferts/demandes/scans et certains profils ciblés. Leur présence dans la
trace globale n'est pas un fallback du vérificateur. Aucun INSERT brut de scans
n'a été émis par le nouveau client dans ces parcours. La trace publiée par le
rapport ne contient ni Authorization, ni cookie, ni mot de passe, ni JWT.

## E. Anti-régression FAB

Identifiant testé : `FAB-LOT03B1-ABSENT-e81d8e2ab98ca48f`.
Lecture réelle réussie et vide : NOT_FOUND. Même saisie avec RPC interrompue
uniquement dans le navigateur d'essai : UNAVAILABLE. Dans les deux cas, absence
de AUTHENTIQUE, Amoxicilline et Laboratoire Niger Pharma.

Ce test ne modifie pas la disponibilité du service, ne touche pas l'ancien
onglet gardé ouvert et ne prétend pas supprimer son ancien code.

## F. Auth, rôles et workflows

Cinq comptes fictifs ont été créés pour cette validation, puis retirés :
fabricant/pharmacie/DPH provisionnés explicitement pour les essais, un compte
Auth sans profil et un profil fictif portant `agent_dph` mais sans validation.
Les trois comptes historiques n'ont été ni provisionnés, ni modifiés, ni utilisés
avec un mot de passe deviné ou réinitialisé.

| Cas | Attendu | Obtenu |
| --- | --- | --- |
| Pharmacie fictive validée | Connexion et parcours métier réels | Connexion, vérification et transfert associé visibles |
| Compte Auth sans profil | Aucun rôle accordé | Message de compte non provisionné, reste au login |
| Profil fictif avec ancien libellé de rôle non validé | Le libellé seul n'autorise rien | Même message, pas de redirection métier |
| Journal secondaire interrompu | Conserver le lot trouvé | Résultat présent avec avertissement secondaire |
| Absence / indisponibilité pharmacie | États distincts | Conforme |
| Profil propre | Profil du compte connecté | Conforme UI et RPC |
| Annuaire / catalogue | Projections métier prévues | Conforme UI et réseau |
| Détail fabricant | Lot de la fixture autorisée | Conforme via `business_lots` |
| Supervision DPH | Accès du compte fictif validé | Conforme via `supervision_stats` |

Un premier passage du scénario Auth a dépassé 15 secondes en attendant la réponse
de connexion. Sa cause n'est pas établie. Le passage relancé après attente du
chargement réseau initial est entièrement vert ; cela ne prouve pas l'absence
d'intermittence Auth. Les premiers résultats sont conservés dans les preuves.
L'échec initial de lecture de la page principale avant hydratation a aussi été
corrigé dans le script d'observation, sans modifier l'application.

Les sessions obtenues ont été déconnectées à la fin des essais. Aucun e-mail n'a
été envoyé : les identités fictives ont été confirmées uniquement pour ces tests.
La connexion des vrais comptes et le parcours de confirmation e-mail ne sont pas
présentés comme validés.

## G. Anciens onglets

Un vrai onglet production a été ouvert avant la promotion, puis maintenu ouvert
pendant le staging et la promotion. Après celle-ci, il conserve le même marqueur
mémoire et le script `entry-ed3cdeac3690e5e42916a0cbc1c24fad.js`. Un nouvel onglet
sert `entry-e68b2feb2cf2a00b5f1e0dabfdede921.js` et les comportements décrits en C/E.

Aucune recherche ni panne n'a été provoquée dans l'ancien onglet. Aucun service
worker n'est enregistré dans le contexte neuf ; CacheStorage y est vide. La
promotion ne recharge donc pas les anciens JavaScript déjà en mémoire. Aucun
TTL fiable ne permet de déclarer tous ces clients disparus.

## H. DB et invariance des données

Toujours cinq migrations : les quatre historiques et A
`20261027205429_add_safe_verification_surfaces`. Aucune version B enregistrée.
Les anciens SELECT/INSERT restent autorisés comme avant B1. La fonction no-op
proposée pour B2 n'existe pas en DB.

| Ensemble | Avant | Après nettoyage | Identique |
| --- | ---: | ---: | --- |
| Comptes Auth | 3 | 3 | Champs non credentials exportés |
| Profils | 3 | 3 | Toutes lignes/colonnes |
| Lots | 6 | 6 | Toutes lignes/colonnes |
| Transferts | 10 | 10 | Toutes lignes/colonnes |
| Demandes | 7 | 7 | Toutes lignes/colonnes |
| Scans | 14 | 14 | Toutes lignes/colonnes |
| Alertes | 8 | 8 | Toutes lignes/colonnes |

Nettoyage borné aux UUID et codes fictifs exacts, avec gardes sur emails,
fabricant, nom du médicament et comptages : 5 comptes, 4 profils, 5 lots,
1 transfert, 2 scans, 1 alerte et 4 traces de provisionnement fictives retirés.
Zéro session et zéro trace de provisionnement de ces fixtures subsistent.
Les preuves ont été sauvegardées avant retrait. Aucun audit historique ou log
technique du fournisseur n'a été effacé ; une restauration physique des
séquences/journaux PostgreSQL n'est pas revendiquée.

## I. Advisors et audit SECURITY DEFINER

Après promotion, mêmes avis de sécurité qu'après A : 2 ERROR de vues definer,
2 WARN search_path mutable, 3 WARN definer anon exécutables, 7 WARN definer
authenticated exécutables, 1 INFO audit privé sans policy, 1 WARN protection de
mots de passe compromis. Performance : 7 FK sans index, 13 initplan RLS,
8 index inutilisés et 24 policies permissives multiples. Aucun réglage n'a été
changé pour faire disparaître artificiellement ces avis.

Les cinq nouvelles fonctions definer résident dans `public`, appartiennent à
`postgres`, ont `search_path=''`, des références qualifiées et aucun SQL dynamique.
Un déplacement artificiel de leur wrapper ne remplace pas le contrôle d'autorité.

| Fonction | Pourquoi definer ? | anon | authenticated | Paramètres contrôlés / identité | search_path | Risque résiduel |
| --- | --- | --- | --- | --- | --- | --- |
| `verify_public_lot(text)` | Lire un code exact malgré les futurs RLS vides puis projeter six champs | Oui | Oui | ASCII 1–100 ; égalité numéro/hash ; ambiguïté refusée ; aucun UID fourni | vide | Codes prévisibles devinables, énumération par répétition, pas de rate limiting ; aucune preuve d'authenticité physique |
| `get_my_profile()` | Rendre le seul profil propre, y compris contacts non accordés globalement après B | Non | Oui | Aucun paramètre ; `auth.uid()` uniquement ; compte sans profil → NULL | vide | Données propres disponibles à une session compromise ; rôle retourné = information, pas autorité |
| `get_business_partners()` | Annuaire minimal sans accorder tous les profils privés | Non | Oui | Aucun paramètre ; rôle appelant validé ; rôle opposé actif et validé ; aucun contact privé | vide | Énumération volontaire des partenaires professionnels autorisés |
| `get_manufacturer_catalog(uuid)` | Catalogue médicament sans accorder le stock/UUID lot de chaque fabricant | Non | Oui | UUID typé ; pharmacie validée ; fabricant actif/validé ; pas d'UID de pharmacie fourni | vide | Tout fabricant autorisé peut être ciblé intentionnellement par une pharmacie ; catalogue énumérable dans ce périmètre |
| `record_verification_scan(text)` | Écrire atomiquement scan/alerte avec colonnes calculées, malgré l'interdiction future des écritures directes | Non | Oui | Code exact ; `auth.uid()` et rôle validé calculés ; lot/verdict auteur non acceptés en paramètres | vide | Répétition/spam d'un compte validé, doublons et coût ; `current_date` et règles P29 à préciser |

Le helper `private.resolve_verification_lot(text)` est **invoker**, non exécutable
par anon/authenticated ; les wrappers l'utilisent dans leur contexte contrôlé.
La fonction P02 `get_my_role()` est une definer antérieure à A : UID seul,
validation opérateur et statut actif, chemin vide. Le trigger historique
`auto_alerte_scan_suspect()` reste definer sans chemin fixé : avis connu, inchangé
pendant B1. Ces deux fonctions expliquent les deux avis antérieurs aux cinq RPC.

Références : [fonctions et privilèges Supabase](https://supabase.com/docs/guides/database/functions),
[advisors vues](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
[advisors search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

## J. Proposition B2, non exécutée

Le candidat précédent est conservé dans `docs/archive/lot-03b-restrictive-before-b1.sql`.
Le fichier `supabase/pending/20261027205457_restrict_legacy_verification_access.sql`
est révisé comme **brouillon non testé**. Un garde qui lève une exception dans une
transaction explicite bloque toute exécution accidentelle, y compris un psql
qui continuerait après une erreur. Le générateur bloque aussi ce brouillon avant
d'émettre du SQL. Aucun de ces objets/policies/grants n'a été installé sur le MVP.

| Surface | Proposition | Limite / preuve encore nécessaire |
| --- | --- | --- |
| Lots | Conserver SELECT anon ; retirer la policy publique ; RLS → zéro ligne pour les anciens appels publics ; conserver le périmètre métier authentifié | Prouver via PostgREST `.maybeSingle()` et jointure profil : 200/null plutôt que 42501 |
| Scans, lecture | Conserver SELECT anon ; supprimer la policy donnant les scans à auteur NULL ; seules lectures métier validées restent visibles | GET anonyme vide sans fuite ; propre scan/DPH toujours permis |
| Scans, INSERT brut | Conserver le privilège API INSERT mais trigger BEFORE invoker qui renvoie NULL pour `current_user` anon/authenticated | Aucun stockage ni trigger AFTER ; réponses HTTP minimales et representation à tester ; RPC definer postgres toujours effective |
| Alertes | Révoquer INSERT brut ; conserver SELECT anon avec RLS vide, nécessaire aux anciennes vues invoker ; durcir le trigger d'alerte | Les vérificateurs historiques n'appellent pas INSERT alertes ; les écrans historiques inspectés lisent ou modifient des statuts. Revalider la carte avant B2 |
| Profils | SELECT anon techniquement permis, RLS sans ligne ; colonnes minimales pour authenticated et RPC du profil propre | Les jointures/lectures `role` critiques restent possibles ; un ancien SELECT `*` de compte authentifié peut encore échouer sur les colonnes privées, hors catch de vérification. Compatibilité totale non revendiquée |
| Vues | Anciennes vues invoker, téléphone NULL ; SELECT anon conservé ; bases et prédicat DPH rendent la réponse vide | Tester les privilèges de toutes les bases pour éviter une erreur avant évaluation du filtre |

Le no-op s'appuie sur le comportement documenté d'un trigger
[BEFORE retournant NULL](https://www.postgresql.org/docs/17/plpgsql-trigger.html) :
la ligne est abandonnée. Le choix proposé vérifie `current_user` et ne laisse
aucun flag fourni par le client autoriser la persistance. Les clients ne peuvent
pas se choisir `postgres` ; la RPC definer calcule ses propres colonnes/autorités.
Les écritures opérateur/service_role privilégiées restent des chemins de confiance
à inventorier, pas une capacité du navigateur.

**Preuve obtenue, limitée au JavaScript :** dans un navigateur isolé chargé avec
l'ancien bundle immuable, toutes les requêtes Supabase sont interceptées. Une
lecture `[]` HTTP 200 et un INSERT de scan vide HTTP 201 conduisent l'ancien UI à
« suspect », sans fallback positif. Aucune requête DB réelle n'a été exécutée
dans cette simulation. Le libellé métier ancien reste imparfait ; ce n'est pas
une validation du trigger, des RLS ou des réponses HTTP serveur proposées.

La carte des consommateurs montre aussi que l'ancien code attend les INSERT
scans sans inspecter leur champ `error` ; les erreurs retournées par le SDK et
les exceptions JavaScript ne doivent donc pas être assimilées sans mesure.
Les erreurs SELECT sont explicitement levées dans le `catch` dangereux.

Avant B2, il faut notamment prouver, sur terrain explicitement autorisé :

1. GET historique numéro/hash connu/inconnu FAB, jointure et `.maybeSingle()` :
   réponse vide correcte pour anon et compte sans rôle, sans champs privés.
2. INSERT ancien minimal, representation et lots de plusieurs lignes : zéro
   scan/alerte durable, aucune autorité fournie par le client, pas de faux succès
   dans les nouveaux workflows et aucun effet AFTER indésirable.
3. Rôle authentifié valide ou non valide, données forgées bien typées, tentative
   de faux flag/UID : no-op direct ; RPC contrôlée toujours durable et attribuée
   au seul appelant ; alerte d'absence contrôlée ; rollback si journal invalide.
4. Lectures scans/profils/vues anonymes vides et nouvelles projections fonctionnelles ;
   anciens appels d'alertes hors chemin critique et colonnes privées protégées.
5. Rejouer P02, les assertions de confidentialité et adapter les 59 assertions
   historiques : leurs attentes `permission denied` ne correspondent plus à ce
   brouillon. Les 59/59 acceptés en A restent une preuve du candidat précédent.
6. Vérifier HTTP puis vrai ancien bundle isolé contre ce serveur de test, volumes,
   rollback, advisors, charge du no-op et condition d'abandon de cette compatibilité.

Le no-op ne peut pas empêcher une erreur antérieure au trigger : JSON invalide,
cast UUID/enum, colonne inconnue, requête ancienne mal formée, indisponibilité du
serveur ou coupure réseau. Le vieux JavaScript possède toujours son fallback.
**On ne peut donc pas garantir absolument « jamais de faux positif » pour tous
les anciens bundles déjà chargés par une seule migration serveur.** Le périmètre
réaliste est d'éviter les erreurs nouvelles dues à B pour les requêtes historiques
valides. Le résidu doit être accepté/traité avant toute application, sans fermer
P03/P04/P05 sur la seule base d'un garde de compatibilité.

## K. Tests, Git et statuts

- Navigateur production : **26/26** contrôles, avec les limites C/F explicites.
- Staging production : **4/4** contrôles avant promotion.
- Simulation de l'ancien client : **1/1**, exclusivement réponses interceptées.
- Suite locale conservée : **67/67** = 39 LOT 0.1 + 11 rôles + 13 LOT 0.3 + 4 A.
- TypeScript : succès ; `git diff --check` : succès.
- Garde du générateur : 2/2 contrôles locaux, aucune requête SQL.
- Aucun rebuild applicatif : le déploiement réutilise le prebuilt déjà testé.
- Aucun test DB B2 exécuté, aucun nouveau résultat 59/59 revendiqué pour B2.

P03/P04/P05 restent **PARTIAL**. P06 reste **OPEN**. P10 reste ouvert pour le
deep-link automatique. P12 reste PARTIAL : accords TrustGrid acquis, licence et
droits tiers à finaliser. Aucune autre clôture artificielle.

HEAD reste `ee511b0ffc822c01a244a739a1d47dac07e3b617` ; branche
`hardening/public-readiness-20261027`. `main` reste
`f64f2c4cf5fd2d4e47816692d1350360f54196c5`. Aucun commit B1, push, merge ou
modification de dépendances. Les préparations suivantes restent locales :

- `app/PharmaTrace/supabase/pending/20261027205457_restrict_legacy_verification_access.sql` : brouillon B2 protégé ;
- `app/PharmaTrace/supabase/pending/README.md` : limites et garde ;
- `app/PharmaTrace/scripts/prepare-lot03-rehearsal.cjs` : refus de répéter un brouillon avec une ancienne suite incompatible ;
- `app/PharmaTrace/supabase/tests/p03_public_contract.sql` : commentaire de statut historique ;
- `docs/archive/lot-03b-restrictive-before-b1.sql` : candidat précédent préservé ;
- `docs/lot-03b1-production.md` : ce rapport.

Les deux vidéos non suivies restent intactes : tailles 44245834 / 39607226 et
SHA256 `434cce24536b683735ad335e9f774259b91dd7a7619c55043792ce3b60bb288d` /
`63bc7f07038000203286c569f52022cf076f72c883537f4bc4b8bde7f24c1d83`.
Les preuves privées, cookies temporaires et mots de passe fictifs sont ignorés
dans `A exclure de github/LOT03B1_20261028/` et ne doivent pas être publiés.

Commandes/actions principales :

```text
git status --short / git branch --show-current / git rev-parse HEAD
vercel --version / vercel promote --help / vercel deploy --help
vercel project inspect pharmatraceapp --scope mohameds-projects-0af41c6a --non-interactive
MCP get_deployment / get_project / list_deployment_aliases
vercel env run --project prj_7tFBlhbPLp8bFotCCaIYXZqxAUDT --scope mohameds-projects-0af41c6a -- node <preflight.cjs privé>
MCP request_promote (preview : 422, aucune promotion)
vercel deploy --prebuilt --prod --skip-domain --yes --cwd <package conservé> --project prj_7tFBlhbPLp8bFotCCaIYXZqxAUDT --scope mohameds-projects-0af41c6a --meta lot03b1SourceCommit=ee511b0ffc822c01a244a739a1d47dac07e3b617
vercel curl <chemin> --deployment <ID exact> --scope mohameds-projects-0af41c6a -- <options de sortie privée>
node <stage-checks.cjs privé> / node <old-tab.cjs privé>
MCP request_promote (production staged : succès)
node <browser-checks.cjs privé> / node <legacy-empty-simulation.cjs privé>
MCP execute_sql (snapshots, fixtures fictives et nettoyage borné, lecture des fonctions/policies)
MCP list_migrations / get_advisors security et performance
npm test / .\node_modules\.bin\tsc.cmd --noEmit
git diff --check / git diff --stat / Get-FileHash -Algorithm SHA256 <deux vidéos>
```

Les essais protégés utilisent l'authentification Vercel existante ; les cookies
de test restent privés. Aucun réglage de protection n'a été désactivé. Une
tentative `project inspect --project` a été refusée par la CLI et remplacée par
la syntaxe positionnelle supportée, sans liaison automatique ni mutation.

## L. Arrêt

Nouveau client public validé contre A, avec les limites ci-dessus. B2 doit encore
faire l'objet d'un feu vert, de tests PostgreSQL/PostgREST et d'un contre-audit du
risque résiduel des anciens bundles. **Aucune application B ni LOT 0.4 dans B1.**
