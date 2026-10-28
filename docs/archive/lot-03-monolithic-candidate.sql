-- LOT 0.3 CUTOVER: rehearse with rollback; apply only with coordinated client approval.
-- No historical rows are changed. Transfert/demande write policies are outside this lot.

create function private.resolve_verification_lot(p_identifier text)
returns public.lots_medicaments
language plpgsql stable security invoker set search_path = '' as $function$
declare resolved public.lots_medicaments;
begin
  if p_identifier is null or p_identifier !~ '^[A-Za-z0-9_-]{1,100}$' then
    raise exception 'Invalid verification identifier' using errcode='22023';
  end if;
  begin
    select l.* into strict resolved from public.lots_medicaments l
    where l.numero_lot = p_identifier or l.hash_sha256 = p_identifier;
  exception
    when no_data_found then return null;
    when too_many_rows then
      raise exception 'Ambiguous verification identifier' using errcode='21000';
  end;
  return resolved;
end;
$function$;
revoke all on function private.resolve_verification_lot(text) from public, anon, authenticated, service_role;

-- Deliberate definer boundary: an exact-code projection, without raw table SELECT.
create function public.verify_public_lot(p_identifier text)
returns table(numero_lot text, nom_medicament text, dosage text,
              fabricant_public text, date_expiration date, etat text)
language plpgsql stable security definer set search_path = '' as $function$
declare resolved public.lots_medicaments;
begin
  resolved := private.resolve_verification_lot(p_identifier);
  if resolved.id is null then return; end if;
  return query select resolved.numero_lot::text, resolved.nom_medicament::text,
    resolved.dosage::text, u.nom_entite::text, resolved.date_expiration,
    case when resolved.is_archived or resolved.statut_actuel='archive'
         then 'archive' else 'enregistre' end
  from public.utilisateurs u where u.id=resolved.fabricant_id;
end;
$function$;
revoke all on function public.verify_public_lot(text) from public, anon, authenticated, service_role;
grant execute on function public.verify_public_lot(text) to anon, authenticated;

revoke all privileges on public.lots_medicaments from public, anon;
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

create function public.get_my_profile()
returns jsonb language sql stable security definer set search_path = '' as $function$
  select jsonb_build_object('id',u.id,'email',u.email,'nom',u.nom,'prenom',u.prenom,
    'nom_entite',u.nom_entite,'telephone',u.telephone,'adresse',u.adresse,
    'ville',u.ville,'pays',u.pays,'role',u.role,'statut',u.statut,
    'numero_agrement',u.numero_agrement,'created_at',u.created_at)
  from public.utilisateurs u where u.id=(select auth.uid())
$function$;
revoke all on function public.get_my_profile() from public, anon, authenticated, service_role;
grant execute on function public.get_my_profile() to authenticated;

-- A pharmacy may browse medicine names for requests, without stock/UUID disclosure.
create function public.get_manufacturer_catalog(p_manufacturer_id uuid)
returns table(nom_medicament text,dosage text,forme_galenique text)
language plpgsql stable security definer set search_path = '' as $function$
begin
  if (select public.get_my_role()) is distinct from 'pharmacie' then
    raise exception 'Validated pharmacy required' using errcode='42501';
  end if;
  return query select distinct l.nom_medicament::text,l.dosage::text,l.forme_galenique::text
  from public.lots_medicaments l join public.utilisateurs u on u.id=l.fabricant_id
  where u.id=p_manufacturer_id and u.role='fabricant' and u.statut='actif'
    and u.role_provisioned_at is not null and l.statut_actuel='en_stock_fabricant'
    and l.date_expiration>=current_date and not l.is_archived;
end;
$function$;
revoke all on function public.get_manufacturer_catalog(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_manufacturer_catalog(uuid) to authenticated;

-- Anonymous journaling is disabled. Validated users submit an identifier only;
-- identity, scanner type, lot and verdict are computed in the DB, never accepted.
create function public.record_verification_scan(p_identifier text)
returns void language plpgsql security definer set search_path = '' as $function$
declare resolved public.lots_medicaments; caller_role text;
begin
  caller_role := public.get_my_role();
  if auth.uid() is null or caller_role is null then
    raise exception 'Validated business account required' using errcode='42501';
  end if;
  resolved := private.resolve_verification_lot(p_identifier);
  if resolved.is_archived or resolved.statut_actuel='archive' then
    raise exception 'Archived match cannot be logged as an active match' using errcode='22023';
  end if;
  insert into public.historique_scans(hash_scanne,lot_id,type_scanneur,scanneur_id,resultat)
  values(p_identifier,resolved.id,
    case when caller_role='pharmacie' then 'pharmacien' else caller_role end,
    auth.uid(),case when resolved.id is null then 'non_trouve'::public.resultat_scan
      when resolved.date_expiration<current_date then 'expire'::public.resultat_scan
      else 'authentique'::public.resultat_scan end);
end;
$function$;
revoke all on function public.record_verification_scan(text) from public, anon, authenticated, service_role;
grant execute on function public.record_verification_scan(text) to authenticated;

revoke all privileges on public.historique_scans from public, anon, authenticated;
grant select on public.historique_scans to authenticated;
drop policy "scans: insertion publique" on public.historique_scans;
drop policy "scans: voir ses scans" on public.historique_scans;
create policy "scans: propres ou supervision" on public.historique_scans
for select to authenticated using (
  (select public.get_my_role())='agent_dph'
  or ((select public.get_my_role()) is not null and scanneur_id=(select auth.uid()))
);

revoke insert on public.alertes from public, anon, authenticated;
revoke all privileges on public.alertes from anon;
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
grant select on public.lots_avec_fabricant to authenticated;

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
grant select on public.stats_dashboard to authenticated;

notify pgrst, 'reload schema';
