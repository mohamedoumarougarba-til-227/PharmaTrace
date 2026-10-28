# LOT 0.3B2 — restriction des accès historiques

Checkpoint achevé le 29 octobre 2026, Africa/Lagos. Travail commencé le 28.
**B2 appliquée au MVP `qctedpyydisawsknahso`, puis validée.** Aucun déploiement
Vercel, push, merge ou travail P06/LOT 0.4. Les données historiques sont intactes.

## A. Commit B1/prep

Les six fichiers B1 en attente ont été figés avant B2 dans le commit local signé
`cdbf0e13168132af7b7ee3d57874b36f8cdc9201`,
`chore(security): prepare legacy access shutdown`.
Signature RSA valide `513338E2587B325480AD83D17EE25184789B78E3`, confiance locale
inconnue. Le brouillon était toujours protégé à ce checkpoint. Aucun push.

## B. Migration finale et gates

Migration appliquée :
`app/PharmaTrace/supabase/migrations/20261028232100_restrict_legacy_public_access.sql`.
La CLI 2.120.0 a créé le fichier initial `20261028232008`; le MCP a enregistré la
version `20261028232100`. Le fichier local a été renommé pour correspondre à la
version distante, sans changer son SQL après application. Les migrations antérieures
ne sont pas modifiées. Le brouillon gardé est conservé dans
`docs/archive/lot-03b2-guarded-preflight.sql`.

Avant application, ces gates sont tous passés :

| Gate | Terrain | Résultat |
| --- | --- | --- |
| Contrat B2 | Vraies tables, transaction intégralement rollbackée | 60/60 |
| Rôles P02 | Même répétition | 30/30 |
| HTTP/SDK et no-op | Copies techniques préfixées, vrai PostgREST du MVP | 41/41 |
| Ancien bundle réel | Requêtes transmises aux copies, aucune réponse métier inventée | 3/3 |
| Nouveau client | Client publié, requêtes transmises aux copies du candidat | 26/26 |
| Suite locale | Sans modification du client | 67/67 |
| TypeScript | Sans émission | Succès |

Les copies `b2p_2810_*` sont des objets de répétition sur le même MVP Free, avec
uniquement des données fictives. Aucun autre projet ni branche Supabase, aucun
changement de schémas exposés/configuration PostgREST et aucune installation de
dépendance. Les noms de ressources et FK ont été adaptés mécaniquement pour
router les essais vers les copies ; les vraies tables restent inchangées pendant
ces essais. La répétition transactionnelle vérifie séparément le SQL sous les
vrais noms. Après application, les contrôles sont refaits sur les vrais noms,
sans cette adaptation. Toutes les copies sont ensuite retirées selon manifeste.

La migration finale :

- conserve les privilèges techniques de lecture nécessaires mais ferme les RLS publics ;
- absorbe les INSERT directs de scans anon/authenticated avant persistance ;
- ferme les INSERT bruts d'alertes ;
- limite les profils et conserve les RPC/projections minimales ;
- rend les anciennes vues invoker avec téléphone NULL et statistiques DPH ;
- durcit le trigger d'alerte sans modifier les politiques d'écriture transferts/demandes.

Application par MCP : succès, sixième migration enregistrée. Aucun rollback de
production ni réécriture d'une migration appliquée. Les essais et le nettoyage
ont rencontré des erreurs de préparation décrites en P ; toutes ces transactions
ont été annulées avant correction, sans modifier le SQL de B2 déjà enregistré.

## C. Anciens appels : HTTP et SDK précis

SDK installé `@supabase/supabase-js` 2.45.0, comme le client historique.
Requête historique testée :

```text
lots_medicaments
select id,nom_medicament,date_expiration,statut_actuel,fabricant_id,
       utilisateurs!lots_medicaments_fabricant_id_fkey(nom_entite,ville)
or(numero_lot.eq.<identifiant>,hash_sha256.eq.<identifiant>)
maybeSingle()
```

| Identifiant | HTTP | SDK data | SDK error |
| --- | ---: | --- | --- |
| Numéro fictif connu | 200 | null | null |
| Code ordinaire absent | 200 | null | null |
| FAB absent | 200 | null | null |
| Hash présent dans les fixtures | 200 | null | null |
| Hash inconnu | 200 | null | null |

La réponse connue est volontairement vide pour l'ancien lecteur public : celui-ci
perd la vérification, sans tomber dans une nouvelle erreur de permission. La
nouvelle RPC minimale continue de trouver le lot. Un GET public global des lots
retourne également 200 `[]`. Ni 42501, ni exception du SDK pour ces formes valides.

## D. INSERT legacy scans : succès sans persistance

`private.discard_legacy_scan()` est un trigger BEFORE INSERT, invoker, chemin
vide, propriétaire postgres. Il retourne NULL pour `current_user` anon ou
authenticated, indépendamment des valeurs envoyées. Aucun flag de requête ni UID
fourni ne permet de contourner cette frontière. Le privilège INSERT reste présent
uniquement pour cette compatibilité ; les anciennes policies INSERT sont retirées.

Douze combinaisons ont été mesurées avant ET après application :

| Acteur | Préférence | Taille | HTTP / corps | Persistance |
| --- | --- | --- | --- | --- |
| anon | minimal ou representation | 1 ou plusieurs lignes | 201 / vide ou `[]` | zéro |
| authenticated non provisionné | minimal ou representation | 1 ou plusieurs lignes | 201 / vide ou `[]` | zéro |
| pharmacie validée | minimal ou representation | 1 ou plusieurs lignes | 201 / vide ou `[]` | zéro |

Les données testées incluent un UUID lot bien formé mais inexistant, un UUID
d'auteur inventé, un rôle `agent_dph` et un verdict `authentique` forgés.
Toutes ces valeurs sont ignorées : aucun scan ni alerte n'est créé. L'ancien
appel SDK `.insert(...)` retourne `status=201`, `data=null`, `error=null`.

Un témoin AFTER sur les copies compte exactement zéro passage pour ces INSERT,
puis un passage par scan RPC réellement enregistré. Sur la production, les
comptages scans/alertes restent constants pendant les douze combinaisons et les
trois parcours de l'ancien bundle. Les triggers métier sont cartographiés : aucun
AFTER de ligne ne s'exécute pour une ligne abandonnée par BEFORE.

Un UUID syntaxiquement invalide donne en revanche HTTP 400, SQLSTATE 22P02,
avant le trigger. C'est une limite mesurée, conforme au périmètre des requêtes
historiquement valides. Même distinction pour JSON invalide, colonne inconnue,
type/enum invalide ou indisponibilité réseau/serveur.

## E. RPC moderne durable

`record_verification_scan(text)` reste definer postgres et valide l'utilisateur
via `auth.uid()` et `get_my_role()`. Le trigger BEFORE ne neutralise pas son
contexte de confiance.

| Cas | Résultat réel après B2 |
| --- | --- |
| Lot connu, pharmacie validée | HTTP 204 ; un scan persistant |
| Auteur | UUID réel de la pharmacie appelante |
| Type/verdict/lot | `pharmacien`, `authentique`, UUID du lot résolu par DB |
| Code absent | Scan `non_trouve`, lot NULL et une alerte info contrôlée |
| Compte non provisionné | 403 / 42501 ; aucun scan |
| Paramètre auteur/verdict supplémentaire | RPC non résolue, 404 ; aucun scan |
| Lot archivé | 400 / 22023 ; aucun effet partiel |

Les tests SQL couvrent aussi le verdict expiré. Les tests navigateur confirment
qu'un échec secondaire du journal ne remplace pas la correspondance déjà affichée.
Les écritures opérateur/service_role privilégiées restent des chemins techniques
de confiance ; aucune clé service_role n'est fournie au navigateur.

## F. Alertes et trigger historique

Recherche complète app/lib, source historique et bundle pertinent : les quatre
appels directs à `alertes` du vieux bundle sont deux SELECT et deux UPDATE de
statut. Aucun INSERT d'alerte dans les vérificateurs critiques. Côté DB, les
fonctions concernées sont le trigger de création et la normalisation du journal.

Les INSERT bruts sont désormais refusés : anon 401/42501, comptes authenticated
403/42501, sans persistance. La création de l'alerte d'absence passe par le trigger
du scan contrôlé. `auto_alerte_scan_suspect()` est conservée, devient invoker,
avec `search_path=''`, références qualifiées et EXECUTE retiré aux clients.
Elle exige l'auteur correspondant à `auth.uid()` et un rôle validé ; l'alerte est
info et non une accusation métier de contrefaçon.

Il n'existe qu'un chemin de création d'alerte. La normalisation post-INSERT déjà
présente dans la RPC A reste idempotente sur cette même alerte ; elle ne crée pas
une seconde alerte et ne contredit pas le trigger. Les tests constatent une seule
alerte pour un scan absent. Aucun trigger n'a été supprimé sans cartographie.

## G. Profils

Anon possède encore le SELECT technique mais aucune policy ne lui donne de ligne :
GET `utilisateurs?select=*` → 200 `[]`. Ce privilège permet aux anciennes jointures
de fonctionner sans erreur, sans rendre les données visibles.

Authenticated ne possède plus le SELECT global de toutes les colonnes. Les
colonnes techniques accordées sont `id,nom_entite,ville,pays,role,statut` et les
RLS limitent les lignes propres/partenaires justifiés/DPH. Les vérifications de
privilèges confirment individuellement le refus SELECT de `email`, `telephone`,
`adresse`, `numero_agrement` et `role_provisioned_at` pour authenticated.

Le profil propre complet utilise `get_my_profile()` sans paramètre d'UID ;
l'annuaire utilise `get_business_partners()`. Tous deux sont testés avec de vrais
JWT fictifs. Une pharmacie ne lit pas les scans d'un autre auteur ; le DPH validé
conserve sa supervision. Les 30 tests P02 restent verts.

Rupture assumée : un ancien écran connecté faisant SELECT `*` sur les profils
reçoit 403. Ce n'est pas le chemin du vieux vérificateur public critique, dont les
colonnes/jointures nécessaires restent techniquement lisibles et vides. Les
comptes historiques n'ont pas été approuvés pour contourner cette rupture.

## H. Vues

Les quatre vues métier actuelles portent `security_invoker=true` :
`lots_avec_fabricant`, `stats_dashboard`, `business_lots`, `supervision_stats`.
Les deux anciennes vues n'ont donc plus leurs privilèges implicites de propriétaire.

| Appel PostgREST réel | Obtenu |
| --- | --- |
| Anciennes vues anon | 200 `[]`, pas d'erreur de relation sous-jacente |
| Vue lots fabricant validé | Seulement ses lots ; téléphone NULL |
| Vue lots pharmacie validée | Seulement le lot associé au transfert fictif ; téléphone NULL |
| Vue lots DPH validé | Supervision attendue ; téléphone NULL sur toutes les lignes |
| Statistiques DPH validé | Une ligne d'agrégats |
| Statistiques autres rôles | Vide |

Les grants sur lots, scans, profils et alertes ont été pris en compte pour les
vues invoker. Le SELECT anon conservé sur alertes ne donne aucune ligne et évite
une erreur de permission dans les anciennes statistiques.

## I. SECURITY DEFINER et advisors

Tous les objets ci-dessous appartiennent à postgres. Aucun SQL dynamique dans
les fonctions concernées. Le code et les ACL effectifs ont été relus après B2.

| Fonction | Mode / besoin | anon | authenticated | Paramètres / identité | search_path | Risque résiduel |
| --- | --- | --- | --- | --- | --- | --- |
| `verify_public_lot(text)` | definer : résoudre un code sans ouvrir les tables | oui | oui | ASCII 1–100 ; correspondance exacte ; pas d'UID ; six champs | vide | Codes devinables, répétition sans rate limit, aucune preuve physique |
| `get_my_role()` | definer : vérifier le provisionnement indépendamment des RLS profils | oui | oui | Aucun paramètre ; UID JWT, validation opérateur et statut actif | vide | Session compromise ; aucun rôle issu de metadata utilisateur |
| `get_my_profile()` | definer : contacts du seul profil propre | non | oui | Aucun paramètre ; auth.uid() seul | vide | Données propres accessibles à une session compromise |
| `get_business_partners()` | definer : annuaire minimal sans profils privés | non | oui | Rôle validé, rôle opposé actif/validé ; aucun UID cible | vide | Énumération métier voulue, quatre champs |
| `get_manufacturer_catalog(uuid)` | definer : catalogue sans stock/UUID lot | non | oui | UUID fabricant typé ; pharmacie et fabricant validés | vide | Catalogue inter-fabricants voulu ; trois champs |
| `record_verification_scan(text)` | definer : écriture autoritaire malgré no-op direct | non | oui | Identifiant seul ; UID/rôle/lot/verdict calculés | vide | Spam/doublons d'un compte validé, règles date P29 |
| `private.resolve_verification_lot(text)` | invoker, helper non exposé | non | non | Code validé, ambiguïté refusée | vide | Utilisé seulement via wrappers contrôlés |
| `private.discard_legacy_scan()` | invoker, trigger no-op | non | non | Aucun argument ; current_user technique, pas un flag client | vide | Dette transitoire et coût de requêtes inutiles |
| `auto_alerte_scan_suspect()` | invoker, trigger d'alerte contrôlée | non | non | Auteur UID et rôle contrôlés ; pas d'appel RPC client | vide | Dépend du seul chemin d'écriture contrôlé |
| `private.provision_business_profile(...)` | invoker, opérateur P02 seulement | non | non | UID cible admis uniquement à postgres, rôle/statut/motif explicites ; pas une API client | vide | Privilège opérateur de confiance, testé par P02 |
| `private.audit_profile_authority()` | invoker, audit du profil P02 | non | non | Trigger sur colonnes d'autorité protégées, motif contrôlé | vide | Journal privé, aucun accès client |
| `handle_new_user()` | invoker, passage Auth sans provisionnement | non | non | Aucun rôle issu de metadata ; retourne le nouveau compte | vide | Aucun droit métier accordé par signup |
| `update_updated_at()` | invoker, ancien trigger de timestamp | oui | oui | Aucun UID ; pas de lecture/écriture de table autonome | non fixé | WARN historique conservé, hors correction d'alerte |

Les six definer légitimes restent documentées et contrôlées. Elles n'ont pas été
converties artificiellement pour masquer l'advisor.

| Advisor sécurité | Avant B2 | Après nettoyage B2 |
| --- | ---: | ---: |
| Vues definer, ERROR | 2 | **0** |
| Search path mutable, WARN | 2 | **1** |
| Definer exécutable anon, WARN | 3 | **2** |
| Definer exécutable authenticated, WARN | 7 | **6** |
| RLS sans policy, INFO | 1 | 1 (audit privé volontairement inaccessible) |
| Protection mots de passe compromis, WARN | 1 | 1 (réglage inchangé) |

Le search_path restant concerne `update_updated_at()`, pas le trigger d'alerte.
Performance : 7 FK sans index, 12 avis initplan RLS, 7 index inutilisés et 24
policies permissives multiples après nettoyage. Les statistiques d'index varient
avec l'usage ; aucune optimisation ni ajout d'index n'est revendiqué. Les advisors
ne sont pas intégralement verts.

Références : [fonctions Supabase](https://supabase.com/docs/guides/database/functions),
[vues](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
[search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[RPC anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[RPC authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## J. Nouveau client de production

Les 26 contrôles navigateur passent après B2, sans changement de code ni redéploiement :
page principale, code connu/inconnu/FAB absent/invalide, URL QR collée valide et
invalide, archive, expiration, ambiguïté, panne RPC limitée au navigateur, absence
de fallback brut, deux comptes sans autorité, pharmacie validée, transfert associé,
journal secondaire en erreur, absence/indisponibilité pharmacie, profil propre,
catalogue, détail fabricant, annuaire pharmacie et supervision DPH.

La production reste sur `dpl_HHgjvx39Fr1wGc7YWvwwSUsmEyF9` ; la vitrine reste sur
`dpl_BrmvqJRY2Gp7kx4auXHNMF2N9qW6`. Le bundle publié reste celui de B1. Aucun
rebuild/export supplémentaire n'est nécessaire : ni app/lib ni dépendances ne
sont modifiées. Les deux comptes sans autorité testés sont fictifs, dont un profil
avec ancien libellé `agent_dph` sans validation ; aucun compte historique approuvé.

## K. Vrai ancien bundle

Bundle exact `entry-ed3cdeac3690e5e42916a0cbc1c24fad.js`, chargé depuis l'ancienne
URL immuable protégée, avec l'authentification Vercel existante. Avant bascule,
les requêtes sont transmises au vrai PostgREST des copies, sans fabriquer les
réponses. Après bascule, le même bundle utilise directement les vrais noms de
production, sans interception/redirection des appels DB.

| Cas | Résultat avant et après B2 |
| --- | --- |
| FAB absent | Ancien écran « suspect », aucun faux AUTHENTIQUE |
| Code ordinaire absent | Même résultat |
| Lot fictif connu | Ancienne lecture publique volontairement vide, même résultat |
| Journal legacy de chaque parcours | 201 vide ; aucun scan/alerte persistant |

Les trois scénarios passent sur chaque terrain. En production, après les tests
HTTP modernes et les trois parcours anciens, il reste exactement deux scans et
une alerte fictifs issus des seules RPC modernes ; aucun ajout par le vieux bundle.

## L. Invariance des données et nettoyage

| Ensemble historique | Avant | Après nettoyage | Comparaison |
| --- | ---: | ---: | --- |
| Auth | 3 | 3 | Champs non credentials exportés identiques |
| Profils | 3 | 3 | Toutes lignes/colonnes identiques |
| Lots | 6 | 6 | Toutes lignes/colonnes identiques |
| Transferts | 10 | 10 | Toutes lignes/colonnes identiques |
| Demandes | 7 | 7 | Toutes lignes/colonnes identiques |
| Scans | 14 | 14 | Toutes lignes/colonnes identiques |
| Alertes | 8 | 8 | Toutes lignes/colonnes identiques |

Cinq comptes `example.invalid`, quatre profils fictifs, cinq lots, un transfert,
quatre scans modernes, deux alertes contrôlées et quatre traces de provisionnement
fictives ont été retirés de production après export de preuves. Les copies de
répétition et leurs données sont également exportées puis retirées : 11 relations,
11 fonctions préfixées et leurs triggers/policies, uniquement selon manifeste.
Nettoyage transactionnel borné aux noms/UUID/codes exacts, sans CASCADE global.

Zéro compte/profil/lot/audit fictif et zéro objet `b2p_2810_*` subsistent.
Les sessions de test ont été déconnectées, puis les identités Auth fictives retirées.
Les trois profils historiques gardent `role_provisioned_at=NULL`. Les politiques
d'écriture transferts/demandes sont comparées et **strictement inchangées**.

Les preuves sont conservées dans le dossier ignoré
`A exclure de github/LOT03B2_20261028/`. Il contient des données privées et des
mots de passe fictifs : ne pas le publier. Aucun audit historique ni log fournisseur
n'a été effacé. Les gaps de séquences et logs techniques normaux des répétitions
ne constituent pas une modification des lignes historiques exportées ; aucune
restauration physique bit à bit n'est revendiquée.

## M. Tests et commandes

| Validation | Avant application | Après application |
| --- | ---: | ---: |
| SQL B2, fixtures rollbackées | 60/60 | 60/60 |
| SQL P02, fixtures rollbackées | 30/30 | 30/30 |
| HTTP/SDK | 41/41 sur copies | 41/41 sur production |
| Ancien bundle réel | 3/3 sur copies | 3/3 sur production |
| Nouveau client navigateur | 26/26 sur copies | 26/26 sur production |
| Suite locale | 67/67 | Source client inchangée |
| TypeScript | Succès | Source client inchangée |
| Smoke anonyme après nettoyage | — | 6/6 |

La suite locale conserve 39 LOT 0.1, 11 rôles, 13 LOT 0.3 et 4 A. Les anciennes
59 assertions sont gardées comme inventaire historique ; leurs attentes de
permission refusée sont remplacées par les 60 assertions B2 vides/no-op. Ne pas
présenter un nouveau « 59/59 » pour une suite incompatible.

Commandes et appels principaux :

```text
git status --short / git branch --show-current / git rev-parse HEAD
git diff --cached --check / git diff --cached --stat
git commit -S -m "chore(security): prepare legacy access shutdown"
git verify-commit HEAD
MCP execute_sql (snapshots, répétitions rollbackées, copies/fixtures et nettoyage borné)
node scripts/prepare-lot03b2-rehearsal.cjs --candidate
node scripts/prepare-lot03b2-rehearsal.cjs --installed
node <http-checks.cjs privé> / node <legacy-real.cjs privé> / node <browser-checks.cjs privé>
B2_PREFIX='' B2_PHASE=production (équivalent variables PowerShell pour les tests directs)
npm test
.\node_modules\.bin\tsc.cmd --noEmit
supabase --version / supabase migration new --help
supabase migration new restrict_legacy_public_access
MCP apply_migration restrict_legacy_public_access (MVP autorisé uniquement)
MCP list_migrations / get_advisors security et performance
MCP Vercel get_deployment (app et vitrine, lecture seule)
git diff --check / git diff --stat / Get-FileHash -Algorithm SHA256 <deux vidéos>
git commit -S -m "fix(security): restrict legacy public database access"
git verify-commit HEAD
```

Playwright fourni par le runtime Codex utilise Edge installé. Aucun package,
navigateur, CLI ou abonnement n'a été installé/mis à jour. La CLI a seulement
rafraîchi son fichier local `supabase/.temp/cli-latest` ; cette modification générée
a été remise à sa valeur initiale, hors commit.

## N. Git et fichiers

Branche `hardening/public-readiness-20261027`. HEAD avant B1 :
`ee511b0ffc822c01a244a739a1d47dac07e3b617`, puis commit B1 `cdbf0e1…`.
Le commit B2 séparé qui contient ce rapport est signé ; son SHA est fourni dans
le retour de checkpoint. Aucun amend, rebase, reset, push ou merge.
`main` reste `f64f2c4cf5fd2d4e47816692d1350360f54196c5`.

Fichiers B2 :

- `app/PharmaTrace/supabase/migrations/20261028232100_restrict_legacy_public_access.sql` : migration appliquée ;
- `app/PharmaTrace/supabase/pending/20261027205457_restrict_legacy_verification_access.sql` déplacé vers `docs/archive/lot-03b2-guarded-preflight.sql` : preuve gardée ;
- `app/PharmaTrace/supabase/pending/README.md` : état appliqué et commandes actuelles ;
- `app/PharmaTrace/scripts/prepare-lot03b2-rehearsal.cjs` : répétition et validation installée, rollback systématique ;
- `app/PharmaTrace/scripts/prepare-lot03-rehearsal.cjs` : redirection explicite de l'ancien mode restrictif ;
- `app/PharmaTrace/supabase/tests/p03b2_legacy_compat.sql` : 60 assertions adaptées ;
- `docs/lot-03b2-restriction.md` : ce rapport.

Les deux vidéos non suivies restent hors commit et inchangées :

| Fichier | Octets | SHA256 |
| --- | ---: | --- |
| `ressources/docs/PHASE_2_DEMIFINAL/demo_prototype_phase 2.mp4` | 44245834 | `434cce24536b683735ad335e9f774259b91dd7a7619c55043792ce3b60bb288d` |
| `ressources/docs/PHASE_3_FINALE/demo_Pitch_MVP_Phase 3.mp4` | 39607226 | `63bc7f07038000203286c569f52022cf076f72c883537f4bc4b8bde7f24c1d83` |

## O. Reclassification

- **P03 DONE** : lots/scans/profils anonymes vides ; profils privés globaux fermés ;
  périmètres métier et RPC publique minimale testés en production.
- **P04 DONE** : deux anciennes vues invoker, téléphone NULL, rôles et relations
  sous-jacentes testés par PostgREST ; leurs deux ERROR advisors disparaissent.
- **P05 PARTIAL** : écritures forgées sans persistance, alertes brutes fermées,
  identité/verdict serveur et journal moderne prouvés. Le privilège INSERT legacy
  absorbé demeure une dette de transition explicite, pas une écriture autoritaire.
- **P06 OPEN** : aucune modification de ses politiques d'écriture/transitions.
- **P10 OPEN** pour l'ouverture automatique de `/verify?hash=...` ; pas de correction
  éditoriale globale P11, de décision licence ou de fermeture d'autres IDs.

Retirer ultérieurement le no-op demandera une décision et un test des versions
clientes encore utilisées. Aucun TTL de cache ne prouve que les vieux onglets ont
disparu ; une date arbitraire de suppression n'est pas proposée. Jusqu'à cette
décision, les requêtes legacy valides sont absorbées mais restent un coût API.

## P. Limites et incidents de préparation

Le no-op empêche les erreurs nouvelles introduites par B2 pour les formes legacy
valides testées. Il n'efface pas le vieux JavaScript : une panne transport ou une
requête invalide avant trigger peut toujours déclencher son ancien catch. La
garantie absolue de tous les vieux bundles hors ligne n'est pas revendiquée.
Le vocabulaire « suspect » de l'ancien écran reste imparfait ; il n'est pas changé
dans cette étape. Aucune preuve d'authenticité physique, de résistance à la copie,
de contrôle de débit, d'atomicité des transferts ou de validation Android terrain.

Les tentatives de préparation suivantes sont conservées comme preuves :
deux erreurs de renommage de policies dans le montage des copies, une chaîne
téléphone fictive trop longue, un timeout de navigation du navigateur après
interruption, et deux erreurs d'ordre de dépendances pendant leur nettoyage.
Chaque erreur SQL a annulé sa transaction. Le montage a été corrigé, tous les
gates sont passés avant application et le nettoyage a finalement réussi sans
CASCADE, sans toucher la migration déjà appliquée ou les objets historiques.

Le timeout a été observé dans l'attente complète de chargement de page ; le HTTP
public restait 200. Le scénario rejoué avec attente DOM puis éléments applicatifs
est vert. Ce résultat ne remplace pas un audit général des intermittences Auth,
du réseau ou de la gestion d'erreurs P24.

**STOP après B2. LOT 0.4 et P06 attendent un nouveau contre-audit.**
