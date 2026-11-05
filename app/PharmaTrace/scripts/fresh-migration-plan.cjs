const fs = require('node:fs');
const path = require('node:path');

// Preserve already applied migrations. B2 assumed one manually created legacy
// policy, absent from the repository. An empty, deny-all placeholder makes its
// historical DROP replayable without restoring the former public permission.
module.exports = function freshMigrationPlan() {
  const dir = path.resolve(__dirname, '../supabase/migrations');
  return fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort().flatMap(file => {
    const migration = { file, sql: fs.readFileSync(path.join(dir, file), 'utf8') };
    if (!file.endsWith('_restrict_legacy_public_access.sql')) return [migration];
    return [{ file: 'fresh-only B2 prerequisite', sql: `
do $compat$
begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='utilisateurs'
    and policyname='utilisateurs: lecture pour les connectes') then
    create policy "utilisateurs: lecture pour les connectes" on public.utilisateurs for select using(false);
  end if;
end; $compat$;
` }, migration];
  });
};
