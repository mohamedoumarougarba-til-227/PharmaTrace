/**
 * Client Supabase — initialisation paresseuse (lazy) et support du mode démo local
 */
import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VERIFICATION_BASE_URL } from "../constants/config";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      "[PharmaTrace] Variables Supabase manquantes.\n" +
        "Créez un fichier .env avec EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY",
    );
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

// ─── Structures de données simulées pour le mode Démo (Jury) ───────────────────

export let MOCK_LOTS: any[] = [
  {
    id: 'mock-lot-1',
    numero_lot: 'FAB-2026-049',
    nom_medicament: 'Amoxicilline 500mg',
    denomination_commune: 'Amoxicilline trihydrate',
    forme_galenique: 'Comprimé',
    dosage: '500mg',
    quantite_initiale: 2000,
    quantite_actuelle: 2000,
    date_fabrication: '2026-01-15',
    date_expiration: '2028-01-15',
    fabricant_id: 'mock-user-id-fabricant',
    fabricant_nom: 'Laboratoire Niger Pharma',
    numero_amm: 'AMM-NIG-2024-001',
    pays_origine: 'Niger',
    hash_sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    qr_code_url: `${VERIFICATION_BASE_URL}?hash=5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8`,
    statut_actuel: 'en_stock_fabricant',
    is_archived: false,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z'
  },
  {
    id: 'mock-lot-2',
    numero_lot: 'PAR-2026-018',
    nom_medicament: 'Paracétamol Sirop',
    denomination_commune: 'Paracétamol',
    forme_galenique: 'Sirop',
    dosage: '250mg/5ml',
    quantite_initiale: 1500,
    quantite_actuelle: 1200,
    date_fabrication: '2026-02-03',
    date_expiration: '2028-02-03',
    fabricant_id: 'mock-user-id-fabricant',
    fabricant_nom: 'Laboratoire Niger Pharma',
    numero_amm: 'AMM-NIG-2025-014',
    pays_origine: 'Niger',
    hash_sha256: '8fb7638da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    qr_code_url: `${VERIFICATION_BASE_URL}?hash=8fb7638da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8`,
    statut_actuel: 'en_pharmacie',
    is_archived: false,
    created_at: '2026-05-21T11:00:00Z',
    updated_at: '2026-05-21T11:00:00Z'
  },
  {
    id: 'mock-lot-3',
    numero_lot: 'CEF-2026-112',
    nom_medicament: 'Ceftriaxone 1g',
    denomination_commune: 'Ceftriaxone',
    forme_galenique: 'Injectable',
    dosage: '1g',
    quantite_initiale: 800,
    quantite_actuelle: 0,
    date_fabrication: '2025-12-20',
    date_expiration: '2027-12-20',
    fabricant_id: 'mock-user-id-fabricant',
    fabricant_nom: 'Laboratoire Niger Pharma',
    numero_amm: 'AMM-NIG-2023-087',
    pays_origine: 'Niger',
    hash_sha256: 'ca24Md86KG6g3e3m38m23d1356534d21215',
    qr_code_url: `${VERIFICATION_BASE_URL}?hash=ca24Md86KG6g3e3m38m23d1356534d21215`,
    statut_actuel: 'en_transit',
    is_archived: false,
    created_at: '2026-05-22T12:00:00Z',
    updated_at: '2026-05-22T12:00:00Z'
  }
];

export let MOCK_TRANSFERTS: any[] = [
  {
    id: "mock-transfert-1",
    lot_id: {
      id: "mock-lot-3",
      numero_lot: "CEF-2026-112",
      nom_medicament: "Ceftriaxone 1g",
      dosage: "1g",
      date_expiration: "2027-12-20"
    },
    expediteur_id: {
      nom_entite: "Laboratoire Niger Pharma"
    },
    destinataire_id: "mock-user-id-pharmacie",
    quantite_transferee: 500,
    date_initiation: "2026-06-01T08:00:00Z",
    statut: "en_attente",
    is_archived: false
  },
  {
    id: "mock-transfert-2",
    lot_id: {
      id: "mock-lot-2",
      numero_lot: "PAR-2026-018",
      nom_medicament: "Paracétamol Sirop",
      dosage: "250mg/5ml",
      date_expiration: "2028-02-03"
    },
    expediteur_id: {
      nom_entite: "Laboratoire Niger Pharma"
    },
    destinataire_id: "mock-user-id-pharmacie",
    quantite_transferee: 1000,
    date_initiation: "2026-05-28T09:00:00Z",
    date_reception: "2026-05-29T10:00:00Z",
    statut: "receptionne",
    is_archived: false
  }
];

export let MOCK_ALERTES: any[] = [
  {
    id: "mock-alerte-1",
    type_alerte: "Tentative de Scan Suspect",
    description: "Code QR inconnu ou modifié scanné à 3 reprises à Niamey.",
    niveau: "critique",
    statut: "ouverte",
    ville_concernee: "Niamey",
    created_at: "2026-06-03T14:30:00Z",
    lot_id: null,
    is_archived: false
  },
  {
    id: "mock-alerte-2",
    type_alerte: "Lot Expiré en Stock",
    description: "Lot AM-2024-001 (Amoxicilline) expiré depuis le 01/06/2026 à Maradi.",
    niveau: "avertissement",
    statut: "en_cours_traitement",
    ville_concernee: "Maradi",
    created_at: "2026-06-02T10:15:00Z",
    lot_id: "mock-lot-1",
    is_archived: false
  }
];

export let MOCK_USERS: any[] = [
  {
    id: "mock-user-id-fabricant",
    nom_entite: "Laboratoire Niger Pharma",
    role: "fabricant",
    ville: "Niamey",
    pays: "Niger",
    numero_agrement: "AGR-FAB-2022-005",
    telephone: "+227 20 73 45 67",
    adresse: "Zone Industrielle, Niamey",
    statut: "actif"
  },
  {
    id: "mock-user-id-pharmacie",
    nom_entite: "Pharmacie Centrale de Niamey",
    role: "pharmacie",
    ville: "Niamey",
    pays: "Niger",
    numero_agrement: "AGR-PHA-2023-018",
    telephone: "+227 20 72 34 56",
    adresse: "Avenue du Fleuve, Niamey",
    statut: "actif"
  },
  {
    id: "mock-user-id-agent_dph",
    nom_entite: "Direction de la Pharmacie et du Médicament (DPH/L)",
    role: "agent_dph",
    ville: "Niamey",
    pays: "Niger",
    numero_agrement: "DPH-GOV-NIG",
    telephone: "+227 20 73 35 12",
    adresse: "Ministère de la Santé Publique, Niamey",
    statut: "actif"
  }
];

export let MOCK_SCANS: any[] = [
  {
    id: "mock-scan-1",
    hash_scanne: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    lot_id: "mock-lot-1",
    type_scanneur: "pharmacien",
    scanneur_id: "mock-user-id-pharmacie",
    resultat: "authentique",
    localisation_ville: "Niamey",
    pays_scan: "Niger",
    created_at: new Date().toISOString()
  },
  {
    id: "mock-scan-2",
    hash_scanne: "8fb7638da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    lot_id: "mock-lot-2",
    type_scanneur: "patient",
    scanneur_id: null,
    resultat: "authentique",
    localisation_ville: "Maradi",
    pays_scan: "Niger",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  }
];

export function addMockScan(values: any) {
  const newScan = {
    id: `mock-scan-${Date.now()}`,
    created_at: new Date().toISOString(),
    ...values,
  };
  MOCK_SCANS.unshift(newScan);
}

function addMockLot(values: any) {
  const newLot = {
    id: `mock-lot-${Date.now()}`,
    fabricant_nom: "Laboratoire Niger Pharma",
    ...values,
    nom_medicament: values.nom_medicament || values.nom_commercial || "Médicament",
    quantite_initiale: values.quantite_initiale || Number(values.quantite) || 0,
    quantite_actuelle: values.quantite_actuelle || Number(values.quantite) || 0,
  };
  MOCK_LOTS.unshift(newLot);
}

function addMockTransfert(values: any) {
  const lot = MOCK_LOTS.find(l => l.id === values.lot_id) || {
    id: values.lot_id,
    numero_lot: "LOT-INCONNU",
    nom_medicament: "Médicament",
    dosage: "—",
    date_expiration: "—"
  };
  const newTransfert = {
    id: `mock-transfert-${Date.now()}`,
    ...values,
    lot_id: {
      id: lot.id,
      numero_lot: lot.numero_lot,
      nom_medicament: lot.nom_medicament,
      dosage: lot.dosage,
      date_expiration: lot.date_expiration
    },
    expediteur_id: {
      nom_entite: "Laboratoire Niger Pharma"
    }
  };
  
  const lotToUpdate = MOCK_LOTS.find(l => l.id === values.lot_id);
  if (lotToUpdate) {
    lotToUpdate.statut_actuel = 'en_transit';
  }
  
  MOCK_TRANSFERTS.unshift(newTransfert);
}

function updateMockTransfert(id: string, values: any) {
  const t = MOCK_TRANSFERTS.find(item => item.id === id);
  if (t) {
    Object.assign(t, values);
  }
}

function updateMockLot(id: string, values: any) {
  const l = MOCK_LOTS.find(item => item.id === id);
  if (l) {
    Object.assign(l, values);
  }
}

function getMockDataForTable(tableName: string, calls: any[]) {
  let data: any[] = [];
  if (tableName === 'lots_medicaments' || tableName === 'lots_avec_fabricant') {
    data = [...MOCK_LOTS];
  } else if (tableName === 'transferts' || tableName === 'transferts_avec_details') {
    data = [...MOCK_TRANSFERTS];
  } else if (tableName === 'alertes') {
    data = [...MOCK_ALERTES];
  } else if (tableName === 'utilisateurs') {
    data = [...MOCK_USERS];
  } else if (tableName === 'historique_scans') {
    data = [...MOCK_SCANS];
  } else if (tableName === 'stats_dashboard') {
    const criticalAlerts = MOCK_ALERTES.filter(a => a.niveau === 'critique' && a.statut === 'ouverte').length;
    const suspectScans = MOCK_SCANS.filter(s => s.resultat === 'non_trouve').length;
    data = [{
      total_lots: MOCK_LOTS.length,
      pharmacies_actives: MOCK_USERS.filter(u => u.role === 'pharmacie').length,
      scans_24h: MOCK_SCANS.filter(s => new Date(s.created_at) > new Date(Date.now() - 24 * 3600 * 1000)).length,
      alertes_critiques: criticalAlerts,
      total_suspects: suspectScans || 1,
    }];
  }

  for (const call of calls) {
    if (call.method === 'eq') {
      const [col, val] = call.args;
      data = data.filter((item: any) => {
        if (col === 'destinataire_id') {
          return item.destinataire_id === val || (Array.isArray(val) && val.includes(item.destinataire_id));
        }
        if (col === 'fabricant_id') {
          return item.fabricant_id === val || (Array.isArray(val) && val.includes(item.fabricant_id));
        }
        if (col === 'statut_actuel') {
          return item.statut_actuel === val;
        }
        if (col === 'statut') {
          return item.statut === val;
        }
        if (col === 'id') {
          return item.id === val;
        }
        if (col === 'scanneur_id') {
          return item.scanneur_id === val;
        }
        if (col === 'ville_concernee') {
          return !val || item.ville_concernee === val;
        }
        return true;
      });
    } else if (call.method === 'gte') {
      const [col, val] = call.args;
      data = data.filter((item: any) => {
        if (item[col] === undefined) return true;
        return item[col] >= val;
      });
    } else if (call.method === 'gt') {
      const [col, val] = call.args;
      data = data.filter((item: any) => {
        if (item[col] === undefined) return true;
        return item[col] > val;
      });
    } else if (call.method === 'ilike') {
      const [col, val] = call.args;
      const cleanVal = String(val).replace(/%/g, '').toLowerCase();
      data = data.filter((item: any) => {
        if (!item[col]) return false;
        return String(item[col]).toLowerCase().includes(cleanVal);
      });
    } else if (call.method === 'in') {
      const [col, valList] = call.args;
      data = data.filter((item: any) => {
        if (!item[col]) return false;
        return Array.isArray(valList) && valList.includes(item[col]);
      });
    }
  }
  return data;
}

// ─── Query Builder Mock ──────────────────────────────────────────────────────

class MockQueryBuilder {
  private tableName: string;
  private calls: Array<{ method: string; args: any[] }> = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(...args: any[]) { this.calls.push({ method: 'select', args }); return this; }
  eq(...args: any[]) { this.calls.push({ method: 'eq', args }); return this; }
  gte(...args: any[]) { this.calls.push({ method: 'gte', args }); return this; }
  gt(...args: any[]) { this.calls.push({ method: 'gt', args }); return this; }
  order(...args: any[]) { this.calls.push({ method: 'order', args }); return this; }
  limit(...args: any[]) { this.calls.push({ method: 'limit', args }); return this; }
  or(...args: any[]) { this.calls.push({ method: 'or', args }); return this; }
  single(...args: any[]) { this.calls.push({ method: 'single', args }); return this; }
  maybeSingle(...args: any[]) { this.calls.push({ method: 'maybeSingle', args }); return this; }
  ilike(...args: any[]) { this.calls.push({ method: 'ilike', args }); return this; }
  in(...args: any[]) { this.calls.push({ method: 'in', args }); return this; }
  
  insert(values: any) {
    this.calls.push({ method: 'insert', args: [values] });
    return this;
  }
  update(values: any) {
    this.calls.push({ method: 'update', args: [values] });
    return this;
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    const isDemo = await AsyncStorage.getItem('pt_demo_mode') === 'true';
    if (isDemo) {
      // Exécuter l'insertion locale si demandée
      const insertCall = this.calls.find(c => c.method === 'insert');
      if (insertCall) {
        const val = insertCall.args[0];
        if (this.tableName === 'lots_medicaments') {
          addMockLot(val);
        } else if (this.tableName === 'transferts') {
          addMockTransfert(val);
        } else if (this.tableName === 'historique_scans') {
          addMockScan(val);
        }
        return { data: val, error: null };
      }

      // Exécuter la modification locale si demandée
      const updateCall = this.calls.find(c => c.method === 'update');
      if (updateCall) {
        const val = updateCall.args[0];
        const idCall = this.calls.find(c => c.method === 'eq' && c.args[0] === 'id');
        if (idCall) {
          const id = idCall.args[1];
          if (this.tableName === 'transferts') {
            updateMockTransfert(id, val);
          } else if (this.tableName === 'lots_medicaments') {
            updateMockLot(id, val);
          }
        }
        return { data: val, error: null };
      }

      // Lecture des données filtrées
      const data = getMockDataForTable(this.tableName, this.calls);
      const isSingle = this.calls.some(c => c.method === 'single' || c.method === 'maybeSingle');
      return {
        data: isSingle ? (data[0] || null) : data,
        error: null,
        count: data.length
      };
    } else {
      let query = getSupabase().from(this.tableName);
      for (const call of this.calls) {
        query = (query as any)[call.method](...call.args);
      }
      return query;
    }
  }
}

// ─── Export intercepted client ───────────────────────────────────────────────

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (prop === 'auth') {
      return new Proxy(getSupabase().auth, {
        get(authTarget, authProp) {
          if (authProp === 'getSession') {
            return async () => {
              const isDemo = await AsyncStorage.getItem('pt_demo_mode') === 'true';
              if (isDemo) {
                const role = await AsyncStorage.getItem('pt_demo_role') || 'fabricant';
                return {
                  data: {
                    session: {
                      user: {
                        id: `mock-user-id-${role}`,
                        email: `${role}@nigerpharma.ne`,
                      }
                    }
                  },
                  error: null
                };
              }
              return getSupabase().auth.getSession();
            };
          }
          if (authProp === 'signOut') {
            return async () => {
              const isDemo = await AsyncStorage.getItem('pt_demo_mode') === 'true';
              if (isDemo) {
                await AsyncStorage.removeItem('pt_demo_mode');
                await AsyncStorage.removeItem('pt_demo_role');
                return { error: null };
              }
              return getSupabase().auth.signOut();
            };
          }
          return (authTarget as any)[authProp];
        }
      });
    }
    
    if (prop === 'from') {
      return (tableName: string) => {
        return new MockQueryBuilder(tableName);
      };
    }
    
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
  | "archive"
  | "annule";
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
