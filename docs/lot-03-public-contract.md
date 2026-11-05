# LOT 0.3 — Vérification publique minimale, vues et événements

> Rapport historique de préparation. Le plan monolithique, notamment la section N,
> est remplacé par [LOT 0.3A](lot-03a-additive.md). Migration A appliquée ; B préparée
> dans `supabase/pending/`, non appliquée. Les constats ci-dessous décrivent le
> checkpoint antérieur, pas l'état distant actuel.

Checkpoint du 27 octobre 2026. **Migration candidate seulement testée puis rollbackée.**
Ni application finale au MVP, ni déploiement, ni push. Arrêt avant le cutover et LOT 0.4.

## A. Frontière Git LOT 0.2

Branche : `hardening/public-readiness-20261027`.
Commit local LOT 0.2 : `ba883eed5af46c850985a31125e1fac45fa6f272`,
`fix(auth): require managed business role provisioning`.
Signature RSA valide : `513338E2587B325480AD83D17EE25184789B78E3`.
GPG indique une confiance locale inconnue ; ce n'est pas une signature invalide.
Le wrapper GPG avait hérité d'un PSModulePath incompatible ; seul l'environnement
du processus enfant a été corrigé. Aucune configuration GPG ni clé n'a été modifiée.
Après commit, seuls les deux MP4 historiques restaient non suivis.
Contrôles de gel : 50/50 tests, 30/30 P02, TypeScript, export web 34 routes, hashes vidéo.

## B. DB avant LOT 0.3 et checkpoint

Projet MVP autorisé `qctedpyydisawsknahso`, PostgreSQL 17.6.1.121, ACTIVE_HEALTHY.
Quatre migrations distantes, la dernière étant `20261027153134_harden_business_role_provisioning`.
Trois comptes/profils, six lots, dix transferts, sept demandes, quatorze scans, huit alertes.
Aucun profil historique validé. P02 est déjà appliqué ; P03–P06 restent ouverts.

Les catalogues, données métier, champs Auth non secrets et advisors avant/après
sont conservés dans `A exclure de github/LOT03_20261027/`, dossier ignoré.
Il contient des données privées : ne pas le publier. Le checkpoint logique ne
contient pas les secrets Auth et ne remplace pas un backup physique complet.

Après répétition, les valeurs de toutes les lignes/colonnes exportées sont
identiques. Quatre migrations distantes seulement ; les nouvelles RPC sont absentes.
Les vues persistantes restent dans leur état antérieur. Aucun compte LOT02/LOT03,
aucune trace d'audit fictive et aucune validation de profil historique ne subsistent.

## C. Carte des consommateurs et compatibilité

Recherche effectuée sur tous les appels `.from`, `.rpc`, relations imbriquées et
noms des deux vues dans `app/PharmaTrace/app` et `lib`. Les besoins sont les suivants.

| Accès DB actuel | Écrans consommateurs | Client publié ancien dépendant ? | Nouveau client local | Application immédiate des révocations ? |
|---|---|---|---|---|
| lots + jointure fabricant pour vérification | public/verify ; pharmacie/verifier, via lib/verification | Oui | verify_public_lot, six champs | NON : vérification ancienne cassée |
| INSERT historique_scans choisi par client | les deux vérificateurs | Oui | anonyme désactivé ; RPC contrôlée pour comptes validés | NON : ancien journal incompatible |
| profils SELECT * propre compte | fabricant/compte ; pharmacie/compte | Oui | get_my_profile, UID implicite | NON : ancien SELECT * refusé |
| profils nom/ville propres | fabricant/index ; pharmacie/index | Oui | lecture des mêmes colonnes permise | Oui pour cette lecture seule |
| annuaire pharmacies id/nom/adresse/ville | fabricant/nouveau-transfert | Oui | id/nom/ville ; adresse retirée | NON : ancienne colonne adresse refusée |
| annuaire fabricants id/nom, filtre rôle/statut | pharmacie/demandes | Oui | projection minimale avec RLS des partenaires validés | Oui, pour les profils admissibles |
| catalogue fabricant depuis lots | pharmacie/demandes | Oui | get_manufacturer_catalog, trois champs médicament | NON : anciens lots non associés masqués |
| lots propres, détails et comptages | fabricant/index, lots, nouveau-lot, nouveau-transfert, demandes, transferts, compte | Oui | lectures propres préservées pour fabricant validé | Rôle validé requis depuis LOT 0.2 |
| lots associés à un transfert | pharmacie/index, stock, transferts, compte, verifier | Oui | RLS destinataire ; identité interne obtenue du transfert autorisé | Préservé pour pharmacie validée |
| noms/ville/pays de partenaires imbriqués | fabricant/transferts, demandes ; pharmacie/transferts, stock, demandes ; DPH/lots, alertes | Oui | colonnes minimales, partenaires/relations ou DPH | Testé en SQL ; transport PostgREST à vérifier au cutover |
| lots_avec_fabricant | fabricant/[id] ; DPH/lots | Oui | même nom, invoker, RLS ; téléphone NULL | Préservé pour rôles validés |
| stats_dashboard | DPH/index uniquement | Oui | invoker + filtre DPH, calculs conservés | DPH validé seulement |
| historique_scans SELECT | pharmacie/index et compte | Oui | scans propres seulement, rôle validé | Pas de lecture anonyme globale |
| alertes SELECT/UPDATE | DPH/alertes ; pharmacie/index (comptage soumis RLS) | Oui | lectures existantes ; UPDATE DPH conservé | INSERT public supprimé au cutover |
| transferts/demandes INSERT/UPDATE | écrans métier existants | Oui | politiques et opérations d'écriture inchangées | P06 reste LOT 0.4 |

Le propriétaire confirme que le site publié utilise encore l'ancien client.
La source `main` (`f64f2c4...`) a été relue : son catch FAB-* peut fabriquer un succès
après erreur DB. **Révoquer maintenant pourrait aussi déclencher ce fallback.**
Ce rapport ne prétend pas avoir établi un SHA exact du bundle actuellement servi.

## D. Contrat public exact

`verify_public_lot(p_identifier text)` : EXECUTE réservé à anon et authenticated.
Paramètre obligatoire, 1–100 caractères ASCII lettres/chiffres/tiret/underscore.
Le client extrait un identifiant d'une URL QR et enlève les espaces extérieurs ;
la DB exige ensuite le format exact. Pas de SQL dynamique issu de la saisie.

Comparaison exacte du numéro ou du hash, sensible à la casse ; aucun préfixe,
wildcard, pagination ou paramètre d'identité. Zéro ligne si absent, une ligne si
correspondance unique ; ambiguïté numéro/hash = erreur 21000, jamais premier lot.
Entrée invalide = 22023. Erreur technique côté client = UNAVAILABLE.

| Champ | Type / règle |
|---|---|
| numero_lot | texte du lot trouvé |
| nom_medicament | texte |
| dosage | texte ou NULL |
| fabricant_public | nom d'entité fabricant ou NULL |
| date_expiration | date PostgreSQL |
| etat | enregistre ou archive, selon les marqueurs d'archivage |

Pas de téléphone, adresse, ville, stock, UUID, hash retourné, historique,
scan ou métadonnée de sécurité. Un seul code exact est recherchable par appel.
Cela empêche le listing général et les wildcards, **pas les essais répétés de codes
exacts devinés** : aucun rate limiting ni garantie anti-bruteforce n'est ajouté.

SECURITY DEFINER est nécessaire pour cette projection après révocation du SELECT
anon sur les tables. Le chemin est fixe, sans SQL dynamique ; retour typé à six
colonnes, search_path vide, helper privé sans EXECUTE client, grants explicites.
Le résultat prouve une correspondance au registre, pas l'authenticité physique.

## E. Migration et répétition reproductible

SQL intégral :
`docs/archive/lot-03-monolithic-candidate.sql` (ancien candidat, jamais appliqué).
Fichier créé via `supabase migration new harden_public_verification_and_events`.
Aucune migration historique modifiée ; aucune entrée LOT 0.3 dans l'historique distant.

Le générateur `scripts/prepare-lot03-rehearsal.cjs` lit exactement la migration,
les définitions P02 et les assertions LOT03. Il produit du SQL, sans connexion DB.
Le SQL exécute DDL + P02 + LOT03 dans une sous-transaction puis l'annule avant
de retourner les résultats. Lock timeout local de trois secondes.

```powershell
# Depuis app/PharmaTrace ; le fichier produit est une répétition, pas un apply.
node .\scripts\prepare-lot03-rehearsal.cjs | Set-Content -Encoding utf8 $lot03RehearsalFile
```

Le SQL généré a été exécuté sur le MVP autorisé par execute_sql.
**30/30 P02 et 59/59 LOT03 réussis, rollback complet du candidat et des fixtures.**
Le premier essai s'était arrêté sur un téléphone fictif trop long ; cette fixture
a été corrigée avant les passages réussis. Aucune ligne historique modifiée.

## F. Résultats SQL/RLS

Tous les résultats ci-dessous sont observés dans le schéma candidat transactionnel.
Refus = erreur 42501, sauf entrée/ambiguïté explicitement indiquée. Les assertions
de zéro ligne distinguent le filtrage RLS d'une erreur de permission.

| Test | Acteur / action | Attendu | Obtenu |
|---|---|---|---|
| A01 | anon SELECT lots | refus | refus |
| A02 | anon SELECT scans | refus | refus |
| A03 | anon SELECT profils | refus | refus |
| A04 | anon vue lots | refus | refus |
| A05 | anon vue stats | refus | refus |
| A06 | anon code connu | médicament/fabricant fictifs exacts | conformes |
| A07 | anon clés de réponse | six clés exactes | conformes |
| A08 | anon contenu privé | aucun UUID/coordonnée | absent |
| A09 | anon code inconnu | zéro ligne | zéro |
| A10 | anon hash exact | une ligne | une |
| A11 | anon entrée NULL | 22023 | 22023 |
| A12 | anon entrée vide | 22023 | 22023 |
| A13 | anon wildcard | 22023 | 22023 |
| A14 | anon syntaxe de filtre | 22023 | 22023 |
| A15 | anon longueur 101 | 22023 | 22023 |
| A16 | anon préfixe seul | pas de listing | zéro ligne |
| A17 | anon scan/verdict choisi | refus | refus |
| A18 | anon faux scanneur DPH | refus | refus |
| A19 | anon alerte auteur/niveau choisis | refus | refus |
| A20 | anon RPC journal | refus | refus |
| A21 | anon appel fonction trigger | refus | refus |
| A22 | anon RPC profil propre | refus | refus |
| B01 | non provisionné SELECT lots | zéro ligne | zéro |
| B02 | non provisionné SELECT scans | zéro ligne | zéro |
| B03 | non provisionné sans profil, annuaire | zéro ligne | zéro |
| B04 | non provisionné vues | zéro ligne | zéro |
| B05 | non provisionné vérification publique | une correspondance minimale | conforme |
| B06 | non provisionné RPC journal | refus | refus |
| B07 | non provisionné catalogue | refus | refus |
| B08 | non provisionné INSERT alerte | refus | refus |
| C01 | fabricant lots propres | trois fixtures propres | trois |
| C02 | fabricant lot d'un autre | zéro ligne | zéro |
| C03 | fabricant profil fabricant sans relation | zéro ligne | zéro |
| C04 | fabricant colonnes privées des profils | refus | refus |
| C05 | fabricant RPC profil propre | contacts propres, UID propre | conformes |
| C06 | fabricant vue lots | trois propres, téléphone NULL | conforme |
| C07 | fabricant stats nationales | zéro ligne | zéro |
| C08 | fabricant jointure destinataire transfert | nom pharmacie partenaire | conforme |
| C09 | fabricant scans après journal | son seul scan | un |
| D01 | pharmacie lots | seul lot transféré | un |
| D02 | pharmacie catalogue fabricant | médicament actif non expiré seulement | un |
| D03 | pharmacie scans d'autrui | zéro ligne | zéro |
| D04 | pharmacie jointure fabricant demande | nom partenaire | conforme |
| D05 | pharmacie stats nationales | zéro ligne | zéro |
| D06 | pharmacie journal code connu | identité/type/verdict DB | conformes |
| D07 | pharmacie journal lot expiré | expire calculé DB | conforme |
| D08 | pharmacie journal inconnu | non_trouve, lot NULL | conforme |
| D09 | pharmacie alerte auto | auteur réel, info fixé DB | conforme |
| D10 | pharmacie journal lot archivé | 22023, aucun verdict positif fabriqué | conforme |
| D11 | pharmacie lecture lot archivé | etat archive | conforme |
| D12 | pharmacie INSERT scan brut | refus | refus |
| E01 | DPH lots de supervision | lot tiers visible | conforme |
| E02 | DPH scans de supervision | quatre scans fictifs visibles | quatre |
| E03 | DPH alerte de supervision | alerte contrôlée visible | conforme |
| E04 | DPH stats | une ligne agrégée | une |
| E05 | DPH vue lots | lot tiers visible | conforme |
| F01 | opérateur catalogue des vues | deux security_invoker | deux |
| F02 | opérateur configuration RPC | quatre search_path fixés | conformes |
| F03 | opérateur collision numéro/hash | 21000, pas premier résultat | conforme |

Ces tests sont PostgreSQL/JWT/RLS, pas des tests HTTP PostgREST/email/mobile.
Les lectures historiques de transferts/demandes propres à une partie restent
définies par les anciennes politiques P06, y compris pour un ancien profil non
validé : aucune garantie globale nouvelle n'est revendiquée sur ces tables.

## G. Vues et profils

`lots_avec_fabricant` est utilisée, donc conservée : même nom/colonnes, mais
security_invoker=true, aucun grant anon, SELECT authenticated sous RLS, téléphone
toujours NULL. Fabricant : lots propres ; pharmacie : lots associés ; DPH : supervision.
La projection publique n'utilise pas cette vue.

`stats_dashboard` est consommée seulement par DPH/index : invoker et filtre
get_my_role=agent_dph, anon refusé, zéro ligne pour les autres comptes. Les cinq
calculs historiques sont conservés. Le compteur pharmacies_actives ne valide
toujours pas réellement activité/provisionnement ; les tendances décoratives du
dashboard ne sont pas corrigées ici (P11/P19).

Profils bruts : anon sans SELECT ; authenticated n'a SELECT que sur
id/nom_entite/ville/pays/role/statut, avec RLS propre profil, partenaires nécessaires
ou DPH validé. L'annuaire couvre les partenaires actifs validés de l'autre rôle et
les relations historiques de transfert/demande ; aucun profil administratif global.
Les contacts propres sont lus via get_my_profile(), sans paramètre d'identité.
Les grants UPDATE P02 restent limités aux contacts propres.

get_manufacturer_catalog(uuid) est réservé à une pharmacie validée ; trois champs
médicament, sans stock ni UUID de lot. Son UUID fabricant est une référence métier
authentifiée, pas un paramètre de la vérification publique.

## H. Scans et alertes

Option A retenue : journalisation anonyme désactivée, sans erreur secondaire UI.
Un compte validé utilise record_verification_scan(code), seul paramètre accepté.
La DB détermine auth.uid, rôle effectif, type du scanneur, lot et verdict ; aucun
INSERT brut client n'est accordé, même après connexion. Lecture : propres scans
pour rôle validé, supervision DPH, aucun scan anonyme lisible publiquement.

Une lecture trouvée reste FOUND si son journal échoue. Le résultat est affiché
avant le journal. Un compte non validé ne peut pas utiliser la RPC de journal.
Un lot archivé reste une correspondance FOUND avec état archive ; les écrans
l'affichent comme archivé et aucune réception n'est proposée. La RPC refuse de le
journaliser comme un succès actif ; cet échec reste secondaire.

auto_alerte_scan_suspect est à présent INVOKER, search_path fixé, EXECUTE client
révoqué. Le trigger est utilisé à l'intérieur de la RPC contrôlée : code absent,
auteur réel, niveau info fixé DB, pas de ville fournie par le client. Un code
absent ne justifie plus automatiquement une alerte critique. L'UPDATE DPH existant
et les alertes historiques sont conservés. Pas de nouvelle analytics ni anti-abus global.

## I. Cutover : incompatibilité explicite

**Ne pas appliquer le fichier actuel sur le site ancien encore ouvert.**
L'ancien vérificateur perdrait ses lectures et écritures ; le code main possède
même encore le fallback FAB-* positif sur exception. Le nouveau client, lui,
répond UNAVAILABLE si les RPC ne sont pas installées ; il ne revient jamais au SELECT large.
Il n'a pas été déployé et son mode réel ne fonctionne donc pas encore contre le MVP courant.

## J. Tests application et commandes

- 63/63 tests Node : 39 régressions LOT 0.1 adaptées au transport RPC, 11 rôles LOT 0.2 inchangées,
  13 nouveaux tests LOT 0.3. Le harnais interdit explicitement les accès bruts lots/profils/scans.
- Pour les tests de journalisation réelle, le harnais utilise une session fictive ;
  un nouveau test distinct vérifie l'absence de journal anonyme. Aucun test physique revendiqué.
- Nouveaux cas : anonyme sans journal ; QR normalisé/projection sans champs supplémentaires ;
  RPC absente sans fallback ; réponse ambiguë/état inconnu ; journal sans identité/verdict
  client ; archives sur les deux écrans ; identité issue du transfert autorisé ;
  incohérence du transfert secondaire ; profil propre ; catalogue minimal ; erreurs
  de workflow sans fallback ; profil/catalogue démo locaux.
- TypeScript : code 0. Export web : code 0, 34 routes, URL/key fictives, .env désactivé.
- Checklist React appliquée : séparation résultat/effets secondaires conservée,
  protection contre réponse tardive conservée, Promise.all journal/transfert,
  aucun nouvel effet ou dépendance ; états existants et accessibilité préservés.

Commandes : npm.cmd test ; .\node_modules\.bin\tsc.cmd --noEmit --incremental false ;
node scripts/prepare-lot03-rehearsal.cjs ; export Expo web --max-workers 2 ;
git diff --check/stat/name-only ; git status --short --untracked-files=all ;
git verify-commit HEAD ; Get-FileHash SHA256. Aucun install/update de dépendance.
L'export est hors dépôt, dans un dossier temporaire dédié.

## K. Advisors : ce qui est réellement mesuré

get_advisors sécurité et performance a été appelé avant et après rollback.
Il ne peut pas inspecter le schéma non commité d'une autre connexion MCP.

| Advisor persistant | Avant | Après rollback |
|---|---:|---:|
| security_definer_view ERROR | 2 | 2 |
| function_search_path_mutable WARN | 2 | 2 |
| anon_security_definer_function_executable WARN | 2 | 2 |
| authenticated_security_definer_function_executable WARN | 2 | 2 |
| auth_leaked_password_protection WARN | 1 | 1 |
| rls_enabled_no_policy INFO | 1 | 1 |
| unindexed_foreign_keys | 7 | 7 |
| auth_rls_initplan | 13 | 13 |
| unused_index | 20 | 12 |
| multiple_permissive_policies | 24 | 24 |

La baisse d'index « inutilisés » correspond à l'observation d'usage, sans suppression
ou création d'index ; aucune amélioration structurelle de performance n'en est déduite.

Dans le candidat, l'introspection transactionnelle confirme zéro vue sans invoker
et les quatre nouvelles RPC avec search_path fixé. Ce n'est pas un rapport advisor
sur un schéma déployé. Cinq fonctions definer publiques restent intentionnelles :
get_my_role, verify_public_lot, get_my_profile, get_manufacturer_catalog,
record_verification_scan. Seules les deux premières sont exécutables par anon.
Les advisors pourront donc encore signaler ces fonctions encadrées après application.
Le search_path historique de update_updated_at et la protection mots de passe restent hors lot.

Remédiations officielles :
[vues](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
[search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[fonctions anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[fonctions authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
Références de conception : [RLS et vues](https://supabase.com/docs/guides/database/postgres/row-level-security),
[fonctions et privilèges](https://supabase.com/docs/guides/database/functions).

## L. Git, preuves et fixtures

LOT 0.3 reste non commité/non indexé ; HEAD reste le commit signé LOT 0.2.
Huit fichiers suivis modifiés : six écrans, lib/verification.ts, tests/verification.test.cjs.
Cinq fichiers nouveaux : workflowReads.ts, migration, p03_public_contract.sql,
prepare-lot03-rehearsal.cjs et ce rapport. Les MP4 historiques restent hors commit.
Anciennes migrations, lib/supabase.ts, lockfile, main, GitHub settings et Vercel inchangés.

Manifest exact des fichiers LOT 0.3 (M = modifié ; A = nouveau, non indexé) :

```text
M app/PharmaTrace/app/(fabricant)/compte.tsx
M app/PharmaTrace/app/(fabricant)/nouveau-transfert.tsx
M app/PharmaTrace/app/(pharmacie)/compte.tsx
M app/PharmaTrace/app/(pharmacie)/demandes.tsx
M app/PharmaTrace/app/(pharmacie)/verifier.tsx
M app/PharmaTrace/app/(public)/verify.tsx
M app/PharmaTrace/lib/verification.ts
M app/PharmaTrace/tests/verification.test.cjs
A app/PharmaTrace/lib/workflowReads.ts
A app/PharmaTrace/scripts/prepare-lot03-rehearsal.cjs
A docs/archive/lot-03-monolithic-candidate.sql (archive du candidat non appliqué)
A app/PharmaTrace/supabase/tests/p03_public_contract.sql
A docs/lot-03-public-contract.md
```

Deux vidéos, tailles et SHA256 inchangés :

- PHASE_2_DEMIFINAL/demo_prototype_phase 2.mp4 : 44245834 octets,
  434cce24536b683735ad335e9f774259b91dd7a7619c55043792ce3b60bb288d.
- PHASE_3_FINALE/demo_Pitch_MVP_Phase 3.mp4 : 39607226 octets,
  63bc7f07038000203286c569f52022cf076f72c883537f4bc4b8bde7f24c1d83.

Par passage LOT03 : cinq comptes Auth lot03_test_<UUID>@example.invalid ; quatre
profils LOT03_TEST_MAKER/OTHER/PHARMACY/DPH ; quatre lots LOT03_TEST_<UUID> (actif,
autre fabricant, expiré, archivé) ; un transfert ; une demande ; quatre scans
calculés ; une alerte info ; quatre traces de provisionnement. Toutes les lignes
sont rollbackées. Les tentatives forgées refusées n'insèrent rien. Le test de
collision ne modifie qu'un lot fictif. P02 crée ses propres fixtures internes
puis les annule également. Aucune suppression d'historique ou utilisateur réel.
Les séquences peuvent avancer malgré un rollback.

## M. Reclassification

- P03 : PARTIAL — contrat minimal et minimisation SQL/client testés ; cutover non appliqué.
- P04 : PARTIAL — deux vues sécurisées dans le candidat ; DB persistante encore inchangée.
- P05 : PARTIAL — écritures forgées bloquées dans le candidat et client adapté ; cutover restant.
- P02 : PARTIAL inchangé — sécurité DB corrigée/testée ; HTTP/email, déploiement et terrain non démontrés.
- P06 : OPEN, aucune politique d'écriture/transitions/stock/atomicité corrigée.
- Aucun autre ID fermé. L'affichage du marqueur archive ne termine pas P29 ;
  les limites de timezone et règles métier complètes restent hors périmètre.

## N. Ordre de bascule proposé — à ne pas exécuter sans nouveau feu vert

1. Confirmer les validations du checkpoint, la fenêtre de bascule et la cible exacte
   du déploiement. Reprendre un snapshot DB et revérifier HEAD/migrations/diff.
2. Préparer un build déployable du nouveau client avec les vraies variables publiques,
   sans le promouvoir. Conserver le build actuel et l'inventaire des surfaces affectées.
3. Mettre la vérification publique et les parcours concernés en maintenance contrôlée ;
   tenir compte des onglets et bundles anciens en cache, qui devront être rechargés.
   Aucune maintenance Vercel n'a été configurée dans ce lot.
4. Appliquer atomiquement la migration corrective sur le MVP, vérifier sa version et
   recharger le schéma API. En cas d'échec SQL, transaction annulée, pas de demi-migration.
5. Promouvoir le nouveau client, forcer/recommander le rechargement des anciens clients.
6. Exécuter des contrôles HTTP : connu/inconnu/invalide, absence de champs privés,
   refus des tables/vues/INSERT anonymes, rôles et workflows autorisés, journal secondaire.
   Rejouer P02/LOT03 avec fixtures rollbackées, advisors, contrôle des données.
7. Lever la maintenance après ces contrôles. Si le client échoue, garder la maintenance
   pendant correction ; ne pas rouvrir les anciennes permissions sans décision explicite.

Aucune de ces opérations de bascule n'a été effectuée. Pas de garantie de compatibilité
native, de validation physique, de résistance à la copie ou d'absence totale d'abus.
Les trois profils historiques restent à valider par le propriétaire, individuellement.
