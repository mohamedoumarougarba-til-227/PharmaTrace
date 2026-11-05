import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, MOCK_LOTS, MOCK_USERS, type Utilisateur } from './supabase';

export interface CatalogMedicine {
  nom_medicament: string;
  dosage: string;
  forme_galenique: string | null;
}

export interface BusinessPartner {
  id: string;
  nom_entite: string;
  ville: string | null;
  pays: string | null;
}

export async function getBusinessPartners(): Promise<BusinessPartner[]> {
  if (await AsyncStorage.getItem('pt_demo_mode') === 'true') {
    const role = await AsyncStorage.getItem('pt_demo_role');
    const target = role === 'fabricant' ? 'pharmacie' : role === 'pharmacie' ? 'fabricant' : null;
    if (!target) throw new Error('No demo business directory for this role');
    return MOCK_USERS.filter(user => user.role === target && user.statut === 'actif')
      .map(user => ({ id: user.id, nom_entite: user.nom_entite, ville: user.ville ?? null, pays: user.pays ?? null }));
  }
  const { data, error } = await getSupabase().rpc('get_business_partners');
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Invalid business directory');
  return data.map(row => ({ id: row.id, nom_entite: row.nom_entite, ville: row.ville, pays: row.pays }));
}

export async function getOwnProfile(): Promise<Utilisateur | null> {
  if (await AsyncStorage.getItem('pt_demo_mode') === 'true') {
    const role = await AsyncStorage.getItem('pt_demo_role');
    return MOCK_USERS.find(user => user.id === `mock-user-id-${role}`) ?? null;
  }
  const { data, error } = await getSupabase().rpc('get_my_profile');
  if (error) throw error;
  return data;
}

export async function getManufacturerCatalog(manufacturerId: string): Promise<CatalogMedicine[]> {
  if (await AsyncStorage.getItem('pt_demo_mode') === 'true') {
    return MOCK_LOTS.filter(lot => lot.fabricant_id === manufacturerId
      && lot.statut_actuel === 'en_stock_fabricant' && !lot.is_archived
      && lot.date_expiration >= new Date().toISOString().slice(0, 10))
      .map(lot => ({ nom_medicament: lot.nom_medicament, dosage: lot.dosage ?? '', forme_galenique: lot.forme_galenique ?? null }));
  }
  const { data, error } = await getSupabase().rpc('get_manufacturer_catalog', { p_manufacturer_id: manufacturerId });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Invalid catalog response');
  return data.map(row => ({ nom_medicament: row.nom_medicament, dosage: row.dosage ?? '', forme_galenique: row.forme_galenique ?? null }));
}
