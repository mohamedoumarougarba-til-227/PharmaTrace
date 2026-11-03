# Phase 1 — livraison du hardening métier

Gate final autorisé, installé le 29 octobre 2026 et clôturé le 3 novembre 2026.
Ce rapport complète le [checkpoint de préparation](phase-1-business-hardening.md).
Il ne lance aucun nouveau lot ni la phase licence/documentation.

## A. DB avant/après

Projet MVP confirmé : `qctedpyydisawsknahso`, PostgreSQL 17, actif.
Checkpoint logique local avant mutation : lignes métier complètes, projection
Auth sans credentials, catalogue SQL, migrations, advisors et déploiements.
Les exports privés restent ignorés dans
`A exclure de github/PHASE1_DELIVERY_20261029/` ; aucun token/export privé commité.

| Table/surface | Avant | Final après nettoyage |
| --- | ---: | ---: |
| Auth comptes | 3 | 3 |
| utilisateurs | 3 | 3 |
| lots_medicaments | 6 | 6 |
| transferts | 10 | 10 |
| demandes_stock | 7 | 7 |
| historique_scans | 14 | 14 |
| alertes | 8 | 8 |

## B. Migrations appliquées

Une seule application pendant ce gate :
`20261029212749_harden_atomic_business_workflows`.
RPC contrôlées de création/décision, propriété et transitions, verrouillage,
stock atomique, demandes associées, idempotence et garde de conservation.

Historique distant : six versions avant, sept après :
`20260525020210`, `20260603200659`, `20260605010358`,
`20261027153134`, `20261027205429`, `20261028232100`, puis
`20261029212749`.

Le MCP a attribué la dernière version lors de l'application. Le candidat local
non enregistré `20261029160840_...` a donc été renommé pour correspondre au
registre réel. SQL inchangé : même blob Git `2c9eddf7393d6aa4a971e6f6e924c002176ec0c2`
que le fichier validé dans `9578a1e`. La comparaison SQL normalisée avec le
statement enregistré est identique. Aucune migration déjà enregistrée modifiée.

Les quatre migrations de sécurité récentes correspondent exactement aux fichiers.
L'histoire initiale conserve ses divergences connues : deux anciennes versions
distantes n'ont pas ce nom de fichier local et le SQL initial n'est pas identique.
Cela n'est pas présenté comme un replay CLI brut de l'histoire distante.
La preuve du replay des huit migrations locales avec le chemin de bootstrap
validé est conservée (`PHASE1_BUSINESS_20261029/05-fresh-replay.json`) ; aucun
nouveau projet créé ni ancien correctif réappliqué sur le MVP.

## C. Concurrence réelle

Deux appels HTTP avec vrais JWT fictifs, processus Node indépendant, pendant
qu'une troisième session SQL tient le verrou du lot. `pg_stat_activity` a capturé
deux PID PostgreSQL distincts actifs et bloqués sur verrou avant libération.
Les premières sondes sans chevauchement démontré sont conservées mais ne servent
pas de preuve de concurrence ; les courses probantes sont A2/B2/C2.

| Course | PID concurrents | Résultat observé |
| --- | --- | --- |
| A : 60 + 60 sur 100 | 240728 / 240729 | Un succès, un refus `22023` ; un transfert de 60, stock 40. |
| B : même clé, quantité 60 | 240751 / 240753 | Deux réponses 200, même ID ; une mutation, stock 40. |
| C : réception / annulation | 240751 / 240753 | Annulation 200, réception refusée `22023` ; état unique `annule`, stock 100. |

Conservation vérifiée dans les trois cas. Les PID de pool peuvent être réutilisés
entre courses ; ils sont distincts dans chaque course. Pas de trigger de délai
permanent installé.

## D. Tests SQL et validations locales

| Validation | Résultat |
| --- | --- |
| Métier contre RPC installées, puis après nettoyage | 104/104 |
| P02 rôles | 30/30 |
| B2 protections publiques | 60/60 |
| Suite locale finale après promotion | 95/95 |
| TypeScript | Réussi |
| Export web unique de livraison | Réussi, 34 routes |
| `git diff --check` | Réussi |

SQL : propriété, lot tiers, acteurs/destinataires, transitions, annulation et
restitution, double annulation/réception, retry, clé réutilisée avec autre payload,
demande liée, stock insuffisant, médicament/dosage/forme, rollback intégral si
écriture suivante échoue et interdiction des écritures brutes. Les fixtures SQL
sont annulées par sous-transaction. Le trigger d'erreur temporaire est absent
au contrôle final.

## E. HTTP et navigateur

- HTTP réel : 46/46, puis deux contrôles publics après nettoyage : codes
  `FAB-2026-049` et ancien code fixture renvoient chacun une absence réelle.
- Staging : 21 contrôles distincts verts, sur le même artefact.
- Production : 18 contrôles distincts verts, sur ce même artefact.

Les rapports combinent les scénarios réussis de plusieurs exécutions ; les
timeouts réseau/navigation des essais précédents sont conservés, pas transformés
en passages verts. Les derniers parcours métier complets ont réussi.
Un ajustement du harness attend l'hydratation React et distingue lecture HEAD
et mutation. Pour les parcours métier finaux, une vraie session obtenue par
Supabase Auth est chargée dans le navigateur. Aucune réponse métier fabriquée
ni table substituée. Les écritures partent de l'UI vers les vraies RPC du MVP.

Fabricant/pharmacie dans l'UI staging : demande de 5, transfert lié de 5,
stock 100→95, réception visible en stock pharmacie ; transfert séparé de 7,
stock 95→88, annulation et retour à 95. Production : listes fabricant et stock
pharmacie cohérents avec ces opérations. Les refus lot tiers, destinataire,
quantité, incompatibilités et doubles traitements sont vérifiés en HTTP/SQL.

Vérification publique : connu, inconnu, FAB absent sans faux positif, invalide,
archivé, expiré et ambigu. Compte sans provisioning sans accès métier. Pharmacie :
lecture en panne → indisponible ; journal en panne → résultat trouvé conservé.
Ces deux pannes sont injectées par interruption réseau ciblée du navigateur,
sans panne du backend ni changement de données. Navigation DPH accueil/lots/alertes
et supervision HTTP valides. Mutations observées uniquement sur RPC contrôlées.

## F. Déploiement

- Code client : `9578a1e77d64f8044e440232e8af7e7f6afd40cd`, incluant `691e2d3`.
- Déploiement : `dpl_E3SKbgi9zgtKFKLoDUafgbMEZp4h`, READY, production staged
  puis promue sans reconstruction le 3 novembre 2026.
- URL immuable : <https://pharmatraceapp-oozv4ynji-mohameds-projects-0af41c6a.vercel.app>.
- Alias public confirmé : <https://pharmatraceapp.vercel.app/>.
- Ancienne production : `dpl_HHgjvx39Fr1wGc7YWvwwSUsmEyF9`.
- Vitrine inchangée : <https://pharmatrace-eta.vercel.app/>,
  `dpl_BrmvqJRY2Gp7kx4auXHNMF2N9qW6`.

Un export, un package de 77 fichiers, un déploiement. Bundle servi en staging
et production : `entry-315ff57db5eff8b503f2305e2a29858f.js`, 3 071 274 octets,
SHA256 `79599c6759d85e52144c1ecc0e116bedb4ebbda95acb90e1f612748352860b22`.
Contrôle binaire identique au manifeste local.

## G. Données historiques et nettoyage

Comparaison de toutes les colonnes exportées des sept surfaces : valeurs
initiales identiques. Seules les nouvelles colonnes `decided_by/decided_at`
existent désormais sur transferts/demandes, NULL sur les lignes historiques.
Les trois anciens profils restent non provisionnés ; aucun rôle historique
attribué pour faciliter les tests.

Les sept comptes fictifs ont été globalement déconnectés. Export des fixtures,
puis suppression transactionnelle des seuls IDs du manifeste et de leurs
dépendances : 16 lots, demandes/transferts/scans, opérations et audits fictifs,
profils/Auth. Garde préalable comparant l'historique et interdisant tout ID
historique dans le périmètre. Zéro compte/lot fixture restant, volumes initiaux
retrouvés, comparaisons finales identiques. Les preuves locales sont conservées.

## H. Trois lots historiques incohérents

| Lot | Initial | Disponible | Transferts réservés/reçus |
| --- | ---: | ---: | ---: |
| `2f9453f3-13d6-4e68-a782-948d153ce141` | 1200 | 150 | 1000 |
| `7e10a7d3-9a51-4c24-be48-11d2d761d487` | 5000 | 4400 | 0 |
| `f9ad9277-530d-4d8f-b82c-8c4c57a0f308` | 3000 | 2900 | 0 |

Toujours présents, valeurs inchangées. Pour chacun : vraie garde
`private.check_lot_balance` → `23514`, et nouvelle RPC appelée par fabricant
tiers fictif → `42501`. Le propriétaire historique non provisionné n'a pas été
modifié pour atteindre artificiellement la garde via son identité. Aucun
transfert dangereux réalisé, aucune réparation automatique.

## I. Advisors

| Avis | Avant | Après |
| --- | ---: | ---: |
| RLS sans policy, schéma privé volontairement fermé (INFO) | 1 | 2 |
| Search path mutable, `update_updated_at` (WARN) | 1 | 1 |
| SECURITY DEFINER accessible anon (WARN) | 2 | 2 |
| SECURITY DEFINER accessible authenticated (WARN) | 6 | 10 |
| Protection mots de passe compromis désactivée (WARN) | 1 | 1 |
| FK sans index détecté (INFO) | 7 | 8 |
| Auth RLS initplan (WARN) | 12 | 5 |
| Index inutilisés (INFO) | 5 | 5 |
| Policies permissives multiples (WARN) | 24 | 12 |

Les quatre nouvelles RPC expliquent l'exposition SECURITY DEFINER supplémentaire :
contrôles explicites d'identité/acteur, privilèges bornés et tests négatifs verts.
La nouvelle table privée sans policy reste inaccessible aux clients.
Les autres avertissements sont conservés comme dette, sans les annoncer résolus.
Références : [linter PostgreSQL](https://supabase.com/docs/guides/database/database-linter),
[protection mots de passe](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## J. Reclassification

P06 **DONE**, P07 **DONE**, P08 **DONE** pour contrat métier et bootstrap validés,
P09 **DONE** : corrections installées, client publié et parcours réels confirmés.
P03/P04 restent DONE ; P05 reste au niveau accepté avec dette legacy no-op.
Aucun autre ID fermé artificiellement. Accord Raouf/Mahamadou DONE et acquis.

## K. Limites et backlog non bloquant

P10 deep-link ; réconciliation humaine des trois lots ; provisioning approprié
des comptes historiques si leur utilisation est souhaitée ; limitations MVP de
ventes/transferts entre pharmacies ; mode démo métier ; dette advisors/no-op.
Pas de validation physique Android/caméra, de test de charge prolongé ni de
preuve d'authenticité physique d'un médicament. Les essais utilisent des données
fictives sur le vrai service, pas les opérations réelles d'une pharmacie.

Un ancien onglet garde son JavaScript en mémoire après promotion. Ses anciennes
écritures brutes restent refusées ; il doit être rechargé. Ne pas rouvrir les
anciennes policies pour restaurer ce client. Pas de garantie de disparition
instantanée de tous les anciens bundles.

## L. Git, fichiers et commandes

HEAD avant : `9578a1e77d64f8044e440232e8af7e7f6afd40cd`.
Commits métier conservés : `691e2d3` et `9578a1e`, signés.
Le commit de clôture contient uniquement :

- renommage de la migration métier, SQL strictement identique ;
- `app/PharmaTrace/scripts/prepare-business-rehearsal.cjs` : mode `--installed`
  et découverte du nom réel, sans application implicite ;
- ce rapport et un lien depuis le checkpoint précédent.

Commandes principales : `npm test`, `npx tsc --noEmit`, `npm run build:web`
(une fois pour l'artefact livré), `node --check`,
`node scripts/prepare-business-rehearsal.cjs --installed`, puis SQL émis exécuté
via MCP ; scripts privés HTTP/navigateur/concurrence ; `vercel deploy --prebuilt
--prod --skip-domain --yes --scope ...` sur le package ; promotion via MCP ;
`git diff --check`, `git diff --stat`, `git status --short`, `git diff --cached`,
`git commit -S`, `git verify-commit`, `Get-FileHash` des vidéos.
MCP : projet/migrations/catalogues, checkpoint, application, SQL, advisors,
inspection Vercel/alias et promotion. Aucune dépendance modifiée, aucun push.

Branche `hardening/public-readiness-20261027`, main inchangée à
`f64f2c4cf5fd2d4e47816692d1350360f54196c5`.
Les deux vidéos historiques restent non suivies, présentes, inchangées :

- `ressources/docs/PHASE_2_DEMIFINAL/demo_prototype_phase 2.mp4`,
  44 245 834 octets, SHA256 `434cce24536b683735ad335e9f774259b91dd7a7619c55043792ce3b60bb288d`.
- `ressources/docs/PHASE_3_FINALE/demo_Pitch_MVP_Phase 3.mp4`,
  39 607 226 octets, SHA256 `63bc7f07038000203286c569f52022cf076f72c883537f4bc4b8bde7f24c1d83`.

Arrêt au gate final. La prochaine mission est la phase 2 open source.
