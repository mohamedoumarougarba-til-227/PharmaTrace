// Emits a rollback-only SQL rehearsal; never connects or applies a migration.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const mode = process.argv.slice(2);
if (mode.length > 1 || (mode.length && !['--candidate', '--installed'].includes(mode[0]))) {
  throw new Error('Choose --candidate or --installed; this script only emits SQL.');
}
const installed = mode[0] === '--installed';
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(file => file.endsWith('_harden_atomic_business_workflows.sql'));
if (migrations.length !== 1) throw new Error('Expected exactly one business migration');
const candidate = installed ? '' : read('supabase/migrations/' + migrations[0]);
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
    ${installed ? "if to_regprocedure('public.create_lot_transfers(uuid,jsonb)') is null then raise exception 'Business migration not installed'; end if;" : `execute $candidate$${candidate}$candidate$;`}
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
