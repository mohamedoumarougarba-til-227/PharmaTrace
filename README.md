# 💊 PharmaTrace — Traçabilité des médicaments au Niger

**Équipe TrustGrid · MIABE Hackathon 2026 · Code N-01 MBH / D03**

> *"Un médicament enregistré ne peut pas être falsifié. Un médicament scanné ne peut pas mentir."*

---

## 🎯 Le problème

30 à 60 % des médicaments en Afrique subsaharienne sont contrefaits (OMS).  
Au Niger : moins de 10 % sont traçables, 500 000 décès/an, 2 tonnes saisies par la DPN en 2022.

## ✅ La solution

Système de traçabilité par **QR code + hash SHA-256 immuable**.  
Scan en 3 secondes → verdict **AUTHENTIQUE ✅** ou **SUSPECT ❌**.

---

## 📁 Structure du projet

```
PharmaTrace/
├── app/PharmaTrace/          ← Application mobile Expo (React Native SDK 54)
│   ├── app/                  ← Écrans (expo-router v6)
│   │   ├── (public)/verify   ← Scan QR patient (sans login)
│   │   ├── (auth)/login      ← Connexion
│   │   ├── (fabricant)/      ← Dashboard fabricant
│   │   ├── (pharmacie)/      ← Dashboard pharmacie
│   │   └── (agent-dph)/      ← Dashboard Agent DPH
│   ├── lib/supabase.ts       ← Client Supabase + types
│   └── .env.example          ← Variables à configurer
├── landing/                  ← Landing page HTML (déployée sur Vercel)
└── ressources/               ← Docs, maquettes Figma, médias
```

---

## 👥 4 utilisateurs

| Utilisateur | Accès | Rôle |
|---|---|---|
| **Fabricant** | Login | Créer lots, générer QR, initier transferts |
| **Pharmacie** | Login | Réceptionner lots, gérer stock, vérifier |
| **Agent DPH** | Login | Surveillance nationale, alertes, stats |
| **Patient** | Public | Scan QR → verdict immédiat |

---

## 🛠️ Stack technique

| Couche | Technologie |
|---|---|
| App mobile + web | Expo SDK 54 · React Native 0.81 · React 19 |
| Navigation | Expo Router v6 |
| UI / Styles | NativeWind v4 (TailwindCSS) |
| Backend / BDD | Supabase (PostgreSQL + Auth + RLS) |
| Sécurité | Hash SHA-256 immuable par lot |
| Landing page | HTML/CSS/JS vanilla → Vercel |

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- Expo Go (SDK 54) sur Android/iOS

### 1. Cloner le repo
```bash
git clone https://github.com/mohamedoumarougarba-til-227/PharmaTrace.git
cd PharmaTrace
```

### 2. Configurer l'environnement
```bash
cd app/PharmaTrace
cp .env.example .env
# Éditez .env avec vos clés Supabase
```

### 3. Installer les dépendances
```bash
npm install
```

### 4. Lancer l'app
```bash
npx expo start --clear
```
- Appuyez sur **`w`** → version web
- Scannez le QR avec **Expo Go** → Android/iOS

---

## 🗄️ Base de données

Schéma SQL complet dans `app/PharmaTrace/supabase/migrations/`.

Tables : `utilisateurs` · `lots_medicaments` · `transferts` · `historique_scans` · `alertes`

---

## 👤 Équipe TrustGrid

| Nom | Rôle |
|---|---|
| **Mohamed Oumarou Garba** | Chef d'équipe · Product Owner · UI/UX |
| **Mahamadou Garba Zakou** | Lead Backend · Supabase · SHA-256 |
| **Abdoul Raouf Harouna Moussa** | Lead Frontend · React Native · QR Scanner |

---

## 📋 ODD visés

**ODD 3** — Bonne santé et bien-être  
**ODD 16** — Institutions efficaces, responsables et transparentes

---

*© 2026 Équipe TrustGrid — Niger. MIABE Hackathon.*
