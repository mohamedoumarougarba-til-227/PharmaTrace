-- Your EMPTY, ISOLATED development Supabase only. Never the owner's MVP.
-- Create exactly three fictitious confirmed Auth users first, then replace
-- the three empty values below with their UUIDs. No password or default UUID.
begin;
select set_config('pharmatrace.demo_maker', '', true);
select set_config('pharmatrace.demo_pharmacy', '', true);
select set_config('pharmatrace.demo_dph', '', true);
do $seed$
declare
  maker uuid := nullif(current_setting('pharmatrace.demo_maker'), '')::uuid;
  pharmacy uuid := nullif(current_setting('pharmatrace.demo_pharmacy'), '')::uuid;
  dph uuid := nullif(current_setting('pharmatrace.demo_dph'), '')::uuid;
begin
  if maker is null or pharmacy is null or dph is null or maker=pharmacy or maker=dph or pharmacy=dph then
    raise exception 'Supply three distinct fictitious Auth UUIDs from YOUR isolated project';
  end if;
  if exists(select 1 from public.utilisateurs) or exists(select 1 from public.lots_medicaments)
    or exists(select 1 from public.transferts) or exists(select 1 from public.demandes_stock)
    or exists(select 1 from public.historique_scans) or exists(select 1 from public.alertes) then
    raise exception 'Demo seed requires empty business tables; no data is deleted';
  end if;
  if (select count(*) from auth.users)<>3 or
    (select count(*) from auth.users where id in(maker,pharmacy,dph) and email like '%@example.invalid' and email_confirmed_at is not null)<>3 then
    raise exception 'Expected only your three confirmed fictitious example.invalid accounts';
  end if;
  perform private.provision_business_profile(maker,'fabricant','Fabricant Démo','DEMO-NOT-AN-APPROVAL','actif','ISOLATED_DEMO_SEED');
  perform private.provision_business_profile(pharmacy,'pharmacie','Pharmacie Démo','DEMO-NOT-AN-APPROVAL','actif','ISOLATED_DEMO_SEED');
  perform private.provision_business_profile(dph,'agent_dph','Supervision Démo','DEMO-NOT-AN-APPROVAL','actif','ISOLATED_DEMO_SEED');
  insert into public.lots_medicaments(numero_lot,nom_medicament,dosage,forme_galenique,quantite_initiale,quantite_actuelle,date_fabrication,date_expiration,fabricant_id,hash_sha256,is_archived)
  values
    ('DEMO-LOT-001','Produit fictif A','500mg','Comprime',100,100,'2020-01-01','2099-12-31',maker,repeat('1',64),false),
    ('DEMO-LOT-EXPIRED','Produit fictif expiré','250mg','Comprime',100,100,'2020-01-01','2021-01-01',maker,repeat('2',64),false),
    ('DEMO-LOT-ARCHIVED','Produit fictif archivé','500mg','Comprime',100,100,'2020-01-01','2099-12-31',maker,repeat('3',64),true);
end; $seed$;
commit;
