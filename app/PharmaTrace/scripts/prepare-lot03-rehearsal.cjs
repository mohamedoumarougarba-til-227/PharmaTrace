// Generate SQL for the explicitly authorized MVP rehearsal. Does not connect to DB.
// The inner exception rolls back ALL candidate DDL/data before returning assertions.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function migration(suffix, directory = 'migrations') {
  const files = fs.readdirSync(path.join(root, 'supabase', directory));
  const matches = files.filter(file => file.endsWith(suffix));
  if (matches.length !== 1) throw new Error('Expected exactly one migration: ' + suffix);
  return read('supabase/' + directory + '/' + matches[0]);
}
const phaseA = process.argv.includes('--phase-a');
const installed = process.argv.includes('--additive-installed');
if (process.argv.slice(2).some(arg => !['--phase-a', '--additive-installed'].includes(arg))) throw new Error('Unknown rehearsal option');
const additive = installed ? '' : migration('_add_safe_verification_surfaces.sql');
// Phase B is deliberately outside migrations/: a normal db push must not apply it.
const restrictive = phaseA ? '' : migration('_restrict_legacy_verification_access.sql', 'pending');
// B1 may revise the unexecuted draft. The original 59 checks describe the archived
// permission-denied target, not the new empty-read/no-op proposal. Fail before SQL.
if (restrictive.includes('B2_DRAFT_REQUIRES_REHEARSAL')) {
  throw new Error('B2 draft is not authorized/rehearsed; use --phase-a for the installed additive contract. The old 59 restrictive assertions must be adapted before B2.');
}
const p02 = read('supabase/tests/p02_roles.sql').replace(/select pg_temp\.lot02_roles\(\) as role_tests;\s*$/, '');
const p03 = read('supabase/tests/p03_public_contract.sql');
const p03a = read('supabase/tests/p03a_additive.sql');
process.stdout.write(`${p02}\n${p03}\n${p03a}
create or replace function pg_temp.lot03_rehearse() returns jsonb language plpgsql as $outer$
declare result jsonb; legacy_before text;
begin
  perform set_config('lock_timeout','3s',true);
  begin
    legacy_before := pg_temp.lot03a_legacy_fingerprint();
    ${installed ? '-- Additive migration is already installed.' : `execute $additive$${additive}$additive$;`}
    if legacy_before is distinct from pg_temp.lot03a_legacy_fingerprint() then raise exception 'Phase A changed a legacy contract'; end if;
    result := jsonb_build_object('legacy_fingerprint_unchanged',true,'phase_a',pg_temp.lot03a_additive(),'p02_phase_a',pg_temp.lot02_roles());
    ${phaseA ? '' : `execute $restrictive$${restrictive}$restrictive$;
    result := result || jsonb_build_object('p02',pg_temp.lot02_roles(),'lot03',pg_temp.lot03_public_contract(),
      'candidate_security',jsonb_build_object(
        'views_without_invoker',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' and not coalesce(c.reloptions@>array['security_invoker=true'],false)),
        'definer_functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'config',p.proconfig)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef)));`}
    raise exception using errcode='ZL004',message='rollback LOT03 schema';
  exception when sqlstate 'ZL004' then null;
  end;
  return result;
end;
$outer$;
select pg_temp.lot03_rehearse() as rehearsal;
`);
