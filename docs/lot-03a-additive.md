# LOT 0.3A — surfaces additives et preview réel

Checkpoint finalisé le 28 octobre 2026 (Africa/Lagos). La migration A est installée
sur le MVP `qctedpyydisawsknahso`. B reste hors des migrations applicables ; aucun
cutover restrictif, aucune promotion production, aucun push. Ce document remplace
le plan monolithique du [rapport précédent](lot-03-public-contract.md).

## A. Git et fichiers

Branche `hardening/public-readiness-20261027`. HEAD avant :
`ba883eed5af46c850985a31125e1fac45fa6f272` (LOT 0.2 signé).
`main` reste `f64f2c4cf5fd2d4e47816692d1350360f54196c5`.
Le commit contenant ce rapport regroupe le nouveau contrat, le client, les tests
et B explicitement en attente. Son SHA et sa signature sont fournis au retour.
Ni dépendances, ni lockfiles, ni crédits TrustGrid/MIABE ne sont modifiés.

Fichiers applicatifs modifiés sous `app/PharmaTrace/` :

- `app/(public)/verify.tsx`, `app/(pharmacie)/verifier.tsx` ;
- `app/(auth)/login.tsx` ;
- `app/(fabricant)/compte.tsx`, `app/(pharmacie)/compte.tsx` ;
- `app/(fabricant)/nouveau-transfert.tsx`, `app/(pharmacie)/demandes.tsx` ;
- `app/(fabricant)/[id].tsx`, `app/(agent-dph)/lots.tsx`, `app/(agent-dph)/index.tsx` ;
- `lib/verification.ts`, `lib/supabase.ts`, `tests/verification.test.cjs`.

Fichiers ajoutés sous `app/PharmaTrace/` :

- `lib/workflowReads.ts` ;
- `scripts/prepare-lot03-rehearsal.cjs` ;
- `supabase/migrations/20261027205429_add_safe_verification_surfaces.sql` ;
- `supabase/pending/20261027205457_restrict_legacy_verification_access.sql` ;
- `supabase/pending/README.md` ;
- `supabase/tests/p03_public_contract.sql`, `supabase/tests/p03a_additive.sql`.

Documentation ajoutée : ce rapport, `docs/lot-03-public-contract.md` et
`docs/archive/lot-03-monolithic-candidate.sql`. L'ancien candidat est préservé
comme archive, hors des migrations exécutables.

Les deux vidéos historiques non suivies sont conservées, hors commit :

| Fichier | Octets | SHA256 |
| --- | ---: | --- |
| `ressources/docs/PHASE_2_DEMIFINAL/demo_prototype_phase 2.mp4` | 44245834 | `434cce24536b683735ad335e9f774259b91dd7a7619c55043792ce3b60bb288d` |
| `ressources/docs/PHASE_3_FINALE/demo_Pitch_MVP_Phase 3.mp4` | 39607226 | `63bc7f07038000203286c569f52022cf076f72c883537f4bc4b8bde7f24c1d83` |

## B. Migration A appliquée

Nom distant : `20261027205429_add_safe_verification_surfaces`.
Le fichier local reprend exactement la version enregistrée par le MCP distant.
Les fichiers A/B ont été initialisés avec `supabase migration new`.

| Nouvelle surface | Contrat |
| --- | --- |
| `verify_public_lot(text)` | Code exact ; six champs publics ; aucune identité interne, stock, adresse ou téléphone |
| `private.resolve_verification_lot(text)` | Validation ASCII 1–100 ; erreur 22023 si invalide ; 21000 si ambigu ; aucun premier résultat arbitraire |
| `get_my_profile()` | Profil du seul UID appelant, sans paramètre de cible |
| `get_business_partners()` | Rôle validé fabricant/pharmacie ; rôle opposé actif et validé ; id/nom/ville/pays seulement |
| `get_manufacturer_catalog(uuid)` | Pharmacie validée ; médicament/dosage/forme ; sans stock ni UUID lot |
| `record_verification_scan(text)` | Compte métier validé ; identité, lot et verdict calculés en DB ; pas de journal anonyme |
| `business_lots` | Nouvelle vue invoker avec périmètre explicite fabricant/pharmacie/DPH ; téléphone NULL |
| `supervision_stats` | Nouvelle vue invoker limitée au rôle DPH validé |

La projection publique exacte est `numero_lot`, `nom_medicament`, `dosage`,
`fabricant_public`, `date_expiration`, `etat` (`enregistre` ou `archive`).
Les fonctions definer ont un `search_path` vide et des EXECUTE explicitement
limités. Le résolveur privé n'est pas une API accessible aux clients.

Preuve additive : les comparaisons avant/après installation donnent toutes TRUE
pour les anciennes policies, définitions/options/ACL de vues, grants de tables,
grants de colonnes et fonctions historiques. L'empreinte de répétition comprend
aussi les triggers. Les REVOKE présents dans A concernent uniquement les objets
nouvellement créés et leurs privilèges par défaut.

Le trigger historique d'alerte reste inchangé. La nouvelle RPC normalise seulement
l'alerte du scan qu'elle vient de créer (niveau info et auteur calculé pour un code
absent). L'application de A ne modifie aucune ligne historique.

## C. Migration B non appliquée

Fichier : `app/PharmaTrace/supabase/pending/20261027205457_restrict_legacy_verification_access.sql`.
Stocké hors de `migrations/` pour qu'un `db push` ordinaire ne puisse pas le prendre.
Il prépare les restrictions lots/scans/profils, la fin des INSERT bruts scans et
alertes, le remplacement des anciennes policies, le durcissement du trigger et
des deux anciennes vues. Les politiques d'écriture transferts/demandes restent
hors périmètre. Les 59 assertions décrivent cet état cible, pas les droits actuels.

**B n'est pas enregistrée en DB.** Elle a uniquement été exécutée dans une
sous-transaction de test intégralement annulée.

## D. DB, données et nettoyage

Avant A : quatre versions `20260525020210`, `20260603200659`, `20260605010358`,
`20261027153134`. Après : ces quatre plus `20261027205429`, soit cinq migrations.

| Ensemble | Avant | Après nettoyage | Comparaison |
| --- | ---: | ---: | --- |
| Comptes Auth | 3 | 3 | Champs non credentials exportés identiques |
| Profils | 3 | 3 | Toutes lignes/colonnes identiques |
| Lots | 6 | 6 | Toutes lignes/colonnes identiques |
| Transferts | 10 | 10 | Toutes lignes/colonnes identiques |
| Demandes | 7 | 7 | Toutes lignes/colonnes identiques |
| Scans | 14 | 14 | Toutes lignes/colonnes identiques |
| Alertes | 8 | 8 | Toutes lignes/colonnes identiques |

Les assertions SQL utilisent des fixtures rollbackées. Les essais HTTP/navigateur
ont utilisé quatre comptes `example.invalid`, trois profils provisionnés par
l'opérateur, cinq lots et un transfert fictifs. Les e-mails étaient confirmés
uniquement pour ces fixtures ; aucun envoi ni parcours de confirmation e-mail
n'est démontré. Les sessions ont été déconnectées après les essais.

Avant nettoyage, preuves privées préservées de 4 comptes, 3 profils, 5 lots,
1 transfert, 9 scans, 4 alertes et 3 traces de provisionnement fictives. Nettoyage
transactionnel borné aux UUID/codes exacts, avec garde sur emails, fabricant et
comptages attendus ; toutes ces fixtures sont retirées. Zéro session/identité Auth
et zéro trace de provisionnement de ces comptes restent en DB. Aucun audit
historique ou journal technique du fournisseur n'a été effacé. Les séquences et
logs techniques peuvent conserver la trace normale des essais ; cela ne signifie
pas une restauration physique bit à bit de PostgreSQL.

## E. Compatibilité technique de l'ancien client

Appels HTTP réellement exécutés après installation de A, avec fixtures :

| Ancien appel | Attendu | Obtenu |
| --- | --- | --- |
| SELECT lot + fabricant imbriqué + `.or()` exact | Ancien contrat maintenu | HTTP 200, lot attendu |
| `lots_avec_fabricant` | Vue historique maintenue | 200, champs historiques conservés |
| `stats_dashboard` | Vue historique maintenue | 200, agrégat présent |
| INSERT brut scan, retour minimal comme ancien SDK | Ancienne écriture maintenue | 201 |
| SELECT scan anonyme avec auteur NULL | Lecture historique maintenue | 200 |
| INSERT brut alerte | Ancienne écriture maintenue | 201 |
| SELECT profil tiers, compte connecté non provisionné | Ancienne lecture large maintenue | 200 |

Ces succès prouvent la compatibilité et la persistance des risques historiques.
Ils ne constituent aucune validation de sécurité des anciens accès. Les droits
et comportements P02 déjà installés avant A ne sont pas réouverts.

## F. Nouveau client

La vérification réelle utilise exclusivement `verify_public_lot`. Une RPC absente,
en erreur ou ambiguë devient UNAVAILABLE ; aucune lecture générale des lots ni
fallback FAB. Le journal appelle seulement `record_verification_scan`, sans verdict
ni identité fournis par le client. Son erreur reste secondaire au résultat obtenu.
Les codes démo connus/inconnus restent explicitement simulés et séparés.

Le profil propre, l'annuaire et le catalogue utilisent les RPC décrites en B ;
le détail fabricant et la liste DPH utilisent `business_lots`, les statistiques
DPH utilisent `supervision_stats`. Les accès métier nécessaires aux autres
écrans, transferts et demandes sont conservés. L'UUID interne d'un lot provient
seulement de l'enrichissement d'un transfert autorisé, jamais de la RPC publique.

Les essais navigateur ont révélé un blocage de connexion via le proxy Auth local
avant tout appel réseau. Correction limitée : le login réel appelle désormais
`getSupabase().auth.signInWithPassword` après désactivation du mode démo.
Les tests de rôle et la connexion réelle passent ensuite. Deux seuls alias démo
de vues ont été ajoutés ; pas de refonte générale du proxy Supabase.

Revue des modifications React : hooks existants conservés, pas de hook conditionnel
ajouté, séparation des états d'erreur conservée, protection des résultats contre
les réponses de recherche périmées conservée. Cela ne remplace pas un audit
complet d'accessibilité ni une validation Android physique.

## G. Preview, production et outils connectés

L'app et la vitrine existaient déjà. MCP Vercel et CLI ont été utilisés sur le
projet existant `pharmatraceapp` (`prj_7tFBlhbPLp8bFotCCaIYXZqxAUDT`).
La vitrine n'a pas été redéployée.

Preview final testé :
[pharmatraceapp-qaryp7sdu](https://pharmatraceapp-qaryp7sdu-mohameds-projects-0af41c6a.vercel.app),
`dpl_7ZNQbHBjz47w4tjoB69ssZmbgzvt`, READY, target preview/null, aucun alias.
Il est protégé par Vercel Authentication. Accès automatisé avec OIDC temporaire
via `vercel env run`, header limité à l'origine preview ; aucun jeton envoyé à
Supabase ou publié. Un premier preview `dpl_2fCjUk61g6CUUfNX3GhtAGWJwhZt` est
conservé comme preuve du défaut Auth corrigé, pas présenté comme preview validé.
Un appel `vercel curl` a laissé la CLI générer son jeton normal de contournement
de protection ; aucune protection n'a été désactivée.

Production après tous les essais : [pharmatraceapp.vercel.app](https://pharmatraceapp.vercel.app/)
reste sur `dpl_AswPKQ419gWeETYouS6uBnkEV3XT`, URL immuable
`pharmatraceapp-n12ve53qo-mohameds-projects-0af41c6a.vercel.app`. Les alias production
et git-main sont inchangés. Aucune promotion ni modification de configuration du
projet. Le preview a été construit/exporté localement puis déployé en prebuilt.

## H. Tests, attendus et résultats

| Groupe | Attendu | Obtenu |
| --- | --- | --- |
| LOT 0.1 | Aucun verdict fabriqué ; journal secondaire ; démo explicite | 39/39 |
| Rôle client | Autorité DB ; refus compte non provisionné | 11/11 |
| Client LOT 0.3 | RPC minimale, archive, profils/catalogue, pas de fallback | 13/13 |
| Client A supplémentaire | Annuaire limité, erreurs sans repli, démo des nouvelles vues | 4/4 |
| Total local | Tous verts sans dépendance ajoutée | 67/67 |
| SQL A avant application et après | Compatibilité historique + nouvelles surfaces | 31/31 ; empreinte historique inchangée |
| SQL P02 sur A | Provisionnement et colonnes protégées | 30/30 |
| SQL B, transaction rollbackée | Restrictions cibles et P02 conservé | 59/59 + 30/30 |
| HTTP réel contre A | Appels REST/Auth, rôles, profils et journaux | 42/42 |
| Navigateur contre preview/A | UI réelle, erreurs secondaires et absence de repli | 20/20 |
| TypeScript | Compilation sans émission | Succès |
| Export web | Build statique du client réel | Succès, 34 routes |

Parcours contre A et preview :

| Scénario | Attendu | Obtenu |
| --- | --- | --- |
| Code connu | Correspondance minimale réelle | RPC 200 ; UI correspondante |
| Code inconnu | Réponse vide / NOT_FOUND | RPC 200 [] ; UI absence |
| Code invalide | Refus avant requête UI ; validation DB indépendante | Aucun RPC UI ; SQLSTATE 22023 via HTTP direct |
| Lot archivé | État archivé, pas de verdict positif actif | Conforme HTTP/UI |
| Lot expiré | Date publique et affichage expiré | Conforme HTTP/UI |
| Ambiguïté numéro/hash | Erreur, aucun premier lot | SQLSTATE 21000, HTTP 500 ; UI indisponible |
| RPC absente / réseau coupé dans navigateur de test | UNAVAILABLE, aucun fallback | HTTP 404 RPC fictive ; UI indisponible sur interception réseau |
| Champs privés | Aucun UUID lot, stock, téléphone, adresse | Six clés exactes HTTP ; projection client explicite |
| Pharmacie provisionnée | Connexion et vérification réelles | Conforme, transfert associé visible |
| Journal secondaire en erreur | Résultat FOUND conservé | Conforme UI avec réseau journal intercepté |
| Journal normal / code absent | Identité/verdict DB, alerte info | Conforme HTTP et assertions SQL |
| Compte non provisionné | Pas de navigation métier ni nouveau privilège | Message UI ; rôle/profil NULL ; nouvelles vues vides et RPC métier refusées |
| Annuaire pharmacie/fabricant | Uniquement partenaires validés, projection limitée | Conforme HTTP et UI |
| Catalogue médicament | Trois champs métier sans stock | Conforme HTTP et UI |
| Profil propre / détail fabricant | Profil UID / vue métier autorisée | Conforme HTTP et UI |
| Supervision DPH | Lots/agrégats accessibles au DPH validé | Conforme HTTP et UI |

Les pannes réseau sont injectées uniquement dans les routes du navigateur isolé ;
aucune panne du projet DB n'a été provoquée. Aucun transfert n'a été réceptionné,
ni demande envoyée depuis ces tests. Pas de validation d'envoi e-mail ou native.

Commandes et appels utilisés (paramètres non secrets uniquement) :

```text
git status --short / git branch --show-current / git rev-parse HEAD
supabase migration new add_safe_verification_surfaces
supabase migration new restrict_legacy_verification_access
node scripts/prepare-lot03-rehearsal.cjs --phase-a
node scripts/prepare-lot03-rehearsal.cjs
node scripts/prepare-lot03-rehearsal.cjs --phase-a --additive-installed
node scripts/prepare-lot03-rehearsal.cjs --additive-installed
MCP execute_sql (répétitions rollbackées, snapshots, fixtures et nettoyage borné)
MCP apply_migration (add_safe_verification_surfaces UNIQUEMENT)
MCP list_migrations / get_advisors (security et performance)
npm test
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\expo.cmd export --platform web --output-dir <répertoire temporaire>
vercel deploy --prebuilt --project prj_7tFBlhbPLp8bFotCCaIYXZqxAUDT --scope mohameds-projects-0af41c6a
vercel env run --project prj_7tFBlhbPLp8bFotCCaIYXZqxAUDT --scope mohameds-projects-0af41c6a -- node <browser-checks.cjs privé>
MCP Vercel get_deployment (production et preview)
git diff --check / git diff --stat / git diff --cached
git commit -S -m "feat(security): add minimal public verification contract"
git verify-commit HEAD
```

Export avec `EXPO_NO_DOTENV=1` et seulement URL/clé publique du MVP. Playwright
fourni par le runtime Codex utilise Edge installé, aucune installation. Les
scripts HTTP/navigateur et résultats détaillés restent dans le dossier ignoré
`A exclure de github/LOT03A_20261027/`, avec les preuves de nettoyage/comparaison.
Le fichier de fixtures contient des mots de passe fictifs : ne jamais le publier.

## I. Cache et anciens bundles

HTML et JS production observés : `Cache-Control: public, must-revalidate, max-age=0`
avec ETag. Ancien bundle : `entry-ed3cdeac3690e5e42916a0cbc1c24fad.js`.
Nouveau bundle exporté : `entry-e68b2feb2cf2a00b5f1e0dabfdede921.js`.
Aucun enregistrement service worker détecté dans les sources/bundles inspectés ;
le navigateur isolé constate zéro service worker et CacheStorage vide. Aucun
mécanisme existant ne force le rechargement ou compare une version de bundle.

Un onglet production est resté ouvert pendant les essais du preview : même script
et même marqueur mémoire avant/après. Aucune promotion n'a été réalisée ; ce test
ne simule donc pas une vraie promotion. Il démontre qu'un onglet peut continuer
à exécuter le JavaScript déjà chargé. Le cache HTTP à max-age=0 ne vide pas sa
mémoire ; BFCache et absence de navigation peuvent prolonger cet état sans durée
maximale fiable. Un changement d'alias n'élimine pas les anciens clients.

**La séparation A/B seule ne règle pas ce risque.** La B préparée peut encore
provoquer une erreur dans un ancien onglet et réveiller son fallback FAB dangereux.
Une stratégie compatible avec ces clients doit être décidée, préparée et testée
avant B. Attendre un TTL ou recommander un rafraîchissement ne constitue pas une
preuve d'extinction. Une éventuelle réponse ancienne neutre au lieu d'une erreur
demande une conception et un contre-audit supplémentaires ; elle n'est ni
implémentée ni autorisée ici.

## J. Advisors avant/après A

| Avis | Avant | Après | Lecture |
| --- | ---: | ---: | --- |
| Vues definer, ERROR | 2 | 2 | Vues historiques volontairement maintenues ; nouvelles vues invoker |
| Search path mutable, WARN | 2 | 2 | Fonctions historiques ; pas de nouvelle fonction sans chemin fixé |
| Definer exécutable anon, WARN | 2 | 3 | Ajout volontaire de la seule projection publique minimale |
| Definer exécutable authenticated, WARN | 2 | 7 | Cinq nouvelles RPC, périmètres explicitement contrôlés et testés |
| RLS sans policy, INFO | 1 | 1 | Audit privé volontairement inaccessible |
| Leaked password protection, WARN | 1 | 1 | Réglage Auth inchangé |
| FK sans index, INFO | 7 | 7 | Aucun index ajouté |
| RLS initplan, WARN | 13 | 13 | Hors lot |
| Index inutilisé, INFO | 12 | 8 | Statistiques d'usage variables, pas une optimisation |
| Policies permissives multiples, WARN | 24 | 24 | Anciennes policies préservées |

Aucun nouvel ERROR, mais les deux ERROR historiques persistent. Ne pas présenter
les advisors comme verts. Références de remédiation :
[vues](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
[search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[RPC anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[RPC authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## K. Reclassification et limites

- P03 = PARTIAL : projection minimale réellement installée/testée, anciens accès toujours présents.
- P04 = PARTIAL : nouvelles vues invoker testées ; anciennes vues larges conservées.
- P05 = PARTIAL : journal contrôlé installé/testé ; INSERT historiques toujours possibles.
- P06 = OPEN : autorisations/transitions d'écriture transferts/demandes non traitées.
- P01 : correction locale/preview conservée ; l'ancien client production n'est pas encore remplacé.
- P19/P24 : progrès locaux antérieurs conservés, aucune clôture globale supplémentaire.
- P12 = PARTIAL : accord des membres TrustGrid acquis ; licence exacte et droits tiers à finaliser.

Aucune validation physique Android, authenticité d'un médicament, résistance à
la copie, absence d'abus/rate limiting, complétude des règles d'expiration ou
transaction métier atomique n'est prouvée. Les trois profils historiques ne sont
pas provisionnés rétroactivement. Pas de nouvelle décision de licence/settings.

## L. Ordre proposé LOT 0.3B — nouveau feu vert requis

1. Préparer puis faire valider la stratégie des anciens clients : tant qu'elle ne
   garantit pas une réponse prudente aux bundles encore chargés, ne pas révoquer.
   Reprendre snapshots, migrations, cible et version du preview à promouvoir.
2. Promouvoir le nouveau client sur l'alias public, uniquement après autorisation.
3. Valider la production contre A : connu/inconnu/invalide/erreur, rôles, profils,
   annuaire/catalogue/détail/DPH, journal secondaire ; vérifier que le nouveau
   bundle est effectivement servi. Tester aussi un onglet ancien conservé ouvert.
4. Si et seulement si la stratégie de compatibilité est validée, répéter B dans
   son état alors approuvé, puis appliquer la phase restrictive atomiquement.
   Le candidat actuel doit être revu si la stratégie impose d'autres réponses.
5. Valider les restrictions, 59 assertions adaptées, P02, nouveaux parcours,
   anciens onglets/bundles, advisors et invariance des données historiques.
   Un rollback du client ancien seul après B n'est pas sûr ; prévoir le maintien
   du client corrigé et une correction compatible en cas d'incident.

Arrêt au checkpoint LOT 0.3A. LOT 0.3B et LOT 0.4 ne sont pas commencés.
