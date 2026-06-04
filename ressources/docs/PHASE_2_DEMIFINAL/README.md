# Phase 2 — Demi-finale : PharmaTrace MVP & Preuve de Concept

Ce dossier est réservé aux livrables de la **Phase 2 (Demi-finale)** du MIABE Hackathon 2026.

## Objectifs & Livrables de la Phase 2 :
1. **Interface Fabricant** : Enregistrement réel de lots sur la base de données décentralisée (Supabase) et initialisation des transferts vers les pharmacies.
2. **Interface de Vérification Patient** : Scan ou saisie manuelle d'identifiant unique avec retour de verdict instantané (Authentique, Suspect, Non trouvé ou Expiré).
3. **Application Mobile/Tablette pour les Pharmacies** :
   - Réception et confirmation des lots par scan QR.
   - Gestion de stock local en temps réel.
   - Vérification interne des médicaments avant délivrance.
4. **Démo Live de bout en bout** :
   - Étape 1 : Un fabricant enregistre un nouveau lot (génération du hash SHA-256 et du QR code).
   - Étape 2 : Le fabricant transfère le lot à une pharmacie.
   - Étape 3 : La pharmacie scanne le QR code pour valider la réception du lot dans son stock.
   - Étape 4 : Le patient ou le pharmacien scanne le médicament et obtient un verdict d'authenticité.
   - Étape 5 (Simulation de fraude) : Tentative de scan d'un faux lot non enregistré → Rejet automatique et alerte critique envoyée à la DPH.
