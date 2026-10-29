// DDL replay in isolated, NON-EXPOSED schemas, inside one rollback-only block.
// No public/private object is renamed/dropped, and no existing Auth row is changed.
const steps = require('./fresh-migration-plan.cjs')();
const files = steps.filter(step => step.file.endsWith('.sql')).map(step => step.file);
const commands = steps.map(step => {
  const sql = step.sql
    .replace(/\bpublic\./gi, 'business_replay_public.')
    .replace(/\bprivate\./gi, 'business_replay_private.')
    .replace(/\bschema (if not exists )?private\b/gi, (_, condition = '') => `schema ${condition}business_replay_private`)
    .replace(/search_path\s*=\s*public\b/gi, 'search_path = business_replay_public')
    .replace(/schemaname='public'/gi, "schemaname='business_replay_public'")
    .replace(/CREATE TRIGGER on_auth_user_created/gi, 'CREATE TRIGGER business_replay_auth_created');
  return `execute $migration$${sql}$migration$;`;
}).join('\n');
process.stdout.write(`
create or replace function pg_temp.business_fresh_replay() returns jsonb language plpgsql as $outer$
declare result jsonb;
begin
  perform set_config('lock_timeout','2s',true);
  begin
    create schema business_replay_public;
    create schema business_replay_private;
    -- Mirror the Supabase platform's table grants, then let migrations narrow them.
    grant usage on schema business_replay_public to anon,authenticated,service_role;
    alter default privileges in schema business_replay_public grant all on tables to anon,authenticated,service_role;
    perform set_config('search_path','business_replay_public,pg_catalog',true);
    ${commands}
    if not exists(select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid join pg_namespace n on n.oid=t.typnamespace
      where n.nspname='business_replay_public' and t.typname='statut_transfert' and e.enumlabel='annule') then
      raise exception 'Fresh enum missing cancellation';
    end if;
    result:=jsonb_build_object('migrations',${files.length},'files',${"'" + JSON.stringify(files) + "'"}::jsonb,
      'public_tables',(select count(*) from pg_tables where schemaname='business_replay_public'),
      'views',(select count(*) from pg_views where schemaname='business_replay_public'),
      'business_rpcs',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='business_replay_public' and p.proname in ('create_lot_transfers','create_stock_requests','decide_stock_requests','decide_lot_transfer')),
      'enum_annule',true,'fixtures','none','schema_mapping','public/private -> non-exposed replay schemas');
    raise exception using errcode='ZF004',message='rollback fresh replay';
  exception when sqlstate 'ZF004' then null;
  end;
  return result;
end; $outer$;
select pg_temp.business_fresh_replay() as fresh_replay;
`);
