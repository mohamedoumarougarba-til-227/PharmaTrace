import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMockScan, getSupabase, MOCK_LOTS, MOCK_TRANSFERTS, MOCK_USERS } from './supabase';

export type VerificationSource = 'real' | 'demo';

export interface VerificationLot {
  /** Demo/internal business identity only; never returned by public verification. */
  id?: string;
  numero_lot: string;
  nom_medicament: string;
  dosage?: string | null;
  date_expiration: string;
  statut_actuel: string;
  utilisateurs?: { nom_entite?: string; ville?: string } | null;
}

export type VerificationResult =
  | { status: 'INVALID_INPUT' }
  | { status: 'UNAVAILABLE'; source?: VerificationSource }
  | { status: 'NOT_FOUND'; source: VerificationSource; identifier: string }
  | { status: 'FOUND'; source: VerificationSource; identifier: string; lot: VerificationLot };

export type ScanJournalResult = 'SKIPPED' | 'RECORDED' | 'FAILED';

export interface PendingVerificationTransfer {
  id: string;
  lotId: string;
  qte: number;
  expediteur: string;
}

function parseIdentifier(raw: string): string | null {
  if (raw.length > 2048) return null;
  let identifier = raw.trim();
  if (/^https?:\/\//i.test(identifier)) {
    try {
      const url = new URL(identifier);
      identifier = url.searchParams.has('hash')
        ? url.searchParams.get('hash') ?? ''
        : decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '');
    } catch {
      return null;
    }
  }
  // Existing lot numbers and demo codes use letters, digits, '-' and '_'.
  // Match the exact-code RPC contract; URLs are reduced to their identifier locally.
  return /^[A-Za-z0-9_-]{1,100}$/.test(identifier) ? identifier : null;
}

function readLot(data: unknown): VerificationLot {
  if (!data || typeof data !== 'object') throw new Error('Invalid lot response');
  const lot = data as VerificationLot;
  for (const field of ['id', 'numero_lot', 'nom_medicament', 'date_expiration', 'statut_actuel'] as const) {
    if (typeof lot[field] !== 'string' || !lot[field]) throw new Error('Incomplete lot response');
  }
  if (!Number.isFinite(Date.parse(lot.date_expiration))) throw new Error('Invalid expiration response');
  return lot;
}

function readPublicLot(data: unknown): VerificationLot {
  if (!data || typeof data !== 'object') throw new Error('Invalid public lot');
  const row = data as Record<string, unknown>;
  for (const key of ['numero_lot', 'nom_medicament', 'date_expiration'] as const) {
    if (typeof row[key] !== 'string' || !row[key]) throw new Error('Incomplete public lot');
  }
  if (!Number.isFinite(Date.parse(row.date_expiration as string))
    || (row.etat !== 'enregistre' && row.etat !== 'archive')
    || (row.dosage !== null && typeof row.dosage !== 'string')
    || (row.fabricant_public !== null && typeof row.fabricant_public !== 'string')) {
    throw new Error('Invalid public lot contract');
  }
  // Explicit projection also prevents unexpected backend fields propagating to UI.
  return {
    numero_lot: row.numero_lot as string, nom_medicament: row.nom_medicament as string,
    dosage: row.dosage as string | null, date_expiration: row.date_expiration as string,
    statut_actuel: row.etat,
    utilisateurs: { nom_entite: typeof row.fabricant_public === 'string' ? row.fabricant_public : undefined },
  };
}

/** A lookup never falls back to another source when its selected source fails. */
export async function verifyMedication(raw: string): Promise<VerificationResult> {
  const identifier = parseIdentifier(raw);
  if (!identifier) return { status: 'INVALID_INPUT' };

  let source: VerificationSource | undefined;
  try {
    source = await AsyncStorage.getItem('pt_demo_mode') === 'true' ? 'demo' : 'real';
    if (source === 'demo') {
      const matches = MOCK_LOTS.filter(lot =>
        lot.numero_lot === identifier || lot.hash_sha256 === identifier,
      );
      if (matches.length === 0) return { status: 'NOT_FOUND', source, identifier };
      if (matches.length !== 1) throw new Error('Ambiguous demo code');
      const match = matches[0];
      const manufacturer = MOCK_USERS.find(user => user.id === match.fabricant_id);
      const lot = readLot({
        ...match,
        utilisateurs: {
          nom_entite: match.fabricant_nom ?? manufacturer?.nom_entite,
          ville: manufacturer?.ville,
        },
      });
      return { status: 'FOUND', source, identifier, lot };
    }

    // Bypass the demo proxy: the source chosen for this lookup stays fixed.
    const { data, error } = await getSupabase().rpc('verify_public_lot', { p_identifier: identifier });
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid verification response');
    if (data.length === 0) return { status: 'NOT_FOUND', source, identifier };
    if (data.length !== 1) throw new Error('Ambiguous verification response');
    return { status: 'FOUND', source, identifier, lot: readPublicLot(data[0]) };
  } catch {
    return { status: 'UNAVAILABLE', source };
  }
}

/** Secondary effect only; callers display the established result before awaiting it. */
export async function journalVerificationScan(
  result: VerificationResult,
  scanner: 'public' | 'pharmacie',
): Promise<ScanJournalResult> {
  if (result.status !== 'FOUND' && result.status !== 'NOT_FOUND') return 'SKIPPED';
  try {
    if (result.source === 'real') {
      const client = getSupabase();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) return 'SKIPPED'; // Anonymous journaling is deliberately disabled.
      const { error: journalError } = await client.rpc('record_verification_scan', { p_identifier: result.identifier });
      if (journalError) throw journalError;
      return 'RECORDED';
    }
    let scannerId: string | null = null;
    let scannerType = scanner === 'pharmacie' ? 'pharmacien' : 'patient';
    if (result.source === 'demo') {
      const role = await AsyncStorage.getItem('pt_demo_role');
      if (role) {
        scannerId = `mock-user-id-${role}`;
        scannerType = role === 'pharmacie' ? 'pharmacien' : role;
      }
    }

    const scan = {
      hash_scanne: result.identifier,
      lot_id: result.status === 'FOUND' ? result.lot.id : null,
      type_scanneur: scannerType,
      scanneur_id: scannerId,
      resultat: result.status === 'NOT_FOUND' ? 'non_trouve'
        : new Date(result.lot.date_expiration) < new Date() ? 'expire' : 'authentique',
      pays_scan: 'Niger',
    };
    addMockScan(scan);
    return 'RECORDED';
  } catch {
    return 'FAILED';
  }
}

/** A transfer lookup is secondary to the lot result and uses the same source. */
export async function findPendingVerificationTransfer(
  result: Extract<VerificationResult, { status: 'FOUND' }>,
  transferId?: string,
): Promise<PendingVerificationTransfer | null> {
  if (result.source === 'demo') {
    const role = await AsyncStorage.getItem('pt_demo_role');
    const transfers = MOCK_TRANSFERTS.filter(transfer =>
      transfer.lot_id?.id === result.lot.id
      && transfer.destinataire_id === `mock-user-id-${role}`
      && transfer.statut === 'en_attente'
      && (!transferId || transfer.id === transferId),
    );
    if (transfers.length > 1) throw new Error('Ambiguous pending transfer');
    const transfer = transfers[0];
    return transfer ? { id: transfer.id, lotId: transfer.lot_id.id, qte: transfer.quantite_transferee, expediteur: transfer.expediteur_id?.nom_entite ?? 'Fabricant' } : null;
  }
  const client = getSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  let query = client.from('transferts')
    .select('id, lot_id, quantite_transferee, statut, lot:lots_medicaments!inner(numero_lot), expediteur_id(nom_entite)')
    .eq('lot.numero_lot', result.lot.numero_lot).eq('destinataire_id', userId).eq('statut', 'en_attente');
  if (transferId) query = query.eq('id', transferId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (typeof data.lot_id !== 'string') throw new Error('Missing business lot identity');
  const sender = data.expediteur_id as unknown as { nom_entite?: string } | null;
  return { id: data.id, lotId: data.lot_id, qte: data.quantite_transferee, expediteur: sender?.nom_entite ?? 'Fabricant' };
}
