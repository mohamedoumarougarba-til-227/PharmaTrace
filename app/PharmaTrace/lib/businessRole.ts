import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, type UserRole } from './supabase';

export type BusinessAccess =
  | { status: 'ANONYMOUS' }
  | { status: 'UNPROVISIONED' }
  | { status: 'UNAVAILABLE' }
  | { status: 'AUTHORIZED'; role: UserRole };

export const UNPROVISIONED_MESSAGE =
  'Vous êtes connecté, mais aucun accès métier n’a été validé pour ce compte. Contactez l’opérateur PharmaTrace.';

export const BUSINESS_ROUTES = {
  fabricant: '/(fabricant)',
  pharmacie: '/(pharmacie)',
  agent_dph: '/(agent-dph)',
} as const;

function isBusinessRole(value: unknown): value is UserRole {
  return value === 'fabricant' || value === 'pharmacie' || value === 'agent_dph';
}

/** The DB checks operator provisioning and active status; profile.role alone is not authority. */
export async function getBusinessAccess(): Promise<BusinessAccess> {
  try {
    if (await AsyncStorage.getItem('pt_demo_mode') === 'true') {
      const role = await AsyncStorage.getItem('pt_demo_role');
      return isBusinessRole(role) ? { status: 'AUTHORIZED', role } : { status: 'UNPROVISIONED' };
    }
    const client = getSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) return { status: 'ANONYMOUS' };
    const { data: role, error: roleError } = await client.rpc('get_my_role');
    if (roleError) throw roleError;
    if (role === null) return { status: 'UNPROVISIONED' };
    return isBusinessRole(role) ? { status: 'AUTHORIZED', role } : { status: 'UNAVAILABLE' };
  } catch {
    return { status: 'UNAVAILABLE' };
  }
}
