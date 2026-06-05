-- Migration : Table demandes_stock
-- Permet aux pharmacies de demander des médicaments auprès des fabricants

CREATE TYPE statut_demande AS ENUM ('en_attente', 'satisfait', 'refuse', 'annule');

CREATE TABLE public.demandes_stock (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacie_id      UUID           NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  fabricant_id      UUID           NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  nom_medicament    VARCHAR(255)   NOT NULL,
  dosage            VARCHAR(100)   NOT NULL,
  quantite_demandee INTEGER        NOT NULL CHECK (quantite_demandee > 0),
  notes_pharmacie   TEXT,
  notes_fabricant   TEXT,
  statut            statut_demande NOT NULL DEFAULT 'en_attente',
  transfert_id      UUID           REFERENCES public.transferts(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les jointures et requêtes
CREATE INDEX idx_demandes_pharmacie ON public.demandes_stock(pharmacie_id);
CREATE INDEX idx_demandes_fabricant ON public.demandes_stock(fabricant_id);
CREATE INDEX idx_demandes_statut    ON public.demandes_stock(statut);

-- Trigger pour update_updated_at
CREATE TRIGGER demandes_stock_updated_at
  BEFORE UPDATE ON public.demandes_stock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.demandes_stock ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "demandes: voir ses propres demandes"
  ON public.demandes_stock FOR SELECT
  USING (
    pharmacie_id = auth.uid()
    OR fabricant_id = auth.uid()
    OR public.get_my_role() = 'agent_dph'
  );

CREATE POLICY "demandes: pharmacie insère ses demandes"
  ON public.demandes_stock FOR INSERT
  WITH CHECK (
    pharmacie_id = auth.uid()
    AND public.get_my_role() = 'pharmacie'
  );

CREATE POLICY "demandes: pharmacie met à jour (annulation)"
  ON public.demandes_stock FOR UPDATE
  USING (
    pharmacie_id = auth.uid()
    AND public.get_my_role() = 'pharmacie'
    AND statut = 'en_attente'
  );

CREATE POLICY "demandes: fabricant met à jour (repondre/refuser)"
  ON public.demandes_stock FOR UPDATE
  USING (
    fabricant_id = auth.uid()
    AND public.get_my_role() = 'fabricant'
  );
