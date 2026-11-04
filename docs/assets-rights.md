# Éléments tiers : inventaire et traitement

Inventaire initial de 60 fichiers (235 330 866 octets, doublons compris), empreintes complètes dans [assets-inventory.json](assets-inventory.json). Les deux vidéos non suivies sont incluses dans l’inventaire de préservation, pas ajoutées à Git.

**Consentement équipe DONE**, sans nouvelle autorisation demandée. Le copyright des contributions originales ne règle pas celui d’un photographe, d’une photo embarquée ou des consignes d’organisateurs. Aucun élément n’est déclaré incompatible sans preuve : la provenance incomplète conduit à proposer un snapshot source sans ces binaires non nécessaires au build.

| Groupe | Droits / preuve | Traitement préparé |
| --- | --- | --- |
| Code original, documentation actuelle | Contributions de l’équipe, accord acquis ; licence exacte en décision | Apache-2.0 proposée, crédits conservés. |
| Nouveaux SVG/PNG actifs | Géométrie originale du projet, sources SVG disponibles, aucun stock photo | Cinq anciennes images actives sauvegardées puis remplacées ; les originaux restent locaux. |
| Font Awesome / Expo vector-icons | MIT + SIL OFL / CC BY selon support, textes officiels conservés | Notices et copyrights maintenus ; aucune re-licence globale. |
| Export ZIP Figma | ATTRIBUTIONS mentionne shadcn MIT et Unsplash ; sources exactes des images non identifiées | Notice MIT conservée ; export et rendus proposés en conservation locale. Pas d’installation de ses dépendances Vite. |
| Export .make | Conteneur Figma avec images et métadonnées, aucune licence globale identifiée | Conservation locale proposée ; pas une dépendance du MVP. |
| Portraits et doublons | Noms/crédits établis ; photographe et droit d’image distincts non établis | Vitrine active passe à des initiales ; fichiers intacts, conservation locale proposée. |
| PDFs, consignes, médias et anciens rendus MIABE | Archives datées, pas documentation actuelle ; droits incorporés non contrôlés exhaustivement | Originaux conservés ; exclusion du prochain snapshot proposée, pas suppression de preuves. Les contributions de l’équipe restent attribuées. |
| Google Fonts Inter | Ancien chargement distant, pas de police vendoriée identifiée | Vitrine préparée avec police système ; aucune photo Unsplash active trouvée. |
| Nouvelles captures / aperçu social | Interface réelle locale, données simulées ; SVG social original | Trois captures et aperçu documentés, pas présentés comme test de production. |

## Snapshot proposé, sans effacement historique

Le [manifeste exact](release/retain-local-manifest.json) contient 46 chemins suivis : archives/médias anciens et huit métadonnées CLI personnelles. **Retrait du suivi non exécuté**, soumis au feu vert final de publication. Le script de préparation vérifie chaque empreinte, sauvegarde localement puis retire uniquement l’index Git ; il ne supprime aucun fichier ni objet historique. Les deux vidéos déjà non suivies restent hors manifeste d’index et inchangées.

Ces fichiers restent visibles dans l’historique public existant : aucune prétention d’effacement, aucune réécriture d’histoire. Une réintroduction future nécessite une provenance/permission précise, pas un nouvel accord des membres pour leur code.

## Inventaire initial par fichier

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
