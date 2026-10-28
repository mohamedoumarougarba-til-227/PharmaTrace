-- Additive contracts and deliberately preserved legacy access. Fixtures always roll back.
create or replace function pg_temp.lot03a_legacy_fingerprint()
returns text language sql stable as $fingerprint$
select md5(jsonb_build_object(
 'relations',(select jsonb_agg(jsonb_build_object('name',c.relname,'acl',c.relacl,'options',c.reloptions,
   'view',case when c.relkind='v' then pg_get_viewdef(c.oid,true) end) order by c.relname)
   from pg_class c where c.oid in('public.utilisateurs'::regclass,'public.lots_medicaments'::regclass,
    'public.historique_scans'::regclass,'public.alertes'::regclass,'public.transferts'::regclass,
    'public.demandes_stock'::regclass,'public.lots_avec_fabricant'::regclass,'public.stats_dashboard'::regclass)),
 'policies',(select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public'),
 'column_grants',(select jsonb_agg(to_jsonb(g) order by table_name,column_name,grantee,privilege_type)
    from information_schema.column_privileges g where table_schema='public' and table_name in('utilisateurs','lots_medicaments','historique_scans','alertes','transferts','demandes_stock')),
 'legacy_trigger',pg_get_functiondef('public.auto_alerte_scan_suspect()'::regprocedure),
 'legacy_trigger_acl',(select proacl from pg_proc where oid='public.auto_alerte_scan_suspect()'::regprocedure)
)::text);
$fingerprint$;

create or replace function pg_temp.lot03a_additive()
returns jsonb language plpgsql as $tests$
declare
 maker uuid:=gen_random_uuid(); pharmacy uuid:=gen_random_uuid(); dph uuid:=gen_random_uuid();
 other_maker uuid:=gen_random_uuid(); pending uuid:=gen_random_uuid();
 lot uuid:=gen_random_uuid(); other_lot uuid:=gen_random_uuid(); expired uuid:=gen_random_uuid(); archived uuid:=gen_random_uuid();
 legacy_scan uuid:=gen_random_uuid();
 code text:='LOT03A_TEST_'||replace(lot::text,'-','');
 unknown_code text:='LOT03A_UNKNOWN_'||replace(pending::text,'-','');
 r jsonb:='[]'; payload jsonb;
begin
 begin
  insert into auth.users(id,email,raw_user_meta_data)
  select x,'lot03a_test_'||x||'@example.invalid','{"role":"agent_dph"}'::jsonb from unnest(array[maker,pharmacy,dph,other_maker,pending]) x;
  perform private.provision_business_profile(maker,'fabricant','LOT03A_TEST_MAKER',null,'actif','LOT03A_TEST maker');
  perform private.provision_business_profile(other_maker,'fabricant','LOT03A_TEST_OTHER',null,'actif','LOT03A_TEST other');
  perform private.provision_business_profile(pharmacy,'pharmacie','LOT03A_TEST_PHARMACY',null,'actif','LOT03A_TEST pharmacy');
  perform private.provision_business_profile(dph,'agent_dph','LOT03A_TEST_DPH',null,'actif','LOT03A_TEST dph');
  update public.utilisateurs set telephone='LOT03A_PRIVATE_PHONE' where id=maker;
  insert into public.lots_medicaments(id,numero_lot,nom_medicament,dosage,forme_galenique,quantite_initiale,date_fabrication,date_expiration,fabricant_id,hash_sha256,is_archived)
  values(lot,code,'LOT03A_TEST_MEDICINE','1mg','Comprime',10,'2020-01-01','2099-01-01',maker,repeat('a',32)||replace(lot::text,'-',''),false),
   (other_lot,'LOT03A_TEST_'||other_lot,'LOT03A_TEST_OTHER_MED','2mg','Sirop',20,'2020-01-01','2099-01-01',other_maker,repeat('b',32)||replace(other_lot::text,'-',''),false),
   (expired,'LOT03A_TEST_'||expired,'LOT03A_TEST_EXPIRED','3mg','Comprime',1,'2020-01-01','2020-02-01',maker,repeat('c',32)||replace(expired::text,'-',''),false),
   (archived,'LOT03A_TEST_'||archived,'LOT03A_TEST_ARCHIVED','4mg','Comprime',1,'2020-01-01','2099-01-01',maker,repeat('d',32)||replace(archived::text,'-',''),true);
  insert into public.transferts(lot_id,expediteur_id,destinataire_id,quantite_transferee) values(lot,maker,pharmacy,1);
  insert into public.historique_scans(id,hash_scanne,type_scanneur,resultat) values(legacy_scan,code,'patient','authentique');
  perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claims','{}',true);
  set local role anon;
  r:=r||pg_temp.lot02_assert(exists(select 1 from public.lots_medicaments where id=lot),'LEG01_anon_raw_lot_still_readable');
  r:=r||pg_temp.lot02_assert(exists(select 1 from public.historique_scans where id=legacy_scan),'LEG02_anon_scan_still_readable');
  r:=r||pg_temp.lot02_assert(exists(select 1 from public.lots_avec_fabricant where id=lot and fabricant_tel='LOT03A_PRIVATE_PHONE'),'LEG03_old_view_unchanged');
  r:=r||pg_temp.lot02_assert((select count(*) from public.stats_dashboard)=1,'LEG04_old_stats_unchanged');
  insert into public.historique_scans(hash_scanne,type_scanneur,scanneur_id,resultat) values(code,'agent_dph',dph,'authentique');
  r:=r||pg_temp.lot02_assert(true,'LEG05_legacy_scan_insert_preserved');
  insert into public.alertes(type_alerte,description,niveau,created_by) values('autre','LOT03A_TEST_LEGACY_ALERT','critique',dph);
  r:=r||pg_temp.lot02_assert(true,'LEG06_legacy_alert_insert_preserved');
  select to_jsonb(v) into payload from public.verify_public_lot(code) v;
  r:=r||pg_temp.lot02_assert(payload->>'nom_medicament'='LOT03A_TEST_MEDICINE','NEW01_anon_known_code');
  r:=r||pg_temp.lot02_assert((select count(*) from jsonb_object_keys(payload))=6 and not payload ?| array['id','telephone','adresse','quantite_initiale','hash_sha256'],'NEW02_minimal_projection');
  r:=r||pg_temp.lot02_assert((select count(*) from public.verify_public_lot(unknown_code))=0,'NEW03_unknown_code');
  r:=r||pg_temp.lot02_assert(pg_temp.lot03_expect('select * from public.verify_public_lot(''%'')','22023'),'NEW04_invalid_code');
  r:=r||pg_temp.lot02_assert((select etat from public.verify_public_lot('LOT03A_TEST_'||archived))='archive','NEW05_archived_state');
  r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select * from public.business_lots'),'NEW06_anon_business_view_denied');
  r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select * from public.supervision_stats'),'NEW07_anon_supervision_denied');
  r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select * from public.get_business_partners()'),'NEW08_anon_directory_denied');
  reset role;
  perform set_config('request.jwt.claim.sub',pending::text,true);
  set local role authenticated;
  r:=r||pg_temp.lot02_assert(exists(select 1 from public.utilisateurs where id=maker),'LEG07_old_global_profiles_preserved');
  r:=r||pg_temp.lot02_assert((select count(*) from public.business_lots)=0 and (select count(*) from public.supervision_stats)=0,'NEW09_unprovisioned_views_empty');
  r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select * from public.get_business_partners()'),'NEW10_unprovisioned_directory_denied');
  r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied(format('select public.record_verification_scan(%L)',code)),'NEW11_unprovisioned_journal_denied');
  r:=r||pg_temp.lot02_assert(public.get_my_profile() is null,'NEW12_unprovisioned_profile_null');
  reset role;
  perform set_config('request.jwt.claim.sub',maker::text,true);
  set local role authenticated;
  r:=r||pg_temp.lot02_assert((select count(*) from public.business_lots where fabricant_id=maker)=3 and not exists(select 1 from public.business_lots where id=other_lot),'NEW13_maker_view_scope');
  r:=r||pg_temp.lot02_assert(not exists(select 1 from public.business_lots where fabricant_tel is not null),'NEW14_phone_redacted');
  r:=r||pg_temp.lot02_assert(exists(select 1 from public.get_business_partners() where id=pharmacy) and not exists(select 1 from public.get_business_partners() where id=dph),'NEW15_maker_directory');
  r:=r||pg_temp.lot02_assert(public.get_my_profile()->>'telephone'='LOT03A_PRIVATE_PHONE','NEW16_own_profile');
  reset role;
  perform set_config('request.jwt.claim.sub',pharmacy::text,true);
  set local role authenticated;
  r:=r||pg_temp.lot02_assert((select count(*) from public.business_lots)=1,'NEW17_pharmacy_view_scope');
  r:=r||pg_temp.lot02_assert((select count(*) from public.get_manufacturer_catalog(maker))=1,'NEW18_catalog');
  r:=r||pg_temp.lot02_assert(exists(select 1 from public.get_business_partners() where id=maker),'NEW19_pharmacy_directory');
  r:=r||pg_temp.lot02_assert((select count(*) from public.supervision_stats)=0,'NEW20_pharmacy_no_supervision');
  perform public.record_verification_scan(code);
  r:=r||pg_temp.lot02_assert(exists(select 1 from public.historique_scans where hash_scanne=code and scanneur_id=pharmacy and type_scanneur='pharmacien' and resultat='authentique'),'NEW21_controlled_journal');
  perform public.record_verification_scan(unknown_code);
  r:=r||pg_temp.lot02_assert(exists(select 1 from public.alertes where created_by=pharmacy and niveau='info' and description='Code absent du registre : '||unknown_code),'NEW22_new_alert_normalized_without_legacy_trigger_change');
  reset role;
  perform set_config('request.jwt.claim.sub',dph::text,true);
  set local role authenticated;
  r:=r||pg_temp.lot02_assert(exists(select 1 from public.business_lots where id=other_lot),'NEW23_dph_lot_supervision');
  r:=r||pg_temp.lot02_assert((select count(*) from public.supervision_stats)=1,'NEW24_dph_aggregates');
  reset role;
  raise exception using errcode='ZA003',message='rollback phase A fixtures';
 exception when sqlstate 'ZA003' then null;
 end;
 return jsonb_build_object('tests',r,'count',jsonb_array_length(r),'fixture_changes','rolled back');
end;
$tests$;
