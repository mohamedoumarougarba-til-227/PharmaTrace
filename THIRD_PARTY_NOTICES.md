# Éléments tiers et attributions

Le code original et les créations originales de PharmaTrace dont les droits sont établis sont sous [Apache-2.0](LICENSE), avec les crédits du [NOTICE](NOTICE). Ce document préserve les notices tierces et ne re-licencie pas leurs œuvres. Les photographies, portraits, archives, documents d’organisateurs, marques et autres ressources à droits distincts ou incertains ne sont pas inclus par défaut dans cette concession ; voir le [périmètre](docs/licensing.md) et l’[inventaire](docs/assets-rights.md). Le manifeste des 46 chemins reste suivi et non appliqué jusqu’à une autorisation distincte.

## Dépendances applicatives

React / React Native, Expo / Expo Router / @expo/vector-icons, NativeWind / Tailwind, Supabase JS, react-native-svg, qrcode et dépendances transitives conservent leurs licences de packages. Les lockfiles sont conservés. Les licences livrées avec `node_modules` doivent accompagner une redistribution binaire selon leurs conditions ; elles ne sont pas remplacées par celle du projet.

`@expo/vector-icons` et son moteur vendorié : MIT, copyright 2015 Joel Arvidsson ; copyright 2020 650 Industries. Les polices Font Awesome Free utilisées gardent leurs conditions propres : Font Awesome 4 par Dave Gandy (SIL OFL 1.1 pour police, MIT pour code), Font Awesome 6 Free (SIL OFL 1.1 pour polices, CC BY 4.0 pour icônes, MIT pour code). Voir les [licences Font Awesome](https://fontawesome.com/license/free), les notices complètes dans [docs/licenses](docs/licenses/README.md) et les packages installés. Aucun nom de l’équipe n’est substitué à ces auteurs.

## Archive Figma

L’export ZIP historique contient un `ATTRIBUTIONS.md` mentionnant shadcn/ui (MIT, copyright 2023 shadcn) et Unsplash. Le texte MIT est conservé dans [shadcn-MIT.txt](docs/licenses/shadcn-MIT.txt). Cette mention ne prouve pas la provenance exacte de chaque image embarquée. Aucun module shadcn/ui n’est importé par l’application Expo active.

[Unsplash](https://unsplash.com/license) accorde sa propre licence, distincte de MIT/Apache. Attribution appréciée, pas systématiquement exigée par cette licence ; les droits des personnes, marques ou objets représentés peuvent rester nécessaires. Les photographes/sources exactes ne sont pas identifiés dans cet export ; ne pas inventer d’attributions. Les exports binaires et rendus incertains sont dans le manifeste de conservation locale proposé avant publication.

## Illustrations, polices et archives

Les nouveaux SVG du sprint sont originaux, rendus en PNG sans image ni police tierce embarquée ; leurs contributions originales sont couvertes par Apache-2.0 et le copyright du NOTICE. La vitrine emploie les polices système, sans téléchargement Google Fonts. Les captures sont issues de l’application locale avec données fictives et simulation affichée ; les composants tiers visibles conservent leurs propres licences.

Portraits : ni licence du photographe ni autorisation distincte d’usage d’image établies ; l’accord des contributions de code n’est pas assimilé à ces droits. Documents d’organisateurs MIABE : aucune permission de redistribution retrouvée. Les anciens fichiers restent intacts localement ; le [plan de publication](docs/release-plan.md) décrit leur retrait ciblé du prochain snapshot, sans effacer l’historique.

[Inventaire fichier par fichier](docs/assets-rights.md) et manifeste complet de provenance : `docs/assets-inventory.json`.

## Décodeur QR web existant

Expo Camera charge jsQR 1.2.0 depuis cdn.jsdelivr.net sur web (Apache-2.0, projet cozmo/jsQR). Ce chargement statique est distinct de la base ; le mode démo ne promet donc pas une caméra entièrement hors ligne. Licence exacte du package conservée dans docs/licenses/jsQR-Apache-2.0.txt. Aucune image réelle de caméra n’a été testée dans ce sprint.

LICENSE, NOTICE et les notices des bibliothèques distribuées sont copiés dans dist/legal après chaque export web. La future version Android devra également accompagner ses binaires des notices ; aucun nouvel APK n’est produit ici.
