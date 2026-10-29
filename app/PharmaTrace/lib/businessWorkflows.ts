import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { getSupabase } from './supabase';

export interface TransferIntent {
  lot_id: string;
  destinataire_id: string;
  quantite: number;
  note?: string | null;
  demande_id?: string | null;
}
export interface RequestIntent {
  fabricant_id: string;
  nom_medicament: string;
  dosage: string;
  forme_galenique?: string | null;
  quantite: number;
  note?: string | null;
}
// Kept by the form across errors, including an unknown response after commit.
// Reset only when the user explicitly starts a new form, never on a network error.
export interface WorkflowIntent { fingerprint?: string; key?: string }

export function matchesRequestedMedicine(
  lot: { nom_medicament: string; dosage?: string | null; forme_galenique?: string | null },
  request: { nom_medicament: string; dosage?: string | null; forme_galenique?: string | null },
): boolean {
  return lot.nom_medicament === request.nom_medicament
    && (lot.dosage || '') === (request.dosage || '')
    && (lot.forme_galenique || '') === (request.forme_galenique || '');
}

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (await AsyncStorage.getItem('pt_demo_mode') === 'true') {
    throw new Error('Simulation : les écritures métier sont désactivées. Utilisez un compte provisionné pour tester un transfert réel.');
  }
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) throw error;
  return data;
}

function quantity(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 2147483647) {
    throw new Error('La quantité doit être un entier positif (int32).');
  }
  return value;
}

async function create(name: string, items: object[], intent: WorkflowIntent): Promise<string[]> {
  if (!items.length || items.length > 50) throw new Error('Choisissez 1 à 50 articles.');
  const fingerprint = JSON.stringify({ name, items });
  if (intent.fingerprint !== fingerprint || !intent.key) {
    intent.key = randomUUID(); intent.fingerprint = fingerprint;
  }
  const data = await rpc(name, { p_key: intent.key, p_items: items });
  if (!data || typeof data !== 'object' || !('ids' in data)
    || !Array.isArray(data.ids) || data.ids.length !== items.length
    || data.ids.some(id => typeof id !== 'string')) {
    throw new Error('Réponse métier invalide. Rechargez les données avant de réessayer.');
  }
  return data.ids;
}

export function createTransfers(items: TransferIntent[], intent: WorkflowIntent): Promise<string[]> {
  return create('create_lot_transfers', items.map(item => ({
    lot_id: item.lot_id, destinataire_id: item.destinataire_id,
    quantite: quantity(item.quantite), note: item.note?.trim() || null,
    demande_id: item.demande_id || null,
  })), intent);
}

export function createRequests(items: RequestIntent[], intent: WorkflowIntent): Promise<string[]> {
  return create('create_stock_requests', items.map(item => ({
    fabricant_id: item.fabricant_id, nom_medicament: item.nom_medicament,
    dosage: item.dosage, forme_galenique: item.forme_galenique || null,
    quantite: quantity(item.quantite), note: item.note?.trim() || null,
  })), intent);
}

export async function decideRequests(ids: string[], decision: 'refuse' | 'annule', note?: string): Promise<void> {
  const result = await rpc('decide_stock_requests', { p_ids: ids, p_decision: decision, p_note: note?.trim() || null });
  if (result !== ids.length) throw new Error('Décision non confirmée. Rechargez les demandes.');
}

export async function decideTransfer(id: string, decision: 'receptionne' | 'refuse' | 'annule', identifier?: string): Promise<void> {
  const result = await rpc('decide_lot_transfer', { p_transfer_id: id, p_decision: decision, p_identifier: identifier || null });
  if (result !== id) throw new Error('Décision non confirmée. Rechargez les transferts.');
}

export function workflowError(error: unknown): string {
  if (error instanceof Error && error.message.startsWith('Simulation :')) return error.message;
  if (error && typeof error === 'object' && 'code' in error && error.code === '23514') {
    return 'Stock historique incohérent : une réconciliation opérateur est nécessaire. Aucune opération enregistrée.';
  }
  return 'Opération non confirmée. Rechargez les données puis réessayez sans modifier le formulaire. Le serveur contrôle les droits, le stock et les doubles traitements.';
}
