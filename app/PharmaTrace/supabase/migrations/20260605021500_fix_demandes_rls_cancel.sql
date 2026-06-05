-- Migration: Corriger la RLS d'annulation des demandes pour la pharmacie
-- Permet de changer le statut de 'en_attente' à 'annule' sans violer la clause USING

DROP POLICY IF EXISTS "demandes: pharmacie met à jour (annulation)" ON public.demandes_stock;

CREATE POLICY "demandes: pharmacie met à jour (annulation)"
  ON public.demandes_stock FOR UPDATE
  USING (
    pharmacie_id = auth.uid()
    AND public.get_my_role() = 'pharmacie'
    AND statut = 'en_attente'
  )
  WITH CHECK (
    statut = 'annule'
  );
