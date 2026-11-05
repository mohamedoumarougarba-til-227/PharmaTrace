# PharmaTrace v1.1.0-preview.1 — préversion source

PharmaTrace est un MVP expérimental de gestion et traçabilité de lots de médicaments, développé au Niger par l’équipe TrustGrid dans le contexte du MIABE Hackathon 2026. Cette préversion publie les sources sous Apache-2.0 pour les contributions originales dont les droits sont établis ; les composants tiers conservent leurs licences et notices.

## Provenance

- PR intégrée : [nº 1](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/pull/1), par merge commit, sans squash ni réécriture.
- Commit de main : `9a18cf85aa7ff396e8fd65eceed918a5e2aed249`, signé et vérifié par GitHub ; les 11 commits de préparation sont conservés.
- Tag annoté signé : `v1.1.0-preview.1`, ciblant ce commit.
- Client web : `dpl_9A3fGoycXNgEU9HByDxsMcQBArPH`, construit depuis ce main.
- Vitrine existante : artefact de production `dpl_3WFDryY7GjdN6xY3TVh3znup1Bp1`, mêmes sources approuvées, contrôlé avant promotion.

## Principaux changements

- Recherche distinguant correspondance au registre, absence et indisponibilité technique, sans fallback positif fabriqué ; journalisation secondaire séparée.
- Autorité des rôles durcie, réponses publiques minimales, restrictions des accès historiques et vues corrigées.
- Transferts, variations de stock et demandes associées transactionnels, avec contrôles de propriété, transitions, concurrence et retry/idempotence.
- Documentation d’installation, architecture, contribution et sécurité ; CI publique, exemples fictifs, captures en simulation et limitations explicites.
- Licence, crédits et notices ; 46 archives/médias et métadonnées personnelles retirés de l’arbre source courant, sans suppression physique ni effacement de l’historique.

## Validation réellement effectuée

- CI Linux / Node 22 : installation verrouillée, **95/95 tests**, TypeScript, contrôles publics (**178 chemins, 90 liens**), export de **34 routes**, contrôle du bundle et diff.
- Exécutions : [push de préparation](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/actions/runs/41940363436), [pull_request](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/actions/runs/41940429863), [main après fusion](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/actions/runs/42102309187), toutes réussies.
- Production : recherche publique réelle sans résultat, panne RPC simulée côté navigateur, correspondance démo explicitement simulée, navigation des trois rôles en démo ; sept textes légaux identiques au commit et ressources JS/CSS accessibles.
- Vitrine : HTML et images servis conformes aux sources ; contrôles des crédits, liens, ressources et rendu mobile/desktop.
- Preuves SQL et HTTP du gate métier antérieur conservées : 104 assertions métier, 30 P02, 60 B2, 46 HTTP et concurrence PostgreSQL réelle. **Ces assertions SQL ne sont pas exécutées dans la CI publique**, et aucune migration n’est réappliquée par cette release.

## Limites

Une correspondance au registre ne certifie pas l’authenticité physique d’une boîte. Un QR peut être copié. Aucune blockchain opérationnelle, certification ou garantie réglementaire n’est revendiquée. Il ne s’agit pas d’un logiciel d’officine validé pour une utilisation réelle.

P16/P17 restent PARTIAL : risques de dépendances et shims documentés, sans mise à niveau forcée. Deep-link automatique, démo métier complète, accessibilité, advisors/no-op legacy et validation physique Android/caméra restent au backlog. Trois stocks historiques incohérents demeurent intacts et bloqués. La navigation démo ne prouve pas une connexion réelle à chaque rôle ; aucun compte métier réel n’a été utilisé pendant cette validation de publication.

## Web et Android : versions distinctes

**Aucun nouvel APK n’est fourni.** L’APK de la release historique `v1.0.0`, publié le 5 juin 2026, est antérieur aux correctifs récents et ne représente pas cette préversion. Il est conservé dans sa release d’origine. Les champs de version natifs historiques `1.0.0` ne constituent pas une nouvelle validation Android.

## Essayer et contribuer

- [Application](https://pharmatraceapp.vercel.app/) · [Vitrine](https://pharmatrace-eta.vercel.app/)
- [README](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/blob/main/README.md) · [Installation isolée](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/blob/main/docs/installation.md)
- [Contribuer](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/blob/main/CONTRIBUTING.md) · [Sécurité](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/blob/main/SECURITY.md) · [Issues](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/issues)
- [LICENSE](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/blob/main/LICENSE) · [NOTICE](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/blob/main/NOTICE) · [Droits tiers](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/blob/main/THIRD_PARTY_NOTICES.md)

Utiliser des données fictives et son propre environnement isolé, jamais les comptes ou le Supabase MVP du propriétaire. Français principal ; contributions ciblées et reproductibles bienvenues. Certains documents de préparation versionnés conservent leur état daté de gate ; ces notes décrivent la publication effective.

Crédits historiques : Mohamed Oumarou Garba, Mahamadou Garba Zakou et Abdoul Raouf Harouna Moussa ; TrustGrid, Niger, MIABE Hackathon 2026. Aucun partenariat institutionnel officiel n’est déduit de ce contexte.
