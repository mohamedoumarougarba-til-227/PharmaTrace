-- LOT 0.2: managed business roles. Existing rows are preserved, not auto-approved.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

alter table public.utilisateurs add column role_provisioned_at timestamptz;
alter table public.utilisateurs alter column role drop default;
comment on column public.utilisateurs.role_provisioned_at is
  'Operator validation of the business role; NULL means no business authorization.';

create table private.role_provisioning_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  changed_at timestamptz not null default clock_timestamp(),
  operator_role text not null,
  operator_uid uuid,
  reason text not null check (length(btrim(reason)) > 0),
  old_authority jsonb,
  new_authority jsonb not null
);
alter table private.role_provisioning_audit enable row level security;
revoke all on private.role_provisioning_audit from public, anon, authenticated, service_role;
revoke all on sequence private.role_provisioning_audit_id_seq from public, anon, authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger language plpgsql security invoker set search_path = '' as $function$
begin
  -- Auth signup does not create a business profile or consume a metadata role.
  return new;
end;
$function$;
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

create or replace function public.get_my_role()
returns text language sql stable security definer set search_path = '' as $function$
  select u.role::text
  from public.utilisateurs u
  where auth.uid() is not null
    and u.id = auth.uid()
    and u.role_provisioned_at is not null
    and u.statut = 'actif'
$function$;
revoke all on function public.get_my_role() from public, anon, authenticated, service_role;
-- Required by existing RLS policies, including anonymous reads. No arbitrary user-id argument.
grant execute on function public.get_my_role() to anon, authenticated, service_role;

revoke all privileges on public.utilisateurs from public, anon, authenticated;
grant select on public.utilisateurs to anon, authenticated;
grant update (nom, prenom, telephone, adresse, ville) on public.utilisateurs to authenticated;
drop policy if exists "utilisateurs: modifier son profil" on public.utilisateurs;
create policy "utilisateurs: modifier son profil" on public.utilisateurs
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create function private.audit_profile_authority()
returns trigger language plpgsql security invoker set search_path = '' as $function$
declare
  old_values jsonb;
  new_values jsonb;
  operation_reason text;
begin
  new_values := jsonb_build_object(
    'id',new.id,'email',new.email,'role',new.role,'statut',new.statut,
    'nom_entite',new.nom_entite,'numero_agrement',new.numero_agrement,
    'pays',new.pays,'role_provisioned_at',new.role_provisioned_at);
  if tg_op = 'UPDATE' then
    old_values := jsonb_build_object(
      'id',old.id,'email',old.email,'role',old.role,'statut',old.statut,
      'nom_entite',old.nom_entite,'numero_agrement',old.numero_agrement,
      'pays',old.pays,'role_provisioned_at',old.role_provisioned_at);
    if old_values is not distinct from new_values then return new; end if;
  end if;
  operation_reason := nullif(btrim(current_setting('pharmatrace.provisioning_reason',true)),'');
  if operation_reason is null then
    raise exception 'An explicit provisioning reason is required' using errcode='22023';
  end if;
  insert into private.role_provisioning_audit(user_id,operator_role,operator_uid,reason,old_authority,new_authority)
  values(new.id,current_user,auth.uid(),operation_reason,old_values,new_values);
  return new;
end;
$function$;
revoke all on function private.audit_profile_authority() from public, anon, authenticated, service_role;
create trigger utilisateurs_authority_audit
after insert or update on public.utilisateurs
for each row execute function private.audit_profile_authority();

create function private.provision_business_profile(
  target_user_id uuid,
  business_role public.user_role,
  entity_name text,
  approval_number text,
  business_status text,
  operation_reason text
) returns void language plpgsql security invoker set search_path = '' as $function$
declare
  auth_email text;
  previous_reason text;
begin
  if current_user <> 'postgres' then
    raise exception 'Database operator required' using errcode='42501';
  end if;
  if business_role is null or nullif(btrim(entity_name),'') is null
     or business_status is null or business_status not in ('actif','archive')
     or nullif(btrim(operation_reason),'') is null then
    raise exception 'Explicit role, entity, status and reason are required' using errcode='22023';
  end if;
  select email into auth_email from auth.users where id=target_user_id for update;
  if not found or auth_email is null then
    raise exception 'Auth account not found' using errcode='22023';
  end if;
  previous_reason := current_setting('pharmatrace.provisioning_reason',true);
  perform set_config('pharmatrace.provisioning_reason',operation_reason,true);
  insert into public.utilisateurs(id,email,nom_entite,role,numero_agrement,statut,role_provisioned_at)
  values(target_user_id,auth_email,entity_name,business_role,approval_number,business_status,clock_timestamp())
  on conflict (id) do update set
    email=excluded.email,nom_entite=excluded.nom_entite,role=excluded.role,
    numero_agrement=excluded.numero_agrement,statut=excluded.statut,
    role_provisioned_at=excluded.role_provisioned_at;
  perform set_config('pharmatrace.provisioning_reason',coalesce(previous_reason,''),true);
end;
$function$;
revoke all on function private.provision_business_profile(uuid,public.user_role,text,text,text,text)
from public, anon, authenticated, service_role;
comment on function private.provision_business_profile(uuid,public.user_role,text,text,text,text) is
  'SQL operator-only provisioning/revalidation; no client RPC, no metadata authority. Audit is atomic.';
