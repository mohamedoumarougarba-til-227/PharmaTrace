-- ============================================================
-- PHARMATRACE — Schéma complet de la base de données
-- Équipe TrustGrid | MIABE Hackathon 2026 | Niger
-- ============================================================

-- gen_random_uuid() est natif PostgreSQL 13+ (pas besoin d'extension)

-- ─── TYPES ENUM ───────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('fabricant', 'pharmacie', 'agent_dph');

CREATE TYPE statut_lot AS ENUM (
  'en_stock_fabricant',
  'en_transit',
  'en_pharmacie',
  'archive'
);

CREATE TYPE resultat_scan AS ENUM (
  'authentique',
  'suspect',
  'non_trouve',
  'expire'
);

CREATE TYPE statut_transfert AS ENUM (
  'en_attente',
  'receptionne',
  'refuse',
  'archive'
);

CREATE TYPE niveau_alerte AS ENUM (
  'info',
  'avertissement',
  'critique'
);

CREATE TYPE statut_alerte AS ENUM (
  'ouverte',
  'en_cours_traitement',
  'resolue',
  'archive'
);

-- ─── TABLE : utilisateurs ─────────────────────────────────────────────────────
-- Étend auth.users de Supabase avec les informations métier.
-- Les patients n'ont PAS de compte — accès public uniquement.

CREATE TABLE public.utilisateurs (
  id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            VARCHAR(255) NOT NULL,
  nom              VARCHAR(100) NOT NULL DEFAULT 'À compléter',
  prenom           VARCHAR(100) NOT NULL DEFAULT 'À compléter',
  nom_entite       VARCHAR(255) NOT NULL DEFAULT 'À compléter',
  role             user_role   NOT NULL DEFAULT 'fabricant',
  telephone        VARCHAR(20),
  adresse          TEXT,
  ville            VARCHAR(100),
  pays             VARCHAR(50)  NOT NULL DEFAULT 'Niger',
  numero_agrement  VARCHAR(100),
  statut           VARCHAR(10)  NOT NULL DEFAULT 'actif'
                   CHECK (statut IN ('actif', 'archive')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.utilisateurs IS
  'Profils des acteurs agréés : fabricants, pharmacies, agents DPH. Les patients ont accès public sans compte.';

-- ─── TABLE : lots_medicaments ─────────────────────────────────────────────────
-- Table centrale. Chaque ligne = un lot physique avec son hash SHA-256 immuable.

CREATE TABLE public.lots_medicaments (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_lot          VARCHAR(100) UNIQUE NOT NULL,
  nom_medicament      VARCHAR(255) NOT NULL,
  denomination_commune VARCHAR(255),
  forme_galenique     VARCHAR(100),
  dosage              VARCHAR(100),
  quantite_initiale   INTEGER      NOT NULL CHECK (quantite_initiale > 0),
  quantite_actuelle   INTEGER      NOT NULL DEFAULT 0,
  date_fabrication    DATE         NOT NULL,
  date_expiration     DATE         NOT NULL,
  fabricant_id        UUID         NOT NULL REFERENCES public.utilisateurs(id),
  numero_amm          VARCHAR(100),
  pays_origine        VARCHAR(100) DEFAULT 'Niger',
  hash_sha256         VARCHAR(64)  UNIQUE NOT NULL,
  qr_code_url         TEXT,
  statut_actuel       statut_lot   NOT NULL DEFAULT 'en_stock_fabricant',
  is_archived         BOOLEAN      NOT NULL DEFAULT FALSE,
  archived_at         TIMESTAMPTZ,
  archived_reason     TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT date_exp_after_fab
    CHECK (date_expiration > date_fabrication),
  CONSTRAINT quantite_actuelle_valid
    CHECK (quantite_actuelle >= 0 AND quantite_actuelle <= quantite_initiale)
);

COMMENT ON TABLE public.lots_medicaments IS
  'Lots de médicaments enregistrés. hash_sha256 est immuable après création.';
COMMENT ON COLUMN public.lots_medicaments.hash_sha256 IS
  'SHA-256 de (numero_lot || nom_medicament || date_fabrication || fabricant_id || created_at). Immuable.';

-- ─── TABLE : transferts ───────────────────────────────────────────────────────

CREATE TABLE public.transferts (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id              UUID             NOT NULL REFERENCES public.lots_medicaments(id),
  expediteur_id       UUID             NOT NULL REFERENCES public.utilisateurs(id),
  destinataire_id     UUID             NOT NULL REFERENCES public.utilisateurs(id),
  quantite_transferee INTEGER          NOT NULL CHECK (quantite_transferee > 0),
  date_initiation     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  date_reception      TIMESTAMPTZ,
  statut              statut_transfert NOT NULL DEFAULT 'en_attente',
  notes_expediteur    TEXT,
  notes_destinataire  TEXT,
  is_archived         BOOLEAN          NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT expediteur_diff_destinataire
    CHECK (expediteur_id <> destinataire_id)
);

-- ─── TABLE : historique_scans ─────────────────────────────────────────────────
-- Enregistre chaque scan. scanneur_id = NULL pour les patients anonymes.

CREATE TABLE public.historique_scans (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  hash_scanne        VARCHAR(64)  NOT NULL,
  lot_id             UUID         REFERENCES public.lots_medicaments(id),
  type_scanneur      VARCHAR(20)  NOT NULL
                     CHECK (type_scanneur IN ('patient', 'pharmacien', 'agent_dph', 'fabricant')),
  scanneur_id        UUID         REFERENCES public.utilisateurs(id),
  resultat           resultat_scan NOT NULL,
  localisation_ville VARCHAR(100),
  pays_scan          VARCHAR(50)  NOT NULL DEFAULT 'Niger',
  appareil           VARCHAR(50),
  ip_address         VARCHAR(50),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── TABLE : alertes ──────────────────────────────────────────────────────────

CREATE TABLE public.alertes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id          UUID          REFERENCES public.lots_medicaments(id),
  scan_id         UUID          REFERENCES public.historique_scans(id),
  type_alerte     VARCHAR(50)   NOT NULL
                  CHECK (type_alerte IN (
                    'lot_inconnu',
                    'scan_suspect_repete',
                    'qr_duplique',
                    'lot_expire_en_circulation',
                    'autre'
                  )),
  description     TEXT          NOT NULL,
  niveau          niveau_alerte NOT NULL,
  statut          statut_alerte NOT NULL DEFAULT 'ouverte',
  ville_concernee VARCHAR(100),
  created_by      UUID          REFERENCES public.utilisateurs(id),
  resolved_by     UUID          REFERENCES public.utilisateurs(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  is_archived     BOOLEAN       NOT NULL DEFAULT FALSE
);

-- ─── INDEX ────────────────────────────────────────────────────────────────────

CREATE INDEX idx_lots_fabricant    ON public.lots_medicaments(fabricant_id);
CREATE INDEX idx_lots_hash         ON public.lots_medicaments(hash_sha256);
CREATE INDEX idx_lots_statut       ON public.lots_medicaments(statut_actuel);
CREATE INDEX idx_lots_expiration   ON public.lots_medicaments(date_expiration);
CREATE INDEX idx_lots_archived     ON public.lots_medicaments(is_archived) WHERE NOT is_archived;

CREATE INDEX idx_transferts_lot    ON public.transferts(lot_id);
CREATE INDEX idx_transferts_dest   ON public.transferts(destinataire_id);
CREATE INDEX idx_transferts_exp    ON public.transferts(expediteur_id);
CREATE INDEX idx_transferts_statut ON public.transferts(statut);

CREATE INDEX idx_scans_hash        ON public.historique_scans(hash_scanne);
CREATE INDEX idx_scans_created     ON public.historique_scans(created_at);
CREATE INDEX idx_scans_resultat    ON public.historique_scans(resultat);
CREATE INDEX idx_scans_ville       ON public.historique_scans(localisation_ville);

CREATE INDEX idx_alertes_statut    ON public.alertes(statut);
CREATE INDEX idx_alertes_niveau    ON public.alertes(niveau);
CREATE INDEX idx_alertes_created   ON public.alertes(created_at);

-- ─── TRIGGERS ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER utilisateurs_updated_at
  BEFORE UPDATE ON public.utilisateurs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER lots_updated_at
  BEFORE UPDATE ON public.lots_medicaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER alertes_updated_at
  BEFORE UPDATE ON public.alertes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger : créer le profil utilisateur automatiquement après signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.utilisateurs (id, email, nom, prenom, nom_entite, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom',        'À compléter'),
    COALESCE(NEW.raw_user_meta_data->>'prenom',     'À compléter'),
    COALESCE(NEW.raw_user_meta_data->>'nom_entite', 'À compléter'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'fabricant')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger : alerte automatique quand un hash inconnu est scanné
CREATE OR REPLACE FUNCTION public.auto_alerte_scan_suspect()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.resultat = 'non_trouve' THEN
    INSERT INTO public.alertes (
      scan_id, type_alerte, description, niveau, ville_concernee
    ) VALUES (
      NEW.id,
      'lot_inconnu',
      'QR code inconnu scanné : hash ' || NEW.hash_scanne ||
      ' non trouvé dans le registre. Ville : ' || COALESCE(NEW.localisation_ville, 'inconnue'),
      'critique',
      NEW.localisation_ville
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER alerte_scan_suspect
  AFTER INSERT ON public.historique_scans
  FOR EACH ROW EXECUTE FUNCTION public.auto_alerte_scan_suspect();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE public.utilisateurs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots_medicaments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historique_scans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes           ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT role::text FROM public.utilisateurs WHERE id = auth.uid()
$$;

-- ── RLS : utilisateurs ──────────────────────────────────────────────────────

CREATE POLICY "utilisateurs: voir son propre profil"
  ON public.utilisateurs FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "utilisateurs: agent_dph voit tout"
  ON public.utilisateurs FOR SELECT
  USING (public.get_my_role() = 'agent_dph');

CREATE POLICY "utilisateurs: modifier son profil"
  ON public.utilisateurs FOR UPDATE
  USING (id = auth.uid());

-- ── RLS : lots_medicaments ───────────────────────────────────────────────────

-- Lecture publique (vérification patient anonyme via hash)
CREATE POLICY "lots: lecture publique"
  ON public.lots_medicaments FOR SELECT
  USING (true);

-- Seul le fabricant propriétaire peut créer
CREATE POLICY "lots: fabricant crée ses lots"
  ON public.lots_medicaments FOR INSERT
  WITH CHECK (
    fabricant_id = auth.uid()
    AND public.get_my_role() = 'fabricant'
  );

-- Seul le fabricant propriétaire peut modifier ses lots
CREATE POLICY "lots: fabricant modifie ses lots"
  ON public.lots_medicaments FOR UPDATE
  USING (
    fabricant_id = auth.uid()
    AND public.get_my_role() = 'fabricant'
  );

-- ── RLS : transferts ─────────────────────────────────────────────────────────

CREATE POLICY "transferts: voir ses transferts"
  ON public.transferts FOR SELECT
  USING (
    expediteur_id = auth.uid()
    OR destinataire_id = auth.uid()
    OR public.get_my_role() = 'agent_dph'
  );

CREATE POLICY "transferts: fabricant crée"
  ON public.transferts FOR INSERT
  WITH CHECK (
    expediteur_id = auth.uid()
    AND public.get_my_role() = 'fabricant'
  );

CREATE POLICY "transferts: pharmacie met à jour (réceptionner/refuser)"
  ON public.transferts FOR UPDATE
  USING (
    destinataire_id = auth.uid()
    AND public.get_my_role() = 'pharmacie'
  );

-- ── RLS : historique_scans ───────────────────────────────────────────────────

-- INSERT public : les patients anonymes peuvent insérer un scan
CREATE POLICY "scans: insertion publique"
  ON public.historique_scans FOR INSERT
  WITH CHECK (true);

-- SELECT : son propre scan, scans anonymes, ou agent_dph voit tout
CREATE POLICY "scans: voir ses scans"
  ON public.historique_scans FOR SELECT
  USING (
    scanneur_id = auth.uid()
    OR scanneur_id IS NULL
    OR public.get_my_role() = 'agent_dph'
  );

-- ── RLS : alertes ────────────────────────────────────────────────────────────

CREATE POLICY "alertes: insertion publique (déclenchée auto)"
  ON public.alertes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "alertes: agent_dph voit tout"
  ON public.alertes FOR SELECT
  USING (public.get_my_role() = 'agent_dph');

CREATE POLICY "alertes: créateur peut voir"
  ON public.alertes FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "alertes: agent_dph met à jour statut"
  ON public.alertes FOR UPDATE
  USING (public.get_my_role() = 'agent_dph');

-- ─── VUES UTILES ─────────────────────────────────────────────────────────────

-- Vue pour les stats globales DPH
CREATE OR REPLACE VIEW public.stats_dashboard AS
SELECT
  (SELECT COUNT(*) FROM public.lots_medicaments WHERE NOT is_archived)       AS total_lots,
  (SELECT COUNT(*) FROM public.utilisateurs WHERE role = 'pharmacie')         AS pharmacies_actives,
  (SELECT COUNT(*) FROM public.historique_scans
   WHERE created_at >= NOW() - INTERVAL '24 hours')                           AS scans_24h,
  (SELECT COUNT(*) FROM public.alertes
   WHERE statut IN ('ouverte','en_cours_traitement') AND niveau = 'critique') AS alertes_critiques,
  (SELECT COUNT(*) FROM public.historique_scans
   WHERE resultat = 'non_trouve')                                              AS total_suspects;

-- Vue pour les lots avec info fabricant
CREATE OR REPLACE VIEW public.lots_avec_fabricant AS
SELECT
  l.*,
  u.nom_entite  AS fabricant_nom,
  u.ville       AS fabricant_ville,
  u.telephone   AS fabricant_tel
FROM public.lots_medicaments l
JOIN public.utilisateurs u ON l.fabricant_id = u.id;
