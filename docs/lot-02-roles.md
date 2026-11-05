# LOT 0.2 — Rôles administrés

Périmètre : P02, sur le MVP Supabase explicitement autorisé. Aucun rôle métier admin,
aucune fusion, aucun déploiement applicatif automatique.

## Checkpoint avant correction

Git : `hardening/public-readiness-20261027 @ 27c2860bf20c730466f017811e52a38e9edb9e9b`.
Projet : `qctedpyydisawsknahso`, réactivé avec autorisation ; PostgreSQL 17.6.
Volumes : 3 comptes/profils, 6 lots, 10 transferts, 7 demandes, 14 scans, 8 alertes.
Les données détaillées et catalogues restent dans le dossier local ignoré
`A exclure de github/LOT02_20261027/`. Ce checkpoint logique ne comprend pas
les mots de passe/secrets Auth et ne remplace pas un backup physique complet.

Migrations distantes avant correction : initial_schema (20260525020210),
fix_get_my_role_recursion (20260603200659), demandes_stock (20260605010358).
Elles diffèrent des quatre fichiers historiques du dépôt. La DB dispose déjà de
`statut_transfert.annule`, d'une politique d'annulation fabricant et d'une lecture
des profils pour tous les authentifiés. Ces différences ne sont pas réécrites ici.

Reproduction avant : métadonnée agent_dph accordant le rôle, puis autopromotion
fabricant vers agent_dph par UPDATE, toutes deux confirmées avec fixtures annulées.

## Choix du modèle

Une seule source du rôle : `public.utilisateurs`, avec validation opérateur
`role_provisioned_at` et statut actif. Un signup Auth ne crée plus de profil métier.
Le client ne peut pas insérer un profil ni modifier une colonne d'autorité.

La table administrée conserve le modèle existant. Une fonction privée SQL réservée
à postgres provisionne/revalide le profil et une trace atomique enregistre les
anciennes/nouvelles valeurs, l'opérateur et le motif. Aucun secret service_role
n'est ajouté à l'application. L'invitation reste une possibilité opérationnelle,
pas une source de droits. Des claims serveur ajouteraient ici une deuxième source
et un problème de fraîcheur ; ils ne sont pas nécessaires.

Les profils historiques conservent leurs données et leur ancien libellé de rôle,
mais ne sont pas automatiquement approuvés. Un opérateur devra vérifier chaque
compte avant de lui accorder les droits. Un profil absent, incomplet/non validé ou
archivé ne produit aucun rôle effectif. Aucun compte existant n'est supprimé.

## Matrice des colonnes

| Colonne | Utilisateur lui-même | Opérateur postgres | Système |
|---|---|---|---|
| id | lecture | lien Auth, pas de réaffectation ordinaire | identité Auth |
| email | lecture | synchronisation contrôlée depuis Auth | Auth |
| nom, prenom | modification de son profil | initialisation si nécessaire | aucune autorité |
| telephone, adresse, ville | modification de son profil | initialisation si nécessaire | aucune autorité |
| nom_entite, pays | lecture | décision métier explicite et tracée | aucune attribution client |
| role | lecture | provisionnement explicite et tracé | source DB contrôlée |
| numero_agrement | lecture | validation métier explicite et tracée | aucune attribution client |
| statut | lecture | actif/archive, changement tracé | contrôle du rôle effectif |
| role_provisioned_at | lecture | validation explicite et tracée | NULL par défaut |
| created_at | lecture | aucune modification ordinaire | horodatage de création |
| updated_at | lecture | aucune modification ordinaire | trigger existant |

## Matrice des droits observés et limites conservées

S = SELECT, I = INSERT, U = UPDATE ; D = DELETE, sans politique accordant D.
Les droits ci-dessous décrivent les politiques existantes avec le rôle effectif
durci. Ils ne constituent pas une approbation du contrat P03–P06.

| Ressource | Anonymous | Auth sans rôle | Fabricant validé | Pharmacie validée | DPH validé |
|---|---|---|---|---|---|
| utilisateurs | aucune ligne directe | S global déjà permis ; U contacts propres si profil existant | idem | idem | idem |
| lots | S global | S global | S ; I/U propres lots | S | S |
| transferts | aucune ligne | S si partie historique | S si partie ; I expéditeur ; U expéditeur | S si partie ; U destinataire | S global |
| demandes | aucune ligne | S si partie historique | S si partie ; U fabricant | S si partie ; I pharmacie ; U annulation | S global |
| scans | S anonymes ; I public | S propres/anonymes ; I public | idem | idem | S global ; I public |
| alertes | I public | I public ; S si créateur historique | idem | idem | S global ; U ; I public |
| vues | S propriétaire, contournement RLS | idem | idem | idem | idem |

Le rôle service_role est un rôle technique privilégié, pas un rôle métier.
Il n'est jamais utilisé dans le client ; le chemin de provisionnement est réservé
à postgres. Aucun DELETE métier n'est ajouté.

P03 : lectures globales lots, profils authentifiés et scans anonymes restent ouvertes.
P04 : les deux vues propriétaire restent accessibles et doivent être traitées séparément.
P05 : les INSERT scans/alertes et les verdicts client restent ouverts.
P06 : propriété du lot, colonnes et transitions transferts/demandes restent à durcir.

## Opération administrée

Exemple avec une identité fictive, à adapter uniquement après vérification du compte :

```sql
select private.provision_business_profile(
  '00000000-0000-0000-0000-000000000001',
  'fabricant', 'LOT02_TEST_ENTITE', 'LOT02_TEST_AGREMENT',
  'actif', 'Validation explicite du compte fictif'
);
```

Ce chemin n'est pas exposé dans le schéma public et n'est pas exécutable par
anon/authenticated/service_role. Toute modification d'autorité exige un motif.
Les contacts ordinaires restent soumis au contrôle de propriétaire RLS.

## Validation

Les tests SQL sont exécutés comme postgres et simulent les sessions JWT/RLS avec
SET LOCAL ROLE et request.jwt.claim.sub. Les insertions auth.users déclenchent
le véritable trigger Auth DB ; elles ne remplacent pas un signup HTTP avec email.
Fixtures et opérations sont annulées par sous-transaction, sans effacer l'historique.

### Migration réellement appliquée

`20261027153134_harden_business_role_provisioning.sql`, appliquée sur le MVP.
Le fichier a été créé par `supabase migration new harden_business_role_provisioning`
(horodatage CLI initial 20261027153058), puis son nom a été aligné sur la version
20261027153134 réellement enregistrée par apply_migration. Aucune ancienne
migration n'a été changée. Le SQL complet est dans le fichier de migration.

La répétition préalable du SQL et des assertions a été annulée intégralement,
puis les mêmes assertions ont été exécutées sur la migration appliquée.
Résultat : 30/30 assertions SQL, avant et après application.

### Auth/RLS : acteurs, actions et résultats

Chaque ligne ci-dessous correspond aux assertions du script `p02_roles.sql`.
Les refus de modification d'un tiers se matérialisent par zéro ligne modifiée ;
les colonnes protégées et écritures privilégiées sont refusées par PostgreSQL.

| Tests | Acteur / action | Attendu | Obtenu |
|---|---|---|---|
| T01 | nouveau compte, metadata agent_dph | aucun profil automatique | conforme |
| T02 | nouveau compte, metadata fabricant | aucun profil automatique | conforme |
| T03 | nouveau compte, metadata objet/is_admin | aucun profil automatique | conforme |
| T04 | fabricant, changement de son rôle | refus | conforme |
| T05a | fabricant, changement de statut | refus | conforme |
| T05b | fabricant, changement d'agrément | refus | conforme |
| T05c | fabricant, changement d'entité | refus | conforme |
| T05d | fabricant, auto-validation | refus | conforme |
| T05e | fabricant, changement d'identité | refus | conforme |
| T06 | fabricant, nom/téléphone/ville propres | une ligne modifiée | conforme |
| T07 | fabricant, contact d'un tiers | zéro ligne modifiée | conforme |
| T08 | postgres, provisionnement fabricant | rôle validé enregistré | conforme |
| T09 | postgres, provisionnement pharmacie | rôle validé enregistré | conforme |
| T10 | postgres, provisionnement DPH | rôle validé enregistré | conforme |
| T11a | compte non provisionné, metadata DPH dans JWT | rôle effectif NULL | conforme |
| T11b | compte non provisionné, création de lot | refus | conforme |
| T11c | compte non provisionné, création de demande | refus | conforme |
| T12 | fabricant, devenir pharmacie | refus | conforme |
| T13 | pharmacie, devenir DPH | refus | conforme |
| T14 | DPH, modifier son propre rôle | refus | conforme |
| T15 | fabricant validé, get_my_role | fabricant | conforme |
| T16 | client authentifié, fonction privée de provisionnement | refus | conforme |
| T17 | client authentifié, journal privé | refus | conforme |
| T18 | pharmacie validée, get_my_role | pharmacie | conforme |
| T19 | DPH validé, get_my_role | agent_dph | conforme |
| T20 | profil présent mais non validé | rôle effectif NULL | conforme |
| T21 | fabricant validé puis archivé | rôle effectif NULL | conforme |
| T22 | anonyme | rôle effectif NULL | conforme |
| T23 | changements d'autorité administrés | cinq traces atomiques | conforme |
| T24 | contrôle des grants authentifiés | pas d'INSERT/rôle UPDATE ; contact UPDATE permis | conforme |

Ces résultats valident le chemin Auth **dans PostgreSQL** et les privilèges SQL.
Ils ne prouvent pas le parcours HTTP signup, la confirmation email, le renouvellement
de session ni l'utilisation physique sur téléphone. Les autorisations résiduelles
P03–P06, notamment les INSERT publics, ne sont pas des privilèges métier validés
par ce lot et restent à corriger.

### Constats DB P03–P06

Sonde exécutée avant la correction des rôles, avec uniquement des fixtures annulées :

- P03 : anon lit les six lots existants (sept pendant la sonde, dont un fictif)
  et neuf des quatorze scans existants. Les profils sont lisibles globalement par
  authenticated via une politique déjà présente.
- P04 : `lots_avec_fabricant` expose les sept lignes de la sonde ; six contiennent
  un téléphone fabricant non NULL. Aucun téléphone n'est publié dans ce rapport.
  Cette vue et `stats_dashboard` appartiennent à postgres, sans security_invoker ;
  leurs grants incluent anon/authenticated/service_role.
- P05 : anon peut enregistrer un scan avec identité/type/verdict choisis, ainsi
  qu'une alerte avec auteur/niveau choisis. Ces deux INSERT ont réellement réussi.
- P06 : un fabricant peut créer un transfert sur le lot fictif d'un autre fabricant.
  Les politiques de demandes et transitions ont été inspectées, sans prétendre à
  une couverture exhaustive de leurs combinaisons.

Ces politiques métier et vues restent inchangées. Seul le calcul de rôle et le
contrôle des modifications du profil ont été durcis.

### Advisors avant / après

| Advisor | Avant | Après | Décision |
|---|---:|---:|---|
| security_definer_view (ERROR) | 2 | 2 | P04 ouvert |
| function_search_path_mutable (WARN) | 2 | 2 | fonctions historiques hors P02 |
| anon_security_definer_function_executable (WARN) | 3 | 2 | handle_new_user corrigé |
| authenticated_security_definer_function_executable (WARN) | 3 | 2 | handle_new_user corrigé |
| auth_leaked_password_protection (WARN) | 1 | 1 | réglage Auth inchangé |
| rls_enabled_no_policy (INFO) | 0 | 1 | journal privé, absence de politique client intentionnelle |
| unindexed_foreign_keys | 7 | 7 | aucune création d'index automatique |
| auth_rls_initplan | 14 | 13 | politique UPDATE profil optimisée |
| unused_index | 20 | 20 | aucune suppression |
| multiple_permissive_policies | 24 | 24 | politiques métier hors P02 |

`get_my_role` conserve SECURITY DEFINER et EXECUTE pour les rôles API car les
politiques existantes l'appellent, y compris lors de lectures anonymes. La fonction
est limitée à auth.uid(), sans paramètre de cible, avec search_path fixé et sans
rôle si la validation/statut ne convient pas. `auto_alerte_scan_suspect` reste à
examiner dans P05. Les alertes ne sont donc pas toutes résolues.

Remédiations officielles :
[vues](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
[search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[fonctions anonymes](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[fonctions authentifiées](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[RLS sans politique](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### Client et validations locales

Le helper typé `businessRole.ts` consulte le rôle effectif DB. Il distingue
anonyme, connecté sans provisionnement, droits indisponibles et rôle autorisé.
Login, entrée de l'application, trois layouts métier et lien de retour du
vérificateur public utilisent ce contrat. Aucun fallback sur profile.role.
Le mode démo conserve ses rôles locaux et ne provisionne aucun compte réel.

Le login affiche le message de compte connecté sans accès validé et libère son
loader même après exception réseau. Aucun redesign, aucune dépendance ajoutée.

Commandes exécutées dans `app/PharmaTrace` :

```powershell
supabase migration new harden_business_role_provisioning
npm.cmd test
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
$lot02Export=Join-Path ([IO.Path]::GetTempPath()) ('pharmatrace-lot02-web-'+[guid]::NewGuid().ToString('N'))
$env:EXPO_NO_DOTENV='1'
$env:EXPO_PUBLIC_SUPABASE_URL='https://example.invalid'
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY='lot02-local-placeholder'
node .\node_modules\expo\bin\cli export --platform web --output-dir $lot02Export --max-workers 2
```

La CLI disponible a été utilisée sans installation ni mise à niveau de dépendances.
Les opérations distantes ont utilisé get_project, restore_project, list_migrations,
execute_sql (catalogues, snapshots et tests), apply_migration, get_advisors sécurité
et performance. Aucun db reset/push, DROP massif ou changement de settings.

- Node : **50/50**, dont les **39/39 LOT 0.1** et onze nouveaux tests.
- Nouveaux tests : compte sans rôle, anonyme sans RPC, trois rôles validés,
  erreurs session/RPC, rôle inattendu, démo sans accès réel, login non provisionné,
  navigation autorisée et exception réseau avec libération du loader.
- Un premier passage a révélé trois imports d'assets non simulés dans le harnais
  de test du login ; le harnais a été corrigé, puis la suite complète a réussi.
- TypeScript : code retour 0.
- Export web : code retour 0, 34 routes, configuration locale fictive et .env désactivé.
- Aucun déploiement applicatif, test natif/physique ou email envoyé.

### Données fictives et préservation

Les UUID sont générés à chaque exécution ; les adresses sont sur example.invalid.
Ils ne sont pas des comptes Auth créés via HTTP et ne possèdent pas de mots de passe.

| Script / exécution | Lignes fictives créées ou modifiées dans la sous-transaction | Sortie |
|---|---|---|
| p02_before.sql, reproduction avant | 2 auth.users `lot02_test_before_agent_<UUID>`, `lot02_test_before_maker_<UUID>` ; 2 profils automatiques ; autopromotion du second | tout annulé |
| sonde P03–P06 avant | 3 auth.users `lot02_test_owner_<UUID>`, `lot02_test_other_<UUID>`, `lot02_test_receiver_<UUID>` ; 3 profils automatiques ; 1 lot `LOT02_TEST_<UUID>` / médicament `LOT02_TEST_MEDICAMENT` ; 1 transfert ; 1 scan hash `LOT02_TEST_FORGED` ; 1 alerte description `LOT02_TEST_FORGED` | tout annulé |
| p02_roles.sql, répétition annulée puis validation après application | par passage : 5 auth.users `lot02_test_agent_<UUID>`, `lot02_test_maker_<UUID>`, `lot02_test_arbitrary_<UUID>`, `lot02_test_pending_<UUID>`, `lot02_test_unvalidated_<UUID>` ; 4 profils entités `LOT02_TEST_DPH/FABRICANT/PHARMACIE/UNVALIDATED` ; 5 traces d'autorité ; contacts propres et archivage du fabricant | tout annulé |

Les tentatives de création lot/demande par le compte non provisionné sont refusées ;
elles ne créent aucune ligne. Le nettoyage est le rollback de la sous-transaction,
sans DELETE sur les données historiques. Les séquences PostgreSQL peuvent avancer
malgré rollback ; aucun inventaire de données n'est présenté comme un backup binaire.

Contrôle final : **0 compte Auth lot02_test, 0 ligne d'audit persistante,
0 profil historique validé**. Comptes/profils 3, lots 6, transferts 10, demandes 7,
scans 14, alertes 8 avant comme après. La comparaison des valeurs de toutes les
colonnes originales de ces tables et des champs Auth exportés est identique.
La nouvelle colonne role_provisioned_at vaut NULL sur les trois profils historiques.

Configuration Auth constatée : signup email autorisé, confirmation email requise,
connexion anonyme désactivée. Aucun paramètre Auth n'a été modifié.

### Statut et limites

- P02 : **PARTIAL** — correction DB appliquée et 30 assertions SQL validées ;
  adaptation client locale validée, déploiement et parcours signup HTTP/email non validés.
- P03–P06 : **OPEN**, constats réellement reproduits/inspectés, corrections hors LOT 0.2.
- P14 : **PARTIAL**, migration et tests SQL rejouables disponibles ; installation
  indépendante, seed complet et replay sur base vierge non démontrés.
- P01 reste DONE local/commité/testé, sans déploiement démontré ; ses 39 tests passent.
  P19/P24 restent PARTIAL. P12 reste PARTIAL : accord des membres acquis, licence
  exacte et droits tiers à finaliser.

La DB MVP est désormais durcie sur l'autorité des rôles, mais l'application publiée
n'a pas été redéployée : son ancien affichage peut encore lire le libellé historique.
La DB refuse néanmoins les privilèges nécessitant le rôle effectif non validé.
Les trois comptes historiques doivent être examinés individuellement par le propriétaire
avant provisionnement ; ce lot n'invente pas leur approbation métier.

Pas de garantie globale de sécurité, de transaction des transferts, de minimisation
publique, d'authenticité physique ou de reproductibilité intégrale. Aucun projet,
branche Supabase ou abonnement payant créé. Badge Access, Vercel, main et GitHub
settings inchangés. Aucun commit/push LOT 0.2. Arrêt avant LOT 0.3.
