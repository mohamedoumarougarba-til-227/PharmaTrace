# Éléments tiers : inventaire et traitement

Inventaire initial de 60 fichiers (235 330 866 octets, doublons compris), empreintes complètes dans [assets-inventory.json](assets-inventory.json). Les deux vidéos non suivies sont incluses dans l’inventaire de préservation, pas ajoutées à Git.

**Consentement équipe DONE**, sans nouvelle autorisation demandée. Le copyright des contributions originales ne règle pas celui d’un photographe, d’une photo embarquée ou des consignes d’organisateurs. Aucun élément n’est déclaré incompatible sans preuve : les fichiers du manifeste à provenance incomplète ont été retirés du suivi local pour préparer le snapshot source, sans suppression physique.

| Groupe | Droits / preuve | Traitement actuel |
| --- | --- | --- |
| Code original, documentation actuelle | Contributions de l’équipe, accord acquis ; Apache-2.0 retenue par le propriétaire le 4 novembre 2026 | Licence appliquée aux contributions originales dont les droits sont établis ; copyright individuel respecté, crédits conservés. |
| Nouveaux SVG/PNG actifs | Géométrie originale du projet, sources SVG disponibles, aucun stock photo | Cinq anciennes images actives sauvegardées puis remplacées ; les originaux restent locaux. |
| Font Awesome / Expo vector-icons | MIT + SIL OFL / CC BY selon support, textes officiels conservés | Notices et copyrights maintenus ; aucune re-licence globale. |
| Export ZIP Figma | ATTRIBUTIONS mentionne shadcn MIT et Unsplash ; sources exactes des images non identifiées | Notice MIT conservée ; export et rendus du manifeste retirés du suivi, sauvegardés localement. Pas d’installation de ses dépendances Vite. |
| Export .make | Conteneur Figma avec images et métadonnées, aucune licence globale identifiée | Retiré du suivi, conservé et sauvegardé localement ; pas une dépendance du MVP. |
| Portraits et doublons | Noms/crédits établis ; photographe et droit d’image distincts non établis | Vitrine active avec initiales ; portraits du manifeste retirés du suivi, intacts et sauvegardés localement. |
| PDFs, consignes, médias et anciens rendus MIABE | Archives datées, pas documentation actuelle ; droits incorporés non contrôlés exhaustivement | Originaux du manifeste conservés et sauvegardés ; retrait du suivi exécuté, pas de suppression de preuves. Les contributions de l’équipe restent attribuées. |
| Google Fonts Inter | Ancien chargement distant, pas de police vendoriée identifiée | Vitrine préparée avec police système ; aucune photo Unsplash active trouvée. |
| Nouvelles captures / aperçu social | Interface réelle locale, données simulées ; SVG social original | Trois captures et aperçu documentés, pas présentés comme test de production. |

## Gate 3B exécuté localement, sans effacement historique

Le [manifeste exact](release/retain-local-manifest.json) contient **46 chemins retirés du suivi local le 5 novembre 2026** : 6 archives/médias de vitrine, 32 ressources historiques et 8 métadonnées CLI personnelles. Les 46 originaux et les 46 sauvegardes ont été relus et vérifiés par SHA-256 avant le retrait, puis contrôlés après ; 29 491 625 octets sauvegardés sous `A exclure de github/PHASE2_OPEN_SOURCE_20261103/retained-local/`, dossier ignoré. Le script retire uniquement l’index Git et ajoute les exclusions ciblées ; il ne supprime aucun fichier ni objet historique. Les deux vidéos déjà non suivies restent hors manifeste d’index et inchangées. **Aucun push ni PR effectué ; gate 3C en attente.**

Contrôle du 4 novembre 2026 : **6 archives/médias de vitrine, 32 ressources historiques et 8 métadonnées CLI**, tous encore présents et suivis, avec les 46 empreintes conformes. Classification et manifeste conservés sans modification. Le retrait futur porterait sur le prochain arbre source : les archives et métadonnées personnelles n’y seraient plus redistribuées, mais les originaux locaux, leurs justifications et les anciennes copies Git resteraient disponibles. Il ne retire ni migration, ni donnée de la DB MVP. Les deux vidéos restent non suivies et leurs tailles/SHA-256 sont inchangés. La sauvegarde et le retrait d’index du script ne sont pas exécutés dans ce lot de licence.

Ce paragraphe du 4 novembre décrit le checkpoint de licence antérieur ; l’état courant est celui du gate 3B ci-dessus. Les chemins, classifications et empreintes du manifeste sont conservés ; seules ses métadonnées d’application sont actualisées.

Ces fichiers restent visibles dans l’historique public existant : aucune prétention d’effacement, aucune réécriture d’histoire. Une réintroduction future nécessite une provenance/permission précise, pas un nouvel accord des membres pour leur code.

## Inventaire initial par fichier

La colonne Traitement et [assets-inventory.json](assets-inventory.json) conservent le relevé initial de préparation ; ils ne sont pas réécrits comme s’ils décrivaient un nouvel audit. Pour le retrait effectivement exécuté, le manifeste et l’état gate 3B ci-dessus font référence. Les vidéos et l’APK déjà non suivis ne sont pas comptés parmi les 46 retraits.

| Chemin | Octets initiaux | Traitement |
| --- | ---: | --- |
| `app/PharmaTrace/assets/images/adaptive-icon.png` | 785429 | original conservé localement, nouveau PNG original |
| `app/PharmaTrace/assets/images/favicon.png` | 48785 | original conservé localement, nouveau PNG original |
| `app/PharmaTrace/assets/images/icon.png` | 785429 | original conservé localement, nouveau PNG original |
| `app/PharmaTrace/assets/images/medicament.png` | 5679683 | original conservé localement, nouveau PNG original |
| `app/PharmaTrace/assets/images/splash-screen.png` | 785429 | original conservé localement, nouveau PNG original |
| `landing/maquettes/fabricant-nouveau-lot.png` | 37624 | conservation locale proposée avant publication |
| `landing/maquettes/patient-scanner-resultat-authentique.png` | 66648 | conservation locale proposée avant publication |
| `landing/maquettes/pharmacie-reception.png` | 56154 | conservation locale proposée avant publication |
| `landing/medias/Abdoul Raouf HAROUNA MOUSSA.jpeg` | 34540 | conservation locale proposée avant publication |
| `landing/medias/Mahamadou GARBA ZAKOU.jpeg` | 145384 | conservation locale proposée avant publication |
| `landing/medias/Mohamed OUMAROU GARBA.jpg` | 666115 | conservation locale proposée avant publication |
| `ressources/builds/PharmaTrace_v1.0.0.apk` | 113884504 | conservation locale proposée avant publication |
| `ressources/docs/scripts_videos.md` | 8716 | conserver avec contexte historique |
| `ressources/maquettesFigma/figma.txt` | 91 | conserver avec contexte historique |
| `ressources/maquettesFigma/PharmatraceTrustGrid.make` | 307222 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/PharmatraceTrustGrid.zip` | 264291 | conservation locale proposée avant publication |
| `ressources/medias/Abdoul Raouf HAROUNA MOUSSA.jpeg` | 34540 | conservation locale proposée avant publication |
| `ressources/medias/Mahamadou GARBA ZAKOU.jpeg` | 145384 | conservation locale proposée avant publication |
| `ressources/medias/Mohamed OUMAROU GARBA.jpg` | 666115 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/fabricant-compte.png` | 40951 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/fabricant-nouveau-lot.png` | 37624 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/fabricant-qr-genere.png` | 56938 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/fabricant-transfert.png` | 65917 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/patient-scanner-resultat-authentique.png` | 66648 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/patient-scanner-resultat-suspect.png` | 60206 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/pharmacie-compte.png` | 43923 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/pharmacie-reception.png` | 56154 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/pharmacie-stock.png` | 74371 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/pharmacie-transferts.png` | 72257 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/Valider/login-compte.png` | 56592 | conservation locale proposée avant publication |
| `ressources/maquettesFigma/images/Valider/patient-scanner.png` | 40354 | conservation locale proposée avant publication |
| `ressources/docs/PHASE_1_PRESELECTION/Etude Problematique Medicaments Contrefaits Niger PharmaTrace.pdf` | 48343 | conservation locale proposée avant publication |
| `ressources/docs/PHASE_1_PRESELECTION/lien_maquettes_figma.txt` | 1439 | conserver avec contexte historique |
| `ressources/docs/PHASE_1_PRESELECTION/lien_site_vitrine.txt` | 36 | conserver avec contexte historique |
| `ressources/docs/PHASE_1_PRESELECTION/manquant.md` | 717 | conserver avec contexte historique |
| `ressources/docs/PHASE_1_PRESELECTION/Plan Traçabilite Architecture Blockchain PharmaTrace.pdf` | 160825 | conservation locale proposée avant publication |
| `ressources/docs/PHASE_1_PRESELECTION/video_site_vitrine.mp4` | 17437827 | conservation locale proposée avant publication |
| `ressources/docs/PHASE_2_DEMIFINAL/demo_prototype_phase 2.mp4` | 44245834 | conservation locale proposée avant publication |
| `ressources/docs/PHASE_2_DEMIFINAL/lien_code.txt` | 96 | conserver avec contexte historique |
| `ressources/docs/PHASE_2_DEMIFINAL/lien_demo.txt` | 166 | conserver avec contexte historique |
| `ressources/docs/PHASE_2_DEMIFINAL/lien_prototype.txt` | 671 | conserver avec contexte historique |
| `ressources/docs/PHASE_2_DEMIFINAL/manquant.md` | 882 | conserver avec contexte historique |
| `ressources/docs/PHASE_2_DEMIFINAL/notes_demonstration.pdf` | 356978 | conservation locale proposée avant publication |
| `ressources/docs/PHASE_2_DEMIFINAL/README.md` | 1308 | conserver avec contexte historique |
| `ressources/docs/PHASE_3_FINALE/demo_Pitch_MVP_Phase 3.mp4` | 39607226 | conservation locale proposée avant publication |
| `ressources/docs/PHASE_3_FINALE/documentation_technique.pdf` | 406560 | conservation locale proposée avant publication |
| `ressources/docs/PHASE_3_FINALE/guide_utilisateur.pdf` | 203346 | conservation locale proposée avant publication |
| `ressources/docs/PHASE_3_FINALE/lien_mvp.txt` | 798 | conserver avec contexte historique |
| `ressources/docs/PHASE_3_FINALE/lien_pitch.txt` | 146 | conserver avec contexte historique |
| `ressources/docs/PHASE_3_FINALE/manquant.md` | 970 | conserver avec contexte historique |
| `ressources/docs/PHASE_3_FINALE/README.md` | 1073 | conserver avec contexte historique |
| `ressources/docs/Projet attribué/CONSIGNES LIVRABLES ET PRESENTATION MBH2026.pdf` | 278530 | conservation locale proposée avant publication |
| `ressources/docs/Projet attribué/CONSIGNES LIVRABLES ET PRESENTATION MBH2026_page-0001.jpg` | 841061 | conservation locale proposée avant publication |
| `ressources/docs/Projet attribué/CONSIGNES LIVRABLES ET PRESENTATION MBH2026_page-0002.jpg` | 621839 | conservation locale proposée avant publication |
| `ressources/docs/Projet attribué/CONSIGNES LIVRABLES ET PRESENTATION MBH2026_page-0003.jpg` | 783390 | conservation locale proposée avant publication |
| `ressources/docs/Projet attribué/PROGRAMME-DU-MIABE-HACKATHON-2026.pdf` | 4859032 | conservation locale proposée avant publication |
| `ressources/docs/Projet attribué/PROJET_N1_NIGER.md` | 4357 | conservation locale proposée avant publication |
| `ressources/docs/Projet attribué/PROJET_N1_NIGER.pdf` | 243091 | conservation locale proposée avant publication |
| `ressources/docs/Projet attribué/PROJET_N1_NIGER_Page_1.png` | 95894 | conservation locale proposée avant publication |
| `ressources/docs/Projet attribué/PROJET_N1_NIGER_Page_2.png` | 54413 | conservation locale proposée avant publication |
