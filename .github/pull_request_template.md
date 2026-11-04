## Problème et comportement obtenu

Décrire une modification cohérente et ses limites. Lier l’issue si elle existe.

## Validation

- [ ] `npm test`
- [ ] `npx tsc --noEmit`
- [ ] `npm run check:public`
- [ ] `npm run build:web`
- [ ] Données fictives ; aucun secret, export DB ou fixture persistante.

Indiquer les vérifications non exécutées et pourquoi. CI verte ≠ validation
physique. Si DB : migration nouvelle, tests négatifs par rôle, atomicité/reprise
et concurrence si pertinente ; ne jamais tester sur le MVP du propriétaire.

## Risques et provenance

Régression possible, validation manuelle nécessaire et origine/licence des
éléments tiers ajoutés. Respecter les crédits TrustGrid/MIABE.
