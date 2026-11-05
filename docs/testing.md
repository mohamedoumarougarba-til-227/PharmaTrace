# Tests et CI

Dans `app/PharmaTrace` : `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run check:public`, `npm run build:web`.

Les 95 tests existants utilisent le runner Node et les vrais modules TypeScript, avec imports natifs/SDK substitués. Ils couvrent recherche honnête, rôle, intentions RPC, retry et erreurs secondaires, sans contacter le backend propriétaire. Le contrôle public vérifie liens locaux, configuration fictive et motifs de secrets dans les fichiers suivis ; ce n’est pas un scanner exhaustif.

`.github/workflows/ci.yml` : Node 22/Linux, installation verrouillée, permissions lecture seule, aucune clé DB ni déploiement. Actions épinglées par SHA. La [CI de publication sur main](https://github.com/mohamedoumarougarba-til-227/PharmaTrace/actions/runs/42102309187) a réussi sur `9a18cf85aa7ff396e8fd65eceed918a5e2aed249` : 95 tests, TypeScript, contrôle public, export web et contrôle du bundle. Ce résultat daté ne préjuge pas des exécutions des futures PR.

Phase 1 : SQL métier 104, P02 30, B2 60, concurrence réelle et nettoyage démontrés. Ces tests DB ne font pas partie de la CI sans base. [Reproduction isolée](database.md).

L’export compile les routes. Les captures montrent une simulation locale, sans preuve physique Android/caméra, accessibilité assistée ou exploitation en pharmacie. Audit npm daté dans [dependency-triage.md](dependency-triage.md), pas de seuil générique prétendant remplacer le triage runtime.

L’export est désormais reconstruit avec `--clear` pour invalider les transformations Metro portant des variables précédentes. `npm run check:export` vérifie le bundle contre une URL explicitement fournie et l’absence de motif de clé privilégiée. La CI fournit des valeurs fictives, désactive dotenv et n’utilise aucun secret du propriétaire.
