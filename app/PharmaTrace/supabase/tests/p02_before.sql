-- Historical pre-fix reproduction only; do not run as a post-fix regression test.
-- Run as postgres against the authorized MVP. All fixture changes roll back.
create or replace function pg_temp.lot02_baseline()
returns jsonb language plpgsql as $test$
declare
  agent_id uuid := gen_random_uuid();
  maker_id uuid := gen_random_uuid();
  initial_role text;
  promoted_role text;
  result jsonb;
begin
  begin
    insert into auth.users(id,email,raw_user_meta_data)
    values(agent_id,'lot02_test_before_agent_'||agent_id||'@example.invalid','{"role":"agent_dph"}');
    select role::text into initial_role from public.utilisateurs where id=agent_id;
    insert into auth.users(id,email,raw_user_meta_data)
    values(maker_id,'lot02_test_before_maker_'||maker_id||'@example.invalid','{"role":"fabricant"}');
    perform set_config('request.jwt.claim.sub',maker_id::text,true);
    set local role authenticated;
    update public.utilisateurs set role='agent_dph' where id=maker_id;
    select public.get_my_role() into promoted_role;
    reset role;
    result := jsonb_build_object(
      'metadata_agent_grants_dph',initial_role='agent_dph',
      'self_update_grants_dph',promoted_role='agent_dph',
      'fixture_changes','rolled back');
    raise exception using errcode='ZL002',message='rollback LOT02 fixtures';
  exception when sqlstate 'ZL002' then null;
  end;
  return result;
end;
$test$;
select pg_temp.lot02_baseline() as baseline,
(select count(*) from auth.users) as auth_users_after_statement_snapshot;
