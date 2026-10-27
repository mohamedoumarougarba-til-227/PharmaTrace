-- Run as postgres. Only LOT02_TEST fixtures are changed; all fixtures roll back.
create or replace function pg_temp.lot02_assert(ok boolean, test_id text)
returns jsonb language plpgsql as $assert$
begin
  if ok is distinct from true then raise exception 'LOT02 assertion failed: %',test_id; end if;
  return jsonb_build_array(jsonb_build_object('test',test_id,'passed',true));
end;
$assert$;

create or replace function pg_temp.lot02_denied(statement text)
returns boolean language plpgsql as $denied$
begin
  execute statement;
  return false;
exception when insufficient_privilege then return true;
end;
$denied$;

create or replace function pg_temp.lot02_roles()
returns jsonb language plpgsql as $tests$
declare
  agent_id uuid := gen_random_uuid();
  maker_id uuid := gen_random_uuid();
  pharmacy_id uuid := gen_random_uuid();
  pending_id uuid := gen_random_uuid();
  unvalidated_id uuid := gen_random_uuid();
  rows_changed bigint;
  observed_role text;
  results jsonb := '[]';
begin
  begin
    insert into auth.users(id,email,raw_user_meta_data) values
      (agent_id,'lot02_test_agent_'||agent_id||'@example.invalid','{"role":"agent_dph"}'),
      (maker_id,'lot02_test_maker_'||maker_id||'@example.invalid','{"role":"fabricant"}'),
      (pharmacy_id,'lot02_test_arbitrary_'||pharmacy_id||'@example.invalid','{"role":{"unexpected":"agent_dph"},"is_admin":true}'),
      (pending_id,'lot02_test_pending_'||pending_id||'@example.invalid','{}'),
      (unvalidated_id,'lot02_test_unvalidated_'||unvalidated_id||'@example.invalid','{}');
    results := results || pg_temp.lot02_assert(not exists(select 1 from public.utilisateurs where id=agent_id),'T01_metadata_agent_no_profile');
    results := results || pg_temp.lot02_assert(not exists(select 1 from public.utilisateurs where id=maker_id),'T02_metadata_maker_no_profile');
    results := results || pg_temp.lot02_assert(not exists(select 1 from public.utilisateurs where id=pharmacy_id),'T03_arbitrary_metadata_no_profile');

    perform private.provision_business_profile(maker_id,'fabricant','LOT02_TEST_FABRICANT','LOT02_TEST_AGREMENT_F','actif','LOT02_TEST provision fabricant');
    results := results || pg_temp.lot02_assert(exists(select 1 from public.utilisateurs where id=maker_id and role='fabricant' and role_provisioned_at is not null),'T08_provision_fabricant');
    perform private.provision_business_profile(pharmacy_id,'pharmacie','LOT02_TEST_PHARMACIE','LOT02_TEST_AGREMENT_P','actif','LOT02_TEST provision pharmacie');
    results := results || pg_temp.lot02_assert(exists(select 1 from public.utilisateurs where id=pharmacy_id and role='pharmacie' and role_provisioned_at is not null),'T09_provision_pharmacie');
    perform private.provision_business_profile(agent_id,'agent_dph','LOT02_TEST_DPH','LOT02_TEST_AGREMENT_D','actif','LOT02_TEST provision DPH');
    results := results || pg_temp.lot02_assert(exists(select 1 from public.utilisateurs where id=agent_id and role='agent_dph' and role_provisioned_at is not null),'T10_provision_dph');

    perform set_config('request.jwt.claim.sub',maker_id::text,true);
    set local role authenticated;
    results := results || pg_temp.lot02_assert(public.get_my_role()='fabricant','T15_effective_fabricant');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format('update public.utilisateurs set role=''agent_dph'' where id=%L',maker_id)),'T04_self_role_denied');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format('update public.utilisateurs set statut=''archive'' where id=%L',maker_id)),'T05a_status_denied');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format('update public.utilisateurs set numero_agrement=''LOT02_TEST_FORGED'' where id=%L',maker_id)),'T05b_approval_denied');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format('update public.utilisateurs set nom_entite=''LOT02_TEST_FORGED'' where id=%L',maker_id)),'T05c_entity_denied');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format('update public.utilisateurs set role_provisioned_at=now() where id=%L',maker_id)),'T05d_validation_denied');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format('update public.utilisateurs set id=%L where id=%L',gen_random_uuid(),maker_id)),'T05e_identity_denied');
    update public.utilisateurs set telephone='LOT02_TEST_PHONE',nom='LOT02_TEST_NOM',ville='LOT02_TEST_VILLE' where id=maker_id;
    get diagnostics rows_changed=row_count;
    results := results || pg_temp.lot02_assert(rows_changed=1,'T06_own_contact_updated');
    update public.utilisateurs set telephone='LOT02_TEST_FORGED' where id=pharmacy_id;
    get diagnostics rows_changed=row_count;
    results := results || pg_temp.lot02_assert(rows_changed=0,'T07_third_party_contact_denied');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format('update public.utilisateurs set role=''pharmacie'' where id=%L',maker_id)),'T12_fabricant_to_pharmacie_denied');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format('select private.provision_business_profile(%L,''agent_dph'',''LOT02_TEST_FORGED'',null,''actif'',''LOT02_TEST attacker'')',maker_id)),'T16_client_provisioning_denied');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied('select * from private.role_provisioning_audit'),'T17_private_audit_denied');
    reset role;

    perform set_config('request.jwt.claim.sub',pharmacy_id::text,true);
    set local role authenticated;
    results := results || pg_temp.lot02_assert(public.get_my_role()='pharmacie','T18_effective_pharmacie');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format('update public.utilisateurs set role=''agent_dph'' where id=%L',pharmacy_id)),'T13_pharmacie_to_dph_denied');
    reset role;

    perform set_config('request.jwt.claim.sub',agent_id::text,true);
    set local role authenticated;
    results := results || pg_temp.lot02_assert(public.get_my_role()='agent_dph','T19_effective_dph');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format('update public.utilisateurs set role=''fabricant'' where id=%L',agent_id)),'T14_dph_self_role_denied');
    reset role;

    perform set_config('request.jwt.claim.sub',pending_id::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',pending_id,'role','authenticated','user_metadata',jsonb_build_object('role','agent_dph'))::text,true);
    set local role authenticated;
    results := results || pg_temp.lot02_assert(public.get_my_role() is null,'T11a_unprovisioned_no_role');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format(
      'insert into public.lots_medicaments(numero_lot,nom_medicament,quantite_initiale,date_fabrication,date_expiration,fabricant_id,hash_sha256) values(%L,''LOT02_TEST_MEDICAMENT'',1,''2026-01-01'',''2099-01-01'',%L,%L)',
      'LOT02_TEST_'||pending_id,pending_id,replace(pending_id::text,'-','')||replace(pending_id::text,'-',''))),'T11b_unprovisioned_lot_insert_denied');
    results := results || pg_temp.lot02_assert(pg_temp.lot02_denied(format(
      'insert into public.demandes_stock(pharmacie_id,fabricant_id,nom_medicament,dosage,quantite_demandee) values(%L,%L,''LOT02_TEST_MEDICAMENT'',''1mg'',1)',
      pending_id,maker_id)),'T11c_unprovisioned_request_insert_denied');
    reset role;

    perform set_config('pharmatrace.provisioning_reason','LOT02_TEST unvalidated legacy fixture',true);
    insert into public.utilisateurs(id,email,nom_entite,role)
    values(unvalidated_id,'lot02_test_unvalidated_'||unvalidated_id||'@example.invalid','LOT02_TEST_UNVALIDATED','agent_dph');
    perform set_config('request.jwt.claim.sub',unvalidated_id::text,true);
    set local role authenticated;
    results := results || pg_temp.lot02_assert(public.get_my_role() is null,'T20_unvalidated_profile_no_role');
    reset role;

    perform private.provision_business_profile(maker_id,'fabricant','LOT02_TEST_FABRICANT','LOT02_TEST_AGREMENT_F','archive','LOT02_TEST archive access');
    perform set_config('request.jwt.claim.sub',maker_id::text,true);
    set local role authenticated;
    results := results || pg_temp.lot02_assert(public.get_my_role() is null,'T21_archived_no_role');
    reset role;
    perform set_config('request.jwt.claim.sub','',true);
    perform set_config('request.jwt.claims','{}',true);
    set local role anon;
    results := results || pg_temp.lot02_assert(public.get_my_role() is null,'T22_anonymous_no_role');
    reset role;

    results := results || pg_temp.lot02_assert(
      (select count(*) from private.role_provisioning_audit where user_id in(agent_id,maker_id,pharmacy_id,unvalidated_id))=5,
      'T23_authority_changes_audited');
    results := results || pg_temp.lot02_assert(
      not has_table_privilege('authenticated','public.utilisateurs','INSERT')
      and not has_column_privilege('authenticated','public.utilisateurs','role','UPDATE')
      and has_column_privilege('authenticated','public.utilisateurs','telephone','UPDATE'),
      'T24_column_grants');
    raise exception using errcode='ZL002',message='rollback LOT02 fixtures';
  exception when sqlstate 'ZL002' then null;
  end;
  return jsonb_build_object('tests',results,'count',jsonb_array_length(results),'fixture_changes','rolled back');
end;
$tests$;
select pg_temp.lot02_roles() as role_tests;
