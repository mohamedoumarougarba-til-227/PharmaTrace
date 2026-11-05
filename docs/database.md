# Base isolée, migrations et fixtures

**Jamais sur le MVP du propriétaire.** Utiliser votre projet Supabase personnel vide. Aucun Docker/PostgreSQL n’est installé sur la machine du propriétaire pour ce sprint.

## Deux histoires

Sept versions distantes : `20260525020210`, `20260603200659`, `20260605010358`, `20261027153134`, `20261027205429`, `20261028232100`, `20261029212749`. Deux correctifs initiaux distants ont d’autres équivalents locaux ; le SQL initial distant n’est pas byte-identique au fichier initial.

Le bootstrap local contient huit fichiers. `fresh-migration-plan.cjs` ajoute avant B2 une policy deny-all attendue par son DROP historique, sans réouvrir l’ancien accès. Aucune migration déjà appliquée réécrite. `20261029212749` contient exactement le SQL métier livré ; son ancien nom candidat n’était pas enregistré.

## Base vide

Depuis `app/PharmaTrace` :

```sh
node scripts/prepare-fresh-install.cjs > fresh-install.sql
```

Lire puis exécuter comme opérateur `postgres` dans le SQL Editor de **votre base isolée vide**. Ce script ne se connecte à rien ; la transaction refuse une base contenant Auth ou les tables PharmaTrace et enregistre huit versions locales. Pas sur une base existante, pas de `supabase db push` aveugle. Ne pas commiter un export de données/credentials.

## Seed

Créer trois comptes Auth confirmés dans votre projet : fabricant, pharmacie, supervision ; adresses fictives `@example.invalid`, mots de passe locaux non committés. Reporter leurs UUID dans les paramètres de `supabase/seed-demo.sql`, lire et exécuter comme opérateur. Aucun UUID par défaut. Garde de tables métier vides, provisioning via fonction privée, puis trois lots fictifs. Aucun utilisateur réel créé ou stock existant réparé. Cette seed est distincte de la démo en mémoire.

Une auto-inscription ou métadonnée `role` ne donne pas d’accès métier ; provisioning explicite par opérateur requis.

## Tests SQL

```sh
node scripts/prepare-business-rehearsal.cjs --installed > installed-tests.sql
```

Exécuter après lecture sur votre base de test installée, avant seed/données opérationnelles : les assertions de cardinalité supposent le terrain de test prévu. Les fixtures métier/P02/B2 sont annulées par sous-transaction. La CI publique n’exécute pas PostgreSQL. Les preuves sur MVP sont des checkpoints historiques, pas une invitation à les rejouer chez le propriétaire.

Le replay des huit migrations en schémas non exposés et rollback a été validé en phase 1 ; ce n’est pas une installation native PostgreSQL ou `supabase db reset` prouvée chez chaque contributeur. La nouvelle seed est fournie avec gardes et doit être relue dans votre environnement personnel.
