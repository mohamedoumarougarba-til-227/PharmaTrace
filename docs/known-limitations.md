# Limites connues

- MVP expérimental ; aucune certification, partenariat officiel ou validation médicale/réglementaire. Ne pas décider d’une dispensation sur le seul résultat.
- Lot trouvé = registre ; QR copiable, aucune preuve physique, signature fabricant ou immutabilité absolue.
- P10 : deep-link QR automatique à compléter ; saisie manuelle disponible.
- Android/caméra et permission RECORD_AUDIO héritée à examiner sur téléphone, pas retirée sans essai.
- Trois lots historiques incohérents intacts et bloqués ; réconciliation humaine distincte.
- Anciens profils non provisionnés sans accès métier ; provisioning par opérateur si utilisation souhaitée.
- Démo en mémoire incomplète, écritures désactivées ; récupération de mot de passe non complète, ne pas la considérer disponible.
- Compteurs limités au registre ; courbes décoratives annoncées, répartition détaillée DPH non implémentée plutôt que chiffres artificiels. Aucune statistique sanitaire nationale extrapolée.
- Stocks/ventes/reliquats et transferts entre pharmacies : pas un logiciel complet d’officine.
- Dette advisors/no-op legacy, shims et vulnérabilités npm triées ; pas de disponibilité garantie.
- Ancien onglet = ancien JavaScript en mémoire ; recharger, sans réouvrir les écritures brutes refusées.
- Support bénévole sans SLA ; présentation et accessibilité perfectibles.
- APK historique antérieur aux correctifs, pas un client corrigé.

[Backlog](backlog.md). Les checkpoints datés ne ferment pas automatiquement P01–P30.

Le décodeur web jsQR existant est chargé via CDN par Expo Camera ; disponibilité hors ligne de la caméra non démontrée. Sa licence est documentée séparément du lockfile npm.
