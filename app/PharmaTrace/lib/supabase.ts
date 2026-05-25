/**
 * Client Supabase — initialisation paresseuse (lazy)
 * Le client n'est créé qu'au premier appel, pas au chargement du module.
 * Cela évite l'erreur "supabaseUrl is required" au rendu SSR web d'Expo Router.
 */
import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // En mode développement sans .env, on retourne un client factice
    // qui ne crashera pas l'app mais ne fera pas d'appels réels.
    console.warn(
      "[PharmaTrace] Variables Supabase manquantes.\n" +
        "Créez un fichier .env avec EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY",
    );
    // On utilise des valeurs placeholder pour ne pas crasher
    _client = createClient(
      "https://placeholder.supabase.co",
      "placeholder-key",
      { auth: { storage: AsyncStorage, persistSession: false } },
    );
    return _client;
  }

  _client = createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return _client;
}

// Export raccourci — compatible avec le code existant
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "fabricant" | "pharmacie" | "agent_dph";
export type StatutLot =
  | "en_stock_fabricant"
  | "en_transit"
  | "en_pharmacie"
  | "archive";
export type ResultatScan = "authentique" | "suspect" | "non_trouve" | "expire";
export type StatutTransfert =
  | "en_attente"
  | "receptionne"
  | "refuse"
  | "archive";
export type NiveauAlerte = "info" | "avertissement" | "critique";
export type StatutAlerte =
  | "ouverte"
  | "en_cours_traitement"
  | "resolue"
  | "archive";

export interface Utilisateur {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  nom_entite: string;
  role: UserRole;
  telephone?: string;
  adresse?: string;
  ville?: string;
  pays: string;
  numero_agrement?: string;
  statut: "actif" | "archive";
  created_at: string;
}

export interface LotMedicament {
  id: string;
  numero_lot: string;
  nom_medicament: string;
  denomination_commune?: string;
  forme_galenique?: string;
  dosage?: string;
  quantite_initiale: number;
  quantite_actuelle?: number;
  date_fabrication: string;
  date_expiration: string;
  fabricant_id: string;
  numero_amm?: string;
  pays_origine?: string;
  hash_sha256: string;
  qr_code_url?: string;
  statut_actuel: StatutLot;
  is_archived: boolean;
  archived_at?: string;
  archived_reason?: string;
  created_at: string;
}

export interface Transfert {
  id: string;
  lot_id: string;
  expediteur_id: string;
  destinataire_id: string;
  quantite_transferee: number;
  date_initiation: string;
  date_reception?: string;
  statut: StatutTransfert;
  notes_expediteur?: string;
  notes_destinataire?: string;
  is_archived: boolean;
  created_at: string;
}

export interface HistoriqueScan {
  id: string;
  hash_scanne: string;
  lot_id?: string;
  type_scanneur: "patient" | "pharmacien" | "agent_dph" | "fabricant";
  scanneur_id?: string;
  resultat: ResultatScan;
  localisation_ville?: string;
  pays_scan: string;
  appareil?: string;
  created_at: string;
}

export interface Alerte {
  id: string;
  lot_id?: string;
  scan_id?: string;
  type_alerte: string;
  description: string;
  niveau: NiveauAlerte;
  statut: StatutAlerte;
  ville_concernee?: string;
  created_by?: string;
  resolved_by?: string;
  created_at: string;
  resolved_at?: string;
  is_archived: boolean;
}
