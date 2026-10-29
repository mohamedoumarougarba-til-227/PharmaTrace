# Sprint open source — bloc métier final P06/P07/P08/P09

Checkpoint du 29 octobre 2026, Africa/Lagos. Une seule mission de hardening
métier, suivie du contre-audit demandé. Les autres améliorations ne sont pas
des prérequis systématiques à la release open source.

**Résultat : correctif local signé et testé, migration candidate NON APPLIQUÉE
durablement. Aucun push, déploiement Vercel, changement d'alias ou réparation
des données historiques. La production reste au checkpoint B2.**

## 1. État réel avant correction

Branche : `hardening/public-readiness-20261027`.
HEAD de départ : `8538dea74d2b6541c43df680b073d324900786ce`.
`main` : `f64f2c4cf5fd2d4e47816692d1350360f54196c5`, inchangée.
Supabase MVP : `qctedpyydisawsknahso`, ACTIVE_HEALTHY, PostgreSQL 17.6.1.121.

Six migrations distantes, avant et après les répétitions :

1. `20260525020210_initial_schema`
2. `20260603200659_fix_get_my_role_recursion`
3. `20260605010358_demandes_stock`
4. `20261027153134_harden_business_role_provisioning`
5. `20261027205429_add_safe_verification_surfaces`
6. `20261028232100_restrict_legacy_public_access`

Les fichiers locaux anciens ne reproduisent pas exactement tous ces identifiants
ni les interventions SQL manuelles. Ils ne sont pas réécrits dans ce correctif.

| Point | Constat actuel vérifié | Correction préparée |
| --- | --- | --- |
| P06 | INSERT transfert vérifie seulement expéditeur UID + rôle fabricant, sans propriété du lot ni rôle du destinataire. UPDATE des parties ne borne pas les transitions/colonnes. | RPC contrôlées, ownership, rôles actifs, colonnes protégées, décisions bornées. |
| P07 | INSERT transfert, décrément stock et satisfaction de demande séparés. Livraison groupée réutilise aussi des stocks chargés avant la boucle et ignore `lotErr`. Refus pharmacie tente un UPDATE du lot interdit par les RLS. | Transactions DB, verrouillage des lots/demandes, décréments relatifs, rollback intégral et idempotence. |
| P08 | `annule` existe déjà dans l'enum distant et dans les types client, mais manque dans la migration initiale. B2 suppose une policy historique absente du dépôt. La sélection de médicament utilise seulement le nom approximatif. | Enum pour nouvelle installation, chemin de bootstrap explicite, correspondance nom/dosage/forme, client sur RPC. |
| P09 | SELECT fabricant ne récupère pas `lot_id.id`, pourtant utilisé pour restituer le stock lors de l'annulation. | Annulation uniquement par ID transfert ; le serveur détermine son lot et sa quantité. L'embedding inclut aussi l'ID. |

### Modèle métier retenu dans le périmètre existant

`lots_medicaments.fabricant_id` identifie le fabricant d'origine et l'autorité
d'émission. Il ne prouve pas une propriété juridique ou économique.
`quantite_actuelle` représente le disponible chez ce fabricant. Une ligne
`transferts.en_attente` réserve des unités ; `receptionne` représente des unités
reçues par sa pharmacie destinataire. Le stock pharmacie affiché reste tiré des
transferts réceptionnés. Le MVP ne suit ni ventes, ni consommation, ni revente
entre pharmacies. Aucun ledger ou nouveau modèle commercial n'est inventé.

Une demande est une intention portant sur médicament/dosage/forme, pas sur un
lot : elle peut conserver la saisie manuelle existante, sans accorder de lecture
d'un lot. La correspondance exacte est exigée lors de son expédition.
Une livraison partielle reste une expédition unique, avec quantité explicitée
dans la note ; les reliquats et livraisons multiples deviennent du backlog.

## 2. Correction DB et client

Migration créée par `supabase migration new harden_atomic_business_workflows` :
`app/PharmaTrace/supabase/migrations/20261029160840_harden_atomic_business_workflows.sql`.

Elle ajoute quatre RPC SECURITY DEFINER, propriétaire attendu `postgres`, chemin
de recherche vide. Les fonctions dépendant du jour utilisent UTC :

| Surface | Autorité et effet atomique |
| --- | --- |
| `create_stock_requests(uuid,jsonb)` | Pharmacie provisionnée active ; fabricant cible provisionné actif ; 1–50 articles ; identité/statut/groupe déterminés côté serveur ; clé d'idempotence. |
| `create_lot_transfers(uuid,jsonb)` | Fabricant provisionné actif, obligatoirement celui du lot ; pharmacie destinataire provisionnée active distincte de lui ; 1–50 transferts ; stock réservé, transfert et éventuelle demande dans la même transaction. |
| `decide_stock_requests(uuid[],text,text)` | Fabricant de la demande : refus motivé ; pharmacie initiatrice : annulation ; état en attente ; décision groupée entièrement atomique. |
| `decide_lot_transfer(uuid,text,text)` | Expéditeur fabricant : annulation ; destinataire pharmacie : refus/réception ; code exact du lot exigé pour réception ; restitution du stock et demande associée traitées ensemble. |

Toutes ces RPC refusent anon, les comptes non provisionnés et les rôles non
autorisés. DPH conserve la supervision en lecture, sans pouvoir décider pour
une entreprise. Aucun acteur, statut, stock ou timestamp fourni par le client
ne devient autorité de la décision.

Les INSERT/UPDATE/DELETE directs de transferts/demandes et les UPDATE/DELETE
directs des lots sont fermés aux clients. TRUNCATE/REFERENCES/TRIGGER superflus
sont révoqués sur les tables concernées. `service_role` ne reçoit pas de bypass
métier : ses écritures brutes concernées sont également retirées. Des triggers
invoker exigent `current_user=postgres` pour ces écritures ; les RPC exécutent
leurs propres gardes avant d'écrire. L'opérateur SQL postgres reste explicitement
une autorité de confiance et peut réconcilier/importer des données.

L'INSERT fabricant d'un nouveau lot reste disponible avec RLS et un trigger
exigeant son propre fabricant, tout le stock initial disponible, un état initial
fabricant et aucune archive. Le client ne peut ensuite changer hash, origine,
quantités, acteurs, lien demande/transfert, statut ou timestamps par UPDATE brut.
`decided_by` et `decided_at` sont ajoutés aux transferts et demandes, sans remplir
arbitrairement les anciennes lignes. Les décisions nouvelles les établissent en DB.

### États et invariants

| Ressource | Transition permise | Acteur |
| --- | --- | --- |
| Transfert | création → en_attente | Fabricant du lot |
| Transfert | en_attente → receptionne | Pharmacie destinataire, code correspondant |
| Transfert | en_attente → refuse | Pharmacie destinataire |
| Transfert | en_attente → annule | Fabricant expéditeur |
| Demande | création → en_attente | Pharmacie initiatrice |
| Demande | en_attente → satisfait | Fabricant cible, uniquement dans l'expédition correspondante |
| Demande | en_attente → refuse | Fabricant cible |
| Demande | en_attente → annule | Pharmacie initiatrice |
| Demande liée | satisfait → refuse/annule | Effet de refus/annulation du transfert lié, même transaction |

Une répétition de la même décision terminale ne réécrit pas le stock. Une autre
décision ou un retour arrière est refusé. `archive` reste un état historique,
sans nouvelle transition cliente dans ce périmètre.

```text
quantite_initiale = disponible_fabricant
                 + somme(transferts en_attente)
                 + somme(transferts receptionne)

expédition q : disponible -= q ; réservation += q
réception q : réservation -= q ; reçu_pharmacie += q
refus/annulation q : réservation -= q ; disponible += q
```

Les quantités sont des entiers strictement positifs int32 ; chaque décrément
relit le stock verrouillé. Tous les lots sont verrouillés par ID croissant,
puis les demandes par ID croissant. La création groupée fait un seul appel DB,
y compris lorsque plusieurs lignes partagent le même lot.
Les clés uniques `(caller_id, operation_key)` mémorisent résultat et payload
dans `private.business_operations`. Une même clé avec un autre contenu échoue.
Une demande ne peut être liée qu'à un transfert, et ne peut être expédiée deux fois.

Un lot expiré ou archivé ne peut être expédié/réceptionné. Le jour d'expiration
est inclus, comparé en date UTC pour ces workflows. Un refus/une annulation peut
restituer des unités sans réactiver un lot archivé. Un code de réception doit
respecter le format borné et correspondre exactement au numéro/hash du transfert.
Cela ne prouve pas que la boîte physique est authentique.

### Client

Les six écrans concernés utilisent `lib/businessWorkflows.ts`. Les gardes UI
ne remplacent pas les gardes DB. Le helper filtre les champs envoyés, contrôle
les quantités, vérifie les réponses et conserve la clé de création lors d'une
erreur réseau dans le même formulaire. Une fermeture/recréation du formulaire
constitue une nouvelle intention ; les clés ne sont pas persistées entre rechargements.
Il faut consulter la liste avant de recréer une expédition après un résultat inconnu.

Les écritures métier du mode démo sont explicitement désactivées avec un message
de simulation, sans appel réel. Les lectures démo et le vérificateur LOT 0.1 sont
conservés. Ce choix évite d'ajouter un second moteur transactionnel fictif.

## 3. Installation neuve et P08

La policy `utilisateurs: lecture pour les connectes`, retirée par B2, n'est
créée par aucune migration du dépôt. Un rejeu brut échoue donc avant même la
nouvelle migration. Une migration ultérieure ne peut corriger ce prérequis en
remontant le temps ; aucune migration appliquée n'a été réécrite.

Le chemin supporté pour une base Supabase **vide** est l'émetteur :

```powershell
node scripts/prepare-fresh-install.cjs
```

Il imprime du SQL à relire, sans connexion ni application automatique. Il exige
l'absence de profil PharmaTrace et de compte Auth avant toute installation,
ajoute une policy temporaire `USING(false)` juste avant B2, puis laisse B2 la
retirer. Il installe les huit fichiers locaux dans l'ordre et enregistre leurs
versions dans `supabase_migrations.schema_migrations` dans la même transaction.
Le garde a été exécuté seul sur le MVP : refus attendu P0001, sans modification.

`prepare-business-fresh-replay.cjs` utilise le même plan dans deux schémas
non exposés et annule tout : huit migrations, six tables publiques, quatre vues,
quatre RPC métier et enum `annule` présents. Les grants initiaux Supabase sont
émulés pour ces schémas. C'est un rejeu DDL à vide sur PostgreSQL du MVP ; ce n'est
pas l'installation complète d'un autre projet Supabase ou une validation native.
`supabase db push` seul sur une base vierge n'est pas le chemin documenté ici.

## 4. Tests et preuves

| Validation | Attendu | Obtenu |
| --- | --- | --- |
| Suite locale existante | 67 tests conservés, dont LOT 0.1 et rôles | 67/67 |
| Nouveaux tests client/contrat | RPC unique, champs contraints, retry, démo, quantités, correspondance produit, absence de chemins bruts | 28/28 ; total 95/95 |
| P02 sur DB MVP, transaction annulée | Autorité des rôles conservée | 30/30 |
| B2 avec candidat installé dans une sous-transaction annulée | Contrat public minimal, vues, scans legacy no-op conservés | 60/60 |
| Tests métier SQL avec candidat | Isolation, propriété, transitions, quantités, idempotence, atomicité | 104/104 |
| Échec injecté à la troisième écriture | Ni transfert, ni décrément, ni demande satisfaite, ni clé validée | Rollback intégral observé ; retry ensuite réussi |
| Rejeu DDL à vide | Aucun prérequis implicite restant dans le chemin supporté | 8 migrations + prérequis explicite, rollback |
| TypeScript | Aucune erreur | `npx tsc --noEmit`, exit 0 |
| Export web | Routes exportables | `npm run build:web`, exit 0, 34 routes |
| Whitespace | Aucun défaut | `git diff --check`, succès |

Les assertions SQL couvrent notamment : fabricant B sur lot A ; mauvaise
destination/rôle/acteur ; anon/non provisionné/DPH ; quantités nulles, textuelles,
négatives, fractionnaires et overflow ; surallocation cumulative d'un lot ;
archives/expiration ; faux champs d'identité/statut ; mauvaise demande ; double
expédition de demande ; clés réutilisées ; réception avec mauvais code ;
annulation sans ID de lot client ; doubles réception/refus/annulation ; chaque
transition depuis les quatre états terminaux ; échec partiel d'une décision
groupée ; INSERT/UPDATE/DELETE directs ; écritures service_role ; stock/hash
immuables côté client ; nouvel INSERT de lot valide/invalide.

### Limites de validation à garder visibles au contre-audit

- Les tests client exécutent le vrai helper TypeScript avec SDK remplacé ; les
  tests SQL exécutent les vraies fonctions et RLS sous rôles PostgreSQL. Aucun
  parcours navigateur → HTTP → RPC nouvellement installée durablement n'est revendiqué.
- Le double submit client est testé simultanément. Une sonde de deux requêtes
  SQL MCP n'a observé aucun chevauchement : `acquired_rows=1`, autre détenteur=0.
  Elle ne démontre pas une course concurrente. La CLI `db query --linked` a
  refusé l'accès faute de token CLI ; le MCP est authentifié séparément.
- Les verrous, l'ordre d'acquisition et les contraintes d'idempotence sont en
  place et les replays séquentiels passent. Les courses réelles entre deux
  sessions restent à exercer avant activation métier : deux créations sur le
  dernier stock, même clé simultanée, annulation contre réception, annulation
  de demande contre expédition. Ne pas les présenter comme déjà testées.
- Aucune validation Android/iOS physique, nouvelle preview ou promotion.
- La répétition des nouvelles fonctions ne modifie pas la production après rollback.

## 5. Données historiques et advisors

| Objet | Avant | Après |
| --- | ---: | ---: |
| Auth / profils | 3 / 3 | 3 / 3 |
| Lots | 6 | 6 |
| Transferts | 10 | 10 |
| Demandes | 7 | 7 |
| Scans | 14 | 14 |
| Alertes | 8 | 8 |

Les empreintes MD5 des projections JSON ordonnées des six tables métier sont
identiques avant/après. Ce contrôle porte sur les lignes, pas sur l'état physique
bit à bit de PostgreSQL ; séquences/logs peuvent garder des traces de répétition.
Zéro fixture `business_test_*`, zéro schéma de rejeu et aucune RPC/table candidate
persistante après rollback. Les trois profils historiques restent non provisionnés.

États historiques : lots 5 en_stock_fabricant, 1 en_transit ; transferts
2 en_attente, 3 receptionne, 2 refuse, 3 annule ; demandes 1 en_attente,
3 satisfait, 1 refuse, 2 annule. Aucune source de transfert étrangère au fabricant,
aucun mauvais rôle de destination ni lien demande/transfert incohérent trouvé.
**Trois lots ne satisfont pas l'invariant de conservation.** Ils restent intacts ;
la RPC candidate bloque leur traitement avec 23514 et un message de réconciliation.
Ils ne doivent pas être promus comme stock terrain vérifié.

Advisors sécurité avant/après identiques sur le schéma B2 conservé : un INFO
RLS privé sans policy ; un WARN `update_updated_at` ; deux fonctions definer
exécutables anon ; six exécutables authenticated ; protection mots de passe
compromis désactivée. Performance : FK sans index 7, initplan RLS 12, policies
permissives multiples 24. Index inutilisés : 7 au premier relevé, 5 après usage
des tests ; ce changement d'observation n'est pas une optimisation livrée.
Les advisors du candidat durablement installé restent à relever au cutover.
Référence des contrôles : [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter).

## 6. Git, commandes et fichiers

Commit principal signé : `691e2d3da9342f0caa350fe0e504838c0a6bffe1`,
`fix(workflows): enforce atomic stock transfers`.
La préparation d'installation et ce rapport font l'objet d'un second commit.
Signature RSA vérifiée, empreinte `513338E2587B325480AD83D17EE25184789B78E3` ;
confiance locale inconnue. Une première signature a échoué à charger un module
PowerShell ; le retry utilise un PSModulePath Windows limité au processus,
sans changer Git global, désactiver la signature ou lire un secret en sortie.

Fichiers de la mission, sous `app/PharmaTrace/` sauf le rapport :

1. `app/(fabricant)/demandes.tsx`
2. `app/(fabricant)/nouveau-transfert.tsx`
3. `app/(fabricant)/transferts.tsx`
4. `app/(pharmacie)/demandes.tsx`
5. `app/(pharmacie)/transferts.tsx`
6. `app/(pharmacie)/verifier.tsx`
7. `lib/businessWorkflows.ts`
8. `supabase/migrations/20261029160840_harden_atomic_business_workflows.sql`
9. `supabase/tests/business_workflows.sql`
10. `tests/business-workflows.test.cjs`
11. `tests/verification.test.cjs` — seul ajout : mock expo-crypto dans le harness.
12. `scripts/prepare-business-rehearsal.cjs`
13. `scripts/fresh-migration-plan.cjs`
14. `scripts/prepare-fresh-install.cjs`
15. `scripts/prepare-business-fresh-replay.cjs`
16. `docs/phase-1-business-hardening.md` — à la racine du dépôt.

Commandes principales : `git status --short`, `git branch --show-current`,
`git rev-parse HEAD/main`, recherches `rg`, lectures de fichiers et diff ;
`supabase migration new ...` ; `node scripts/prepare-business-rehearsal.cjs`
puis SQL émis exécuté via MCP ; idem `prepare-business-fresh-replay.cjs` ;
`node scripts/prepare-fresh-install.cjs` (émission seulement, garde testé seul) ;
`node --check` sur les scripts ; `npm test` ; `npx tsc --noEmit` ;
`npm run build:web` ; `git diff --check` ; `git diff --cached` ; `git commit -S` ;
`git verify-commit` ; `Get-FileHash` des deux vidéos.
MCP : catalogues SQL, migrations, état projet, advisors, répétitions rollback.
Aucune installation/modification de dépendance, aucun `supabase apply`.

Preuves locales ignorées : `A exclure de github/PHASE1_BUSINESS_20261029/`.
Elles comprennent catalogues, résultats SQL, compteurs/empreintes et logs client/export.
Les deux vidéos restent non suivies, présentes et inchangées :

- `ressources/docs/PHASE_2_DEMIFINAL/demo_prototype_phase 2.mp4` : 44 245 834 octets,
  SHA256 `434cce24536b683735ad335e9f774259b91dd7a7619c55043792ce3b60bb288d`.
- `ressources/docs/PHASE_3_FINALE/demo_Pitch_MVP_Phase 3.mp4` : 39 607 226 octets,
  SHA256 `63bc7f07038000203286c569f52022cf076f72c883537f4bc4b8bde7f24c1d83`.

## 7. Classement et suite bornée

| ID | Classement honnête à ce checkpoint |
| --- | --- |
| P06 | Correctif local implémenté, SQL testé et commité ; PARTIAL au niveau déployé tant que cutover non appliqué. |
| P07 | Atomicité et retries implémentés/testés ; PARTIAL global : application durable et courses multi-session non validées. |
| P08 | Contrat des workflows et chemin de bootstrap corrigés/testés localement ; pas une affirmation de rejeu CLI brut de toute l'histoire distante. |
| P09 | DONE localement : annulation basée sur l'ID transfert, restitution côté serveur testée ; pas encore livrée en production. |
| P03/P04 | DONE conservés ; tests B2 verts, aucune réouverture artificielle. |
| P05 | Sécurisation acceptée pour poursuivre ; dette legacy no-op documentable, non bloquante selon décision propriétaire. |
| P10 | OPEN, backlog non bloquant pour l'open source. |
| P12 — accord équipe | DONE, définitivement acquis pour Raouf et Mahamadou ; jamais NEEDS DECISION. |
| P12 — licence/droits tiers | PARTIAL ; recommandation, décision de licence et inventaire tiers en phase 2. Crédits TrustGrid/MIABE conservés. |

P28/P29 ne sont touchés que pour les workflows décrits. Aucune fermeture globale
de ces IDs, de P19/P24 ou des autres points sur cette seule base.

Backlog transparent non bloquant : P10 ; moteur complet de simulation métier ;
ventes/stock consommé/reliquats et transferts entre pharmacies ; refactor/types
généraux ; améliorations UI et performance non critiques. Les trois lots
historiques incohérents nécessitent une décision de réconciliation uniquement
si leur usage métier est souhaité ; ils restent bloqués et non réparés.

Contre-audit unique de ce bloc, puis activation coordonnée à autoriser : traiter
les courses multi-session avec fixtures, installer la migration et le client
comme une seule livraison contrôlée, vérifier les parcours HTTP réels, les
advisors et l'absence de fixtures. Les vieux bundles perdent leurs écritures
brutes ; ils doivent afficher une erreur et être rechargés. Les RPC publiques
et le no-op B2 restent disponibles. Aucun alias ne supprime les vieux onglets.
En cas d'incident, garder les écritures fermées et corriger en avant ; ne pas
réouvrir les anciennes policies dangereuses pour faire fonctionner un ancien UI.
Après des opérations nouvelles, ne pas annuler le schéma ou les quantités en aveugle.

Ce checkpoint ne lance pas une nouvelle succession de lots : il livre le bloc
pour contre-audit. La mission suivante est licence, droits et documentation du
MVP, puis readiness/release et communication selon les quatre phases retenues.
