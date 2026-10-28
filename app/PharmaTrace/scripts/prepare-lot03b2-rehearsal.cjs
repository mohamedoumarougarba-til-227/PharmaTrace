// Emits SQL only. Candidate DDL and all fixture changes roll back before returning.
// --candidate rehearses the guarded pending file in a rollback-only subtransaction.
// --installed validates an already applied B2 without reapplying any DDL.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const mode = process.argv.slice(2);
if (mode.length !== 1 || !['--candidate', '--installed'].includes(mode[0])) {
  throw new Error('Choose --candidate or --installed; this script does not connect to DB.');
}
let candidate = '';
if (mode[0] === '--candidate') {
  const dir = path.join(root, 'supabase/pending');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('_restrict_legacy_verification_access.sql'));
  if (files.length > 1) throw new Error('Multiple guarded B2 candidates');
  const source = files.length ? path.join(dir, files[0])
    : path.resolve(root, '../../docs/archive/lot-03b2-guarded-preflight.sql');
  const draft = fs.readFileSync(source, 'utf8');
  if (!draft.includes('B2_DRAFT_REQUIRES_REHEARSAL')) throw new Error('Candidate guard not found');
  const start = draft.indexOf('-- No historical rows are changed.');
  if (start < 0) throw new Error('Candidate body marker not found');
  candidate = draft.slice(start).replace(/\bcommit;\s*$/, '');
}
const p02 = read('supabase/tests/p02_roles.sql').replace(/select pg_temp\.lot02_roles\(\) as role_tests;\s*$/, '');
const b2 = read('supabase/tests/p03b2_legacy_compat.sql');
process.stdout.write(`${p02}\n${b2}
create or replace function pg_temp.lot03b2_rehearse() returns jsonb language plpgsql as $outer$
declare result jsonb;
begin
  perform set_config('lock_timeout','2s',true);
  begin
    ${candidate ? `execute $candidate$${candidate}$candidate$;` : '-- No candidate DDL: B2 is already installed.'}
    result := jsonb_build_object('p02',pg_temp.lot02_roles(),'b2',pg_temp.lot03b2_public_contract());
    raise exception using errcode='ZB002',message='rollback B2 rehearsal';
  exception when sqlstate 'ZB002' then null;
  end;
  return result;
end; $outer$;
select pg_temp.lot03b2_rehearse() as rehearsal;
`);
