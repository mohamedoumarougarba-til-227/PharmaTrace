-- LOT 0.3B2: restrictive cutover after SQL, PostgREST and browser gates.
-- Legacy anonymous reads succeed empty; direct client scan INSERTs are no-ops.
-- Only the validated record_verification_scan RPC persists user-originated scans.
-- No historical rows are changed. Transfert/demande write policies are outside this lot.



-- Deliberate definer boundary: an exact-code projection, without raw table SELECT.


revoke all privileges on public.lots_medicaments from public, anon;
-- Keep API SELECT privilege: RLS hides every row from anonymous legacy readers.
-- This avoids a permission error in the old FAB-* catch for valid legacy queries.
grant select on public.lots_medicaments to anon;
drop policy "lots: lecture publique" on public.lots_medicaments;
create policy "lots: lecture metier necessaire" on public.lots_medicaments
for select to authenticated using (
  (select public.get_my_role())='agent_dph'
  or ((select public.get_my_role())='fabricant' and fabricant_id=(select auth.uid()))
  or ((select public.get_my_role())='pharmacie' and exists (
    select 1 from public.transferts t where t.lot_id=lots_medicaments.id
      and t.destinataire_id=(select auth.uid())
  ))
);

-- Preserve embedding of names needed by transfers/requests; private profile columns
-- are not SELECT-granted. Full own contact details use a UID-scoped RPC below.
revoke select on public.utilisateurs from public, anon, authenticated;
-- Anonymous UID is NULL: no existing profile SELECT policy matches.
-- Keep all-column privilege here so legacy embeds/SELECTs can return an empty set.
grant select on public.utilisateurs to anon;
grant select(id,nom_entite,ville,pays,role,statut) on public.utilisateurs to authenticated;
drop policy "utilisateurs: lecture pour les connectes" on public.utilisateurs;
create policy "utilisateurs: projections partenaires" on public.utilisateurs
for select to authenticated using (
  (select public.get_my_role()) in ('fabricant','pharmacie') and (
    (role_provisioned_at is not null and statut='actif' and (
      ((select public.get_my_role())='fabricant' and role='pharmacie')
      or ((select public.get_my_role())='pharmacie' and role='fabricant')
    ))
    or exists (select 1 from public.transferts t where
      (t.expediteur_id=(select auth.uid()) and t.destinataire_id=utilisateurs.id)
      or (t.destinataire_id=(select auth.uid()) and t.expediteur_id=utilisateurs.id))
    or exists (select 1 from public.demandes_stock d where
      (d.fabricant_id=(select auth.uid()) and d.pharmacie_id=utilisateurs.id)
      or (d.pharmacie_id=(select auth.uid()) and d.fabricant_id=utilisateurs.id))
  )
);



-- A pharmacy may browse medicine names for requests, without stock/UUID disclosure.


-- Anonymous journaling is disabled. Validated users submit an identifier only;
-- identity, scanner type, lot and verdict are computed in the DB, never accepted.


revoke all privileges on public.historique_scans from public, anon, authenticated;
-- Compatibility-only INSERT privilege. It must NOT permit a persisted client row.
grant select, insert on public.historique_scans to anon, authenticated;

create function private.discard_legacy_scan()
returns trigger language plpgsql security invoker set search_path = '' as $sink$
begin
  -- Clients cannot select current_user. JWT identity is deliberately NOT a bypass.
  -- The controlled SECURITY DEFINER RPC executes as postgres; it still computes
  -- and validates all authority/columns itself. Other privileged writers are trusted.
  if current_user in ('anon','authenticated') then return null; end if;
  return new;
end;
$sink$;
revoke all on function private.discard_legacy_scan() from public,anon,authenticated,service_role;
create trigger discard_legacy_client_scan
before insert on public.historique_scans
for each row execute function private.discard_legacy_scan();

-- BEFORE RETURN NULL must precede row checks and suppress AFTER alert triggers.
-- Verify actual minimal-return/representation HTTP responses in B2. Invalid JSON,
-- casts, unknown columns and outages can still fail before this trigger executes.
drop policy "scans: insertion publique" on public.historique_scans;
drop policy "scans: voir ses scans" on public.historique_scans;
create policy "scans: propres ou supervision" on public.historique_scans
for select to authenticated using (
  (select public.get_my_role())='agent_dph'
  or ((select public.get_my_role()) is not null and scanneur_id=(select auth.uid()))
);

revoke insert on public.alertes from public, anon, authenticated;
revoke all privileges on public.alertes from anon;
-- No anonymous SELECT policy matches; needed for old invoker aggregate views.
grant select on public.alertes to anon;
drop policy "alertes: insertion publique (déclenchée auto)" on public.alertes;
create or replace function public.auto_alerte_scan_suspect()
returns trigger language plpgsql security invoker set search_path = '' as $function$
begin
  -- Only DB-computed scans from validated accounts reach this trigger via RPC.
  if new.resultat='non_trouve' and new.scanneur_id=auth.uid()
     and public.get_my_role() is not null then
    insert into public.alertes(scan_id,type_alerte,description,niveau,ville_concernee,created_by)
    values(new.id,'lot_inconnu','Code absent du registre : '||new.hash_scanne,
      'info',null,new.scanneur_id);
  end if;
  return new;
end;
$function$;
revoke all on function public.auto_alerte_scan_suspect() from public, anon, authenticated, service_role;

-- Preserve the used view and its existing column names, with phone redacted.
create or replace view public.lots_avec_fabricant with (security_invoker=true) as
select l.*,u.nom_entite as fabricant_nom,u.ville as fabricant_ville,
  null::varchar(20) as fabricant_tel
from public.lots_medicaments l join public.utilisateurs u on u.id=l.fabricant_id;
revoke all privileges on public.lots_avec_fabricant from public, anon, authenticated;
grant select on public.lots_avec_fabricant to anon, authenticated;

-- Keep historical calculations; access is now invoker + an explicit DPH predicate.
create or replace view public.stats_dashboard with (security_invoker=true) as
select
  (select count(*) from public.lots_medicaments where not is_archived) as total_lots,
  (select count(*) from public.utilisateurs where role='pharmacie') as pharmacies_actives,
  (select count(*) from public.historique_scans where created_at>=now()-interval '24 hours') as scans_24h,
  (select count(*) from public.alertes where statut in ('ouverte','en_cours_traitement') and niveau='critique') as alertes_critiques,
  (select count(*) from public.historique_scans where resultat='non_trouve') as total_suspects
where (select public.get_my_role())='agent_dph';
revoke all privileges on public.stats_dashboard from public, anon, authenticated;
grant select on public.stats_dashboard to anon, authenticated;

notify pgrst, 'reload schema';
