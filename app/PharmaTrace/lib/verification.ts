import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMockScan, getSupabase, MOCK_LOTS, MOCK_TRANSFERTS, MOCK_USERS } from './supabase';

export type VerificationSource = 'real' | 'demo';

export interface VerificationLot {
  id: string;
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
  // Keep filter syntax out of the PostgREST expression until the limited RPC exists.
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
    const { data, error } = await getSupabase()
      .from('lots_medicaments')
      .select('id, numero_lot, nom_medicament, dosage, date_expiration, statut_actuel, utilisateurs!lots_medicaments_fabricant_id_fkey(nom_entite, ville)')
      .or(`numero_lot.eq.${identifier},hash_sha256.eq.${identifier}`)
      .maybeSingle();
    if (error) throw error;
    if (data === null) return { status: 'NOT_FOUND', source, identifier };
    return { status: 'FOUND', source, identifier, lot: readLot(data) };
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
    let scannerId: string | null = null;
    let scannerType = scanner === 'pharmacie' ? 'pharmacien' : 'patient';
    if (result.source === 'demo') {
      const role = await AsyncStorage.getItem('pt_demo_role');
      if (role) {
        scannerId = `mock-user-id-${role}`;
        scannerType = role === 'pharmacie' ? 'pharmacien' : role;
      }
    } else {
      const client = getSupabase();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      scannerId = data.session?.user.id ?? null;
      if (scanner === 'public' && scannerId) {
        const { data: profile, error: profileError } = await client
          .from('utilisateurs').select('role').eq('id', scannerId).maybeSingle();
        if (profileError) throw profileError;
        if (profile?.role) scannerType = profile.role === 'pharmacie' ? 'pharmacien' : profile.role;
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
    if (result.source === 'demo') {
      addMockScan(scan);
    } else {
      const { error } = await getSupabase().from('historique_scans').insert(scan);
      if (error) throw error;
    }
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
    return transfer ? { id: transfer.id, qte: transfer.quantite_transferee, expediteur: transfer.expediteur_id?.nom_entite ?? 'Fabricant' } : null;
  }
  const client = getSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  let query = client.from('transferts')
    .select('id, quantite_transferee, statut, expediteur_id(nom_entite)')
    .eq('lot_id', result.lot.id).eq('destinataire_id', userId).eq('statut', 'en_attente');
  if (transferId) query = query.eq('id', transferId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const sender = data.expediteur_id as unknown as { nom_entite?: string } | null;
  return { id: data.id, qte: data.quantite_transferee, expediteur: sender?.nom_entite ?? 'Fabricant' };
}
