-- Restrictive target only: run inside the documented rehearsal after phase B.
-- Phase A alone intentionally preserves legacy access and cannot satisfy these 59 checks.
-- Historical target before B1: several permission-denied expectations are intentionally
-- incompatible with the new B2 draft. Retained as regression inventory, not as proof of B2.
-- This function rolls back every LOT03_TEST fixture; no historical row is changed.
create or replace function pg_temp.lot03_expect(statement text, expected_state text)
returns boolean language plpgsql as $expect$
begin
  execute statement;
  return false;
exception when others then return sqlstate=expected_state;
end;
$expect$;

create or replace function pg_temp.lot03_public_contract()
returns jsonb language plpgsql as $tests$
declare
  maker uuid:=gen_random_uuid(); other_maker uuid:=gen_random_uuid();
  pharmacy uuid:=gen_random_uuid(); dph uuid:=gen_random_uuid(); pending uuid:=gen_random_uuid();
  own_lot uuid:=gen_random_uuid(); other_lot uuid:=gen_random_uuid();
  expired_lot uuid:=gen_random_uuid(); archived_lot uuid:=gen_random_uuid();
  code text:='LOT03_TEST_'||replace(own_lot::text,'-','');
  other_code text:='LOT03_TEST_'||replace(other_lot::text,'-','');
  expired_code text:='LOT03_TEST_'||replace(expired_lot::text,'-','');
  archived_code text:='LOT03_TEST_'||replace(archived_lot::text,'-','');
  unknown_code text:='LOT03_TEST_UNKNOWN_'||replace(pending::text,'-','');
  payload jsonb; n bigint; observed jsonb; r jsonb:='[]';
begin
  begin
    insert into auth.users(id,email,raw_user_meta_data)
    select x,'lot03_test_'||x||'@example.invalid','{"role":"agent_dph"}'::jsonb
    from unnest(array[maker,other_maker,pharmacy,dph,pending]) x;
    perform private.provision_business_profile(maker,'fabricant','LOT03_TEST_MAKER','LOT03_TEST_APPROVAL','actif','LOT03_TEST maker');
    perform private.provision_business_profile(other_maker,'fabricant','LOT03_TEST_OTHER',null,'actif','LOT03_TEST other');
    perform private.provision_business_profile(pharmacy,'pharmacie','LOT03_TEST_PHARMACY',null,'actif','LOT03_TEST pharmacy');
    perform private.provision_business_profile(dph,'agent_dph','LOT03_TEST_DPH',null,'actif','LOT03_TEST dph');
    update public.utilisateurs set telephone='LOT03_PRIVATE_PHONE',adresse='LOT03_TEST_PRIVATE_ADDRESS' where id=maker;
    insert into public.lots_medicaments(id,numero_lot,nom_medicament,dosage,forme_galenique,
      quantite_initiale,quantite_actuelle,date_fabrication,date_expiration,fabricant_id,hash_sha256,is_archived)
    values
      (own_lot,code,'LOT03_TEST_MEDICINE','1mg','Comprime',10,10,'2020-01-01','2099-01-01',maker,repeat('a',32)||replace(own_lot::text,'-',''),false),
      (other_lot,other_code,'LOT03_TEST_OTHER_MED','2mg','Sirop',20,20,'2020-01-01','2099-01-01',other_maker,repeat('b',32)||replace(other_lot::text,'-',''),false),
      (expired_lot,expired_code,'LOT03_TEST_EXPIRED','3mg','Comprime',1,1,'2020-01-01','2020-02-01',maker,repeat('c',32)||replace(expired_lot::text,'-',''),false),
      (archived_lot,archived_code,'LOT03_TEST_ARCHIVED','4mg','Comprime',1,1,'2020-01-01','2099-01-01',maker,repeat('d',32)||replace(archived_lot::text,'-',''),true);
    insert into public.transferts(lot_id,expediteur_id,destinataire_id,quantite_transferee)
    values(own_lot,maker,pharmacy,1);
    insert into public.demandes_stock(pharmacie_id,fabricant_id,nom_medicament,dosage,quantite_demandee)
    values(pharmacy,maker,'LOT03_TEST_MEDICINE','1mg',1);

    perform set_config('request.jwt.claim.sub','',true);
    perform set_config('request.jwt.claims','{}',true);
    set local role anon;
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select * from public.lots_medicaments'),'A01_anon_lots_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select * from public.historique_scans'),'A02_anon_scans_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select * from public.utilisateurs'),'A03_anon_profiles_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select * from public.lots_avec_fabricant'),'A04_anon_lot_view_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select * from public.stats_dashboard'),'A05_anon_stats_denied');
    select to_jsonb(v) into payload from public.verify_public_lot(code) v;
    r:=r||pg_temp.lot02_assert(payload->>'nom_medicament'='LOT03_TEST_MEDICINE' and payload->>'fabricant_public'='LOT03_TEST_MAKER','A06_known_code_minimal');
    r:=r||pg_temp.lot02_assert((select array_agg(k order by k) from jsonb_object_keys(payload) k)=array['date_expiration','dosage','etat','fabricant_public','nom_medicament','numero_lot'],'A07_exact_public_keys');
    r:=r||pg_temp.lot02_assert(not(payload::text like '%PRIVATE%' or payload::text like '%'||maker::text||'%' or payload::text like '%'||own_lot::text||'%'),'A08_no_private_fields');
    r:=r||pg_temp.lot02_assert((select count(*) from public.verify_public_lot(unknown_code))=0,'A09_unknown_code_empty');
    r:=r||pg_temp.lot02_assert((select count(*) from public.verify_public_lot(repeat('a',32)||replace(own_lot::text,'-','')))=1,'A10_exact_hash');
    r:=r||pg_temp.lot02_assert(pg_temp.lot03_expect('select * from public.verify_public_lot(null)','22023'),'A11_null_invalid');
    r:=r||pg_temp.lot02_assert(pg_temp.lot03_expect('select * from public.verify_public_lot('''')','22023'),'A12_empty_invalid');
    r:=r||pg_temp.lot02_assert(pg_temp.lot03_expect('select * from public.verify_public_lot(''%'')','22023'),'A13_wildcard_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot03_expect('select * from public.verify_public_lot(''a,or(id.gt.0)'')','22023'),'A14_filter_syntax_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot03_expect('select * from public.verify_public_lot(repeat(''a'',101))','22023'),'A15_length_limit');
    r:=r||pg_temp.lot02_assert((select count(*) from public.verify_public_lot('LOT03_TEST_'))=0,'A16_prefix_is_not_listing');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('insert into public.historique_scans(hash_scanne,type_scanneur,resultat) values(''LOT03_TEST_FORGED'',''agent_dph'',''authentique'')'),'A17_forged_verdict_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied(format('insert into public.historique_scans(hash_scanne,type_scanneur,scanneur_id,resultat) values(''LOT03_TEST_FORGED'',''agent_dph'',%L,''authentique'')',dph)),'A18_forged_scanner_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied(format('insert into public.alertes(type_alerte,description,niveau,created_by) values(''autre'',''LOT03_TEST_FORGED'',''critique'',%L)',dph)),'A19_forged_alert_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied(format('select public.record_verification_scan(%L)',code)),'A20_anonymous_journal_disabled');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select public.auto_alerte_scan_suspect()'),'A21_trigger_not_rpc');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select public.get_my_profile()'),'A22_anon_own_profile_rpc_denied');
    reset role;

    perform set_config('request.jwt.claim.sub',pending::text,true);
    set local role authenticated;
    r:=r||pg_temp.lot02_assert((select count(*) from public.lots_medicaments)=0,'B01_pending_no_lots');
    r:=r||pg_temp.lot02_assert((select count(*) from public.historique_scans)=0,'B02_pending_no_scans');
    r:=r||pg_temp.lot02_assert((select count(*) from public.utilisateurs)=0,'B03_pending_no_profiles');
    r:=r||pg_temp.lot02_assert((select count(*) from public.lots_avec_fabricant)=0 and (select count(*) from public.stats_dashboard)=0,'B04_pending_views_empty');
    r:=r||pg_temp.lot02_assert((select count(*) from public.verify_public_lot(code))=1,'B05_pending_public_contract_only');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied(format('select public.record_verification_scan(%L)',code)),'B06_pending_journal_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied(format('select * from public.get_manufacturer_catalog(%L)',maker)),'B07_pending_catalog_denied');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('insert into public.alertes(type_alerte,description,niveau) values(''autre'',''LOT03_TEST_FORGED'',''critique'')'),'B08_pending_alert_denied');
    reset role;

    perform set_config('request.jwt.claim.sub',maker::text,true);
    set local role authenticated;
    r:=r||pg_temp.lot02_assert((select count(*) from public.lots_medicaments)=3,'C01_maker_own_lots');
    r:=r||pg_temp.lot02_assert((select count(*) from public.lots_medicaments where id=other_lot)=0,'C02_maker_other_lot_hidden');
    r:=r||pg_temp.lot02_assert((select count(*) from public.utilisateurs where id=other_maker)=0,'C03_unrelated_profile_hidden');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('select telephone,adresse,email,numero_agrement from public.utilisateurs'),'C04_private_profile_columns_denied');
    r:=r||pg_temp.lot02_assert(public.get_my_profile()->>'telephone'='LOT03_PRIVATE_PHONE' and public.get_my_profile()->>'id'=maker::text,'C05_own_profile_rpc');
    r:=r||pg_temp.lot02_assert((select count(*) from public.lots_avec_fabricant)=3 and not exists(select 1 from public.lots_avec_fabricant where fabricant_tel is not null),'C06_lot_view_scoped_phone_null');
    r:=r||pg_temp.lot02_assert((select count(*) from public.stats_dashboard)=0,'C07_maker_no_global_stats');
    r:=r||pg_temp.lot02_assert(exists(select 1 from public.transferts t join public.utilisateurs u on u.id=t.destinataire_id where t.lot_id=own_lot and u.nom_entite='LOT03_TEST_PHARMACY'),'C08_transfer_partner_embedding');
    perform public.record_verification_scan(code);
    r:=r||pg_temp.lot02_assert((select count(*) from public.historique_scans)=1,'C09_maker_only_own_scan');
    reset role;

    perform set_config('request.jwt.claim.sub',pharmacy::text,true);
    set local role authenticated;
    r:=r||pg_temp.lot02_assert((select count(*) from public.lots_medicaments)=1,'D01_pharmacy_transferred_lot_only');
    r:=r||pg_temp.lot02_assert((select count(*) from public.get_manufacturer_catalog(maker))=1,'D02_catalog_projection');
    r:=r||pg_temp.lot02_assert((select count(*) from public.historique_scans)=0,'D03_other_scans_hidden');
    r:=r||pg_temp.lot02_assert(exists(select 1 from public.demandes_stock d join public.utilisateurs u on u.id=d.fabricant_id where d.pharmacie_id=pharmacy and u.nom_entite='LOT03_TEST_MAKER'),'D04_request_partner_embedding');
    r:=r||pg_temp.lot02_assert((select count(*) from public.stats_dashboard)=0,'D05_pharmacy_no_global_stats');
    perform public.record_verification_scan(code);
    select to_jsonb(s) into observed from public.historique_scans s where s.hash_scanne=code;
    r:=r||pg_temp.lot02_assert(observed->>'scanneur_id'=pharmacy::text and observed->>'type_scanneur'='pharmacien' and observed->>'resultat'='authentique','D06_db_computes_identity_and_verdict');
    perform public.record_verification_scan(expired_code);
    r:=r||pg_temp.lot02_assert(exists(select 1 from public.historique_scans where hash_scanne=expired_code and resultat='expire'),'D07_db_computes_expired');
    perform public.record_verification_scan(unknown_code);
    r:=r||pg_temp.lot02_assert(exists(select 1 from public.historique_scans where hash_scanne=unknown_code and resultat='non_trouve' and lot_id is null),'D08_db_computes_absence');
    r:=r||pg_temp.lot02_assert(exists(select 1 from public.alertes where created_by=pharmacy and niveau='info' and description='Code absent du registre : '||unknown_code),'D09_controlled_alert');
    r:=r||pg_temp.lot02_assert(pg_temp.lot03_expect(format('select public.record_verification_scan(%L)',archived_code),'22023'),'D10_archived_not_trusted_journal');
    r:=r||pg_temp.lot02_assert((select etat from public.verify_public_lot(archived_code))='archive','D11_archived_public_state');
    r:=r||pg_temp.lot02_assert(pg_temp.lot02_denied('insert into public.historique_scans(hash_scanne,type_scanneur,resultat) values(''LOT03_TEST_FORGED'',''agent_dph'',''authentique'')'),'D12_authenticated_direct_scan_denied');
    reset role;

    perform set_config('request.jwt.claim.sub',dph::text,true);
    set local role authenticated;
    r:=r||pg_temp.lot02_assert(exists(select 1 from public.lots_medicaments where id=other_lot),'E01_dph_lot_supervision');
    r:=r||pg_temp.lot02_assert((select count(*) from public.historique_scans where hash_scanne in(code,expired_code,unknown_code))=4,'E02_dph_scan_supervision');
    r:=r||pg_temp.lot02_assert(exists(select 1 from public.alertes where description='Code absent du registre : '||unknown_code),'E03_dph_alert_supervision');
    r:=r||pg_temp.lot02_assert((select count(*) from public.stats_dashboard)=1,'E04_dph_stats_only');
    r:=r||pg_temp.lot02_assert(exists(select 1 from public.lots_avec_fabricant where id=other_lot),'E05_dph_lot_view');
    reset role;

    r:=r||pg_temp.lot02_assert((select count(*) from pg_class where oid in('public.lots_avec_fabricant'::regclass,'public.stats_dashboard'::regclass) and reloptions@>array['security_invoker=true'])=2,'F01_both_views_invoker');
    r:=r||pg_temp.lot02_assert(not exists(select 1 from pg_proc where oid in('public.verify_public_lot(text)'::regprocedure,'public.get_my_profile()'::regprocedure,'public.get_manufacturer_catalog(uuid)'::regprocedure,'public.record_verification_scan(text)'::regprocedure) and not coalesce(proconfig@>array['search_path=""'],false)),'F02_fixed_function_search_paths');
    -- Deliberately create an ambiguity across the unique number and hash namespaces.
    update public.lots_medicaments set numero_lot=repeat('a',32)||replace(own_lot::text,'-','') where id=other_lot;
    r:=r||pg_temp.lot02_assert(pg_temp.lot03_expect(format('select * from public.verify_public_lot(%L)',repeat('a',32)||replace(own_lot::text,'-','')),'21000'),'F03_ambiguity_not_first_match');
    raise exception using errcode='ZL003',message='rollback LOT03 fixtures';
  exception when sqlstate 'ZL003' then null;
  end;
  return jsonb_build_object('tests',r,'count',jsonb_array_length(r),'fixture_changes','rolled back');
end;
$tests$;
