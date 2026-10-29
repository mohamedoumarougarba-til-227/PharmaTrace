// Emits a rollback-only SQL rehearsal; never connects or applies a migration.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const candidate = read('supabase/migrations/20261029160840_harden_atomic_business_workflows.sql');
const p02 = read('supabase/tests/p02_roles.sql').replace(/select pg_temp\.lot02_roles\(\) as role_tests;\s*$/, '');
process.stdout.write(`${p02}
${read('supabase/tests/p03b2_legacy_compat.sql')}
${read('supabase/tests/business_workflows.sql')}
create or replace function pg_temp.business_rehearse() returns jsonb language plpgsql as $outer$
declare result jsonb;
begin
  perform set_config('lock_timeout','2s',true);
  perform set_config('statement_timeout','45s',true);
  begin
    execute $candidate$${candidate}$candidate$;
    create trigger business_test_failure before update on public.demandes_stock
      for each row execute function pg_temp.business_fail_request();
    result:=jsonb_build_object('p02',pg_temp.lot02_roles(),'b2',pg_temp.lot03b2_public_contract(),'business',pg_temp.business_test());
    raise exception using errcode='ZB004',message='rollback business rehearsal';
  exception when sqlstate 'ZB004' then null;
  end;
  return result;
end; $outer$;
select pg_temp.business_rehearse() as rehearsal;
`);
