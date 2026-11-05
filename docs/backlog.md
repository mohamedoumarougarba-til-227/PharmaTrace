# Backlog transparent — sans bloquer la release source

P06/P07/P08/P09 sont clos au gate métier validé. Pas de nouveau lot de hardening.

| Sujet | Travail futur borné / preuve attendue |
| --- | --- |
| P10 QR/deep-link | Consommer automatiquement le paramètre et lancer une seule recherche ; tests URL/écran et téléphone. |
| Données historiques | Décision humaine pour trois bilans incohérents ; conserver preuves, ne pas auto-réparer. |
| Android/caméra/P25 | Build corrigé, permission audio justifiée ou retirée après essais physiques ; APK historique distinct. |
| Démo métier | Simulation transactionnelle/persistance complète si utile ; mode actuel lecture fictive seulement. |
| Advisors | Triage ciblé, index/conditions RLS/protection mots de passe ; pas de réouverture des accès legacy. |
| P05 no-op legacy | Retrait éventuel coordonné avec anciens clients ; ne pas rétablir les INSERT dangereux. |
| P16/P17 | Mises à jour compatibles, Supabase/shims web+native ; triage daté séparé. |
| Accessibilité | Labels, focus clavier, contraste et essai lecteur d’écran. |
| Usage officine | Ventes, reliquats, conditions d’exploitation, confidentialité, disponibilité et validation métier réelles. |
| P27 | Flux de récupération de mot de passe complet ou retrait de l’affordance héritée. |
| Dette technique | Typage et petites extractions P30 au fil des corrections, sans refonte globale. |

## Trois premières tâches proposées

Corps d’issues prêts dans `docs/release/issues/`, à créer seulement après feu vert :

1. Labels accessibles des boutons icônes du scanner ; périmètre UI, aucune RLS/RPC.
2. Vérifier le parcours d’installation Node 22 sous Linux et PowerShell ; données fictives, aucune DB du propriétaire.
3. Navigation clavier et focus du menu mobile de la vitrine existante ; pas de nouvelle landing.

Labels envisagés : `good first issue`, `help wanted`, `documentation` ou `accessibility` selon la tâche. Aucun signalement sensible n’est transformé en première tâche.
