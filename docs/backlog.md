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

## Quatre issues publiques ouvertes — 5 novembre 2026

- [nº 2 — labels accessibles du scanner](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/issues/2), `good first issue` : périmètre UI, aucune RLS/RPC.
- [nº 3 — installation Linux / PowerShell](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/issues/3), `good first issue` : clone public, Node 22, données fictives, aucune DB du propriétaire.
- [nº 4 — clavier et focus de la vitrine](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/issues/4), `good first issue` : menu mobile existant, aucune nouvelle landing.
- [nº 5 — triage P16/P17](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/issues/5), suivi distinct des dépendances, sans label de première tâche et sans minimiser les risques.

Les corps préparatoires restent dans `docs/release/issues/` pour traçabilité ; ne pas recréer ces issues en double. Aucun signalement sensible n’est transformé en première tâche. Voir [CONTRIBUTING](../CONTRIBUTING.md) et [SECURITY](../SECURITY.md).
