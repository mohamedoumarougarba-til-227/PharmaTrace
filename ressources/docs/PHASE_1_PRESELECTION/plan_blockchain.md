# Note Technique : Plan de Traçabilité et Architecture Cryptographique (Blockchain-Lite)

**MIABE Hackathon 2026 | Code Projet : N-01 MBH (D03 - Santé numérique & Chaîne médicale)**  
**Équipe : TrustGrid (Niger)**

---

## 1. Pourquoi une base de données classique ne suffit pas ?

Dans un système de traçabilité classique reposant sur une base de données relationnelle standard, un administrateur système ou un pirate ayant obtenu des privilèges élevés peut modifier (`UPDATE`) ou supprimer (`DELETE`) des enregistrements. 

Face au trafic de faux médicaments, cela présente des failles majeures :
1. **Risque de corruption interne** : Un acteur malveillant au sein d'une entreprise ou d'une administration pourrait falsifier le statut d'un lot, altérer les dates de péremption ou insérer rétroactivement des faux lots dans le registre pour les légitimer.
2. **Absence d'auditabilité stricte** : Si les données peuvent être modifiées sans laisser de trace indélébile, il est impossible pour les autorités de santé (DPH) de prouver juridiquement l'origine d'une fraude.
3. **Piratage informatique** : Si la base est compromise, l'intégrité de toute la chaîne de confiance s'effondre.

Pour résoudre ce problème, PharmaTrace met en place un principe de **registre immuable (Blockchain-Lite)**, garantissant qu'une fois une information écrite, elle ne peut plus jamais être modifiée ni supprimée.

---

## 2. Le concept de "Blockchain-Lite" sur PharmaTrace

Afin de concilier la vitesse de vérification (scan en moins de 3 secondes, indispensable sur le terrain) et la sécurité d'un registre décentralisé sans les coûts élevés de gaz et la lenteur des blockchains publiques (comme Ethereum ou Polygon), PharmaTrace implémente une architecture **Blockchain-Lite** :

### A. Génération de l'empreinte unique (Hash SHA-256)
Chaque lot de médicaments créé par un fabricant agréé génère une empreinte numérique unique en combinant ses métadonnées clés :
$$\text{Données du Lot} = \text{Numéro de Lot} + \text{Nom du Médicament} + \text{Date de Fabrication} + \text{Date d'Expiration} + \text{ID Fabricant} + \text{Timestamp}$$

Cette chaîne textuelle est passée dans l'algorithme cryptographique **SHA-256** pour produire un hash unique de 64 caractères (ex: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).

```
[ Métadonnées du Lot ] ──> ( Algorithme SHA-256 ) ──> [ Hash Cryptographique Unique ]
                                                              │
                                                              ▼
                                                     [ Encodé dans le QR Code ]
```

### B. Scellement et Immuabilité par Triggers PostgreSQL
La table `lots_medicaments` est verrouillée au niveau du moteur de base de données PostgreSQL de Supabase. Deux mécanismes de protection y sont appliqués :
1. **Interdiction des modifications (`UPDATE`)** : Tout essai de modification du hash, du numéro de lot ou du fabricant d'origine après l'insertion initiale lève immédiatement une exception SQL et rejette la transaction.
2. **Interdiction des suppressions (`DELETE`)** : Aucun lot ne peut être supprimé de la base de données. Si un lot doit être retiré du marché, son statut passe à `archive` avec un motif explicite, mais l'historique initial reste gravé de manière permanente pour audit.

---

## 3. Fonctionnement de la Vérification par Scan

Le processus de vérification s'effectue en 4 étapes simples et transparentes pour l'utilisateur :

```
┌────────────────┐      Scanne      ┌─────────────────────┐      Extrait      ┌─────────────────┐
│ Patient/Pharm. ├─────────────────>│ Camera (App Mobile) ├──────────────────>│ Hash SHA-256    │
└────────────────┘                  └─────────────────────┘                   └────────┬────────┘
                                                                                       │
                                                                                       │ Requête API
                                                                                       ▼
┌────────────────┐      Verdict     ┌─────────────────────┐                  ┌─────────────────┐
│ Écran Vert/Rouge│<─────────────────┤ Algorithme de Vérif.│<─────────────────┤ Base Supabase   │
└────────────────┘                  └─────────────────────┘                   └─────────────────┘
```

1. **Génération du QR Code** : À la création du lot, le système génère un QR code contenant une URL publique pointant vers la page de vérification avec le paramètre du hash :
   `https://pharmatrace-eta.vercel.app/verify?hash=[SHA-256]`
2. **Capture du QR Code** : L'utilisateur (patient ou pharmacien) scanne le QR code via l'application mobile PharmaTrace ou directement depuis l'appareil photo de son smartphone.
3. **Extraction & Requête** : L'application extrait le hash SHA-256 contenu dans l'URL et interroge de manière sécurisée le registre central de PharmaTrace.
4. **Retour du verdict instantané** :
   * **AUTHENTIQUE (Vert) ✅** : Si le hash existe dans le registre, que le lot est actif, provient d'un fabricant agréé et n'a pas dépassé sa date d'expiration.
   * **EXPIRÉ (Orange) ⚠️** : Si le hash existe mais que la date d'expiration du lot est dépassée.
   * **SUSPECT / NON TROUVÉ (Rouge) ❌** : Si le QR code ou le hash ne figure pas dans le registre. Une alerte critique est alors immédiatement et automatiquement injectée en base de données pour notifier les autorités sanitaires (DPH) de la présence potentielle d'un produit contrefait à cet endroit.
