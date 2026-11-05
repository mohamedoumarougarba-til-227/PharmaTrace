// Prints SQL ONLY. For an EMPTY Supabase database; never use on the existing MVP.
// Unlike raw `supabase db push`, includes the documented historical prerequisite.
const steps = require('./fresh-migration-plan.cjs')();
process.stdout.write(`-- EMPTY DATABASE ONLY. Review before executing as postgres.
begin;
do $guard$ begin
  if to_regclass('public.utilisateurs') is not null or exists(select 1 from auth.users) then
    raise exception 'Fresh installer requires an empty PharmaTrace/Auth database';
  end if;
end; $guard$;
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, statements text[], name text
);
`);
for (const step of steps) {
  process.stdout.write(`\n-- ${step.file}\n${step.sql}\n`);
  const match = step.file.match(/^(\d+)_(.+)\.sql$/);
  if (match) process.stdout.write(`insert into supabase_migrations.schema_migrations(version,name)
values('${match[1]}','${match[2]}');\n`);
}
process.stdout.write('commit;\n');
