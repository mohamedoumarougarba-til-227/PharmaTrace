-- Migration: Ajouter groupe_id et forme_galenique à demandes_stock

ALTER TABLE public.demandes_stock ADD COLUMN groupe_id UUID;
ALTER TABLE public.demandes_stock ADD COLUMN forme_galenique VARCHAR(100);

CREATE INDEX idx_demandes_groupe ON public.demandes_stock(groupe_id);
