-- CANDIDATE: rehearse with rollback; deploy the RPC client before enabling this
-- restrictive cutover. No historical row is repaired or reinterpreted here.
-- A lot's quantity is the manufacturer's available stock. Pending transfers
-- reserve units; received transfers represent pharmacy custody (no sales ledger).

alter table public.transferts add column decided_by uuid references public.utilisateurs(id),
  add column decided_at timestamptz;
alter table public.demandes_stock add column decided_by uuid references public.utilisateurs(id),
  add column decided_at timestamptz;

create table private.business_operations (
  caller_id uuid not null references public.utilisateurs(id),
  operation_key uuid not null,
  kind text not null,
  payload jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (caller_id, operation_key)
);
alter table private.business_operations enable row level security;
revoke all on private.business_operations from public, anon, authenticated, service_role;

create function private.begin_business_operation(p_key uuid, p_kind text, p_payload jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare op private.business_operations;
begin
  if p_key is null then raise exception 'Operation key required' using errcode='22023'; end if;
  insert into private.business_operations(caller_id,operation_key,kind,payload)
  values(auth.uid(),p_key,p_kind,p_payload) on conflict do nothing;
  -- ON CONFLICT waits for a competing transaction with the same intent.
  select * into strict op from private.business_operations
    where caller_id=auth.uid() and operation_key=p_key for update;
  if op.kind<>p_kind or op.payload<>p_payload then
    raise exception 'Operation key reused with different input' using errcode='22023';
  end if;
  return op.result;
end; $$;

create function private.workflow_quantity(p_value jsonb)
returns integer language plpgsql immutable set search_path='' as $$
begin
  if jsonb_typeof(p_value) is distinct from 'number'
     or p_value::text !~ '^[1-9][0-9]{0,9}$'
     or p_value::text::bigint>2147483647 then
    raise exception 'Positive int32 quantity required' using errcode='22023';
  end if;
  return p_value::text::integer;
end; $$;

create function private.check_lot_balance(p_lot uuid)
returns void language plpgsql set search_path='' as $$
begin
  -- Caller must hold the lot row lock. Fail closed for unreconciled legacy stock.
  if exists(select 1 from public.lots_medicaments l where l.id=p_lot
    and l.quantite_initiale::bigint <> l.quantite_actuelle::bigint +
      (select coalesce(sum(t.quantite_transferee),0) from public.transferts t
       where t.lot_id=l.id and t.statut in ('en_attente','receptionne'))) then
    raise exception 'Legacy stock requires operator reconciliation' using errcode='23514';
  end if;
end; $$;

create function private.refresh_lot_state(p_lot uuid)
returns void language sql set search_path='' as $$
  update public.lots_medicaments l set statut_actuel=case
    when l.is_archived or l.statut_actuel='archive' then 'archive'::public.statut_lot
    when l.quantite_actuelle>0 then 'en_stock_fabricant'::public.statut_lot
    when exists(select 1 from public.transferts t where t.lot_id=l.id and t.statut='en_attente')
      then 'en_transit'::public.statut_lot
    else 'en_pharmacie'::public.statut_lot end
  where l.id=p_lot;
$$;

create function private.guard_business_write()
returns trigger language plpgsql set search_path='' as $$
begin
  -- Even a service_role REST request cannot silently bypass the workflow.
  -- postgres is the explicit trusted operator and the owner of guarded RPCs.
  if current_user<>'postgres' then
    raise exception 'Use a controlled business RPC' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
create trigger controlled_transfer_write before insert or update or delete on public.transferts
  for each row execute function private.guard_business_write();
create trigger controlled_request_write before insert or update or delete on public.demandes_stock
  for each row execute function private.guard_business_write();
create trigger controlled_lot_update before update or delete on public.lots_medicaments
  for each row execute function private.guard_business_write();

create function private.validate_new_lot()
returns trigger language plpgsql set search_path='' as $$
begin
  if current_user='postgres' then return new; end if; -- explicit operator/import path
  if public.get_my_role() is distinct from 'fabricant' or new.fabricant_id is distinct from auth.uid() then
    raise exception 'Validated owning manufacturer required' using errcode='42501'; end if;
  if new.quantite_actuelle<>new.quantite_initiale or new.statut_actuel<>'en_stock_fabricant'
     or new.is_archived or new.archived_at is not null or new.archived_reason is not null then
    raise exception 'A new lot must start entirely at its manufacturer' using errcode='22023';
  end if;
  if current_user<>'postgres' then
    new.created_at:=now(); new.updated_at:=now();
  end if;
  return new;
end; $$;
create trigger validate_initial_lot before insert on public.lots_medicaments
  for each row execute function private.validate_new_lot();

create unique index demandes_one_transfer on public.demandes_stock(transfert_id)
  where transfert_id is not null;

create function public.create_stock_requests(p_key uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare item jsonb; result jsonb; ids jsonb:='[]'; new_id uuid; maker uuid; qty integer;
begin
  if public.get_my_role() is distinct from 'pharmacie' then
    raise exception 'Validated pharmacy required' using errcode='42501'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Request array required' using errcode='22023'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then
    raise exception '1 to 50 requests required' using errcode='22023'; end if;
  result:=private.begin_business_operation(p_key,'requests',p_items);
  if result is not null then return result; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) is distinct from 'object' or
       item - array['fabricant_id','nom_medicament','dosage','forme_galenique','quantite','note'] <> '{}'::jsonb then
      raise exception 'Unexpected request fields' using errcode='22023'; end if;
    maker:=(item->>'fabricant_id')::uuid; qty:=private.workflow_quantity(item->'quantite');
    if not exists(select 1 from public.utilisateurs u where u.id=maker and u.role='fabricant'
      and u.statut='actif' and u.role_provisioned_at is not null) then
      raise exception 'Validated manufacturer required' using errcode='42501'; end if;
    -- A request is an expression of demand, including the existing manual-entry
    -- flow. It grants no lot access. Exact product/lot matching happens at delivery.
    if jsonb_typeof(item->'nom_medicament') is distinct from 'string'
      or nullif(btrim(item->>'nom_medicament'),'') is null
      or length(item->>'nom_medicament')>255
      or jsonb_typeof(item->'dosage') is distinct from 'string'
      or length(item->>'dosage')>100 or length(coalesce(item->>'forme_galenique',''))>100
      or length(coalesce(item->>'note',''))>2000 then
      raise exception 'Invalid request product or note' using errcode='22023'; end if;
    insert into public.demandes_stock(pharmacie_id,fabricant_id,nom_medicament,dosage,
      forme_galenique,quantite_demandee,notes_pharmacie,groupe_id)
    values(auth.uid(),maker,item->>'nom_medicament',coalesce(item->>'dosage',''),
      item->>'forme_galenique',qty,item->>'note',p_key) returning id into new_id;
    ids:=ids||jsonb_build_array(new_id);
  end loop;
  result:=jsonb_build_object('ids',ids);
  update private.business_operations o set result=jsonb_build_object('ids',ids)
    where o.caller_id=auth.uid() and o.operation_key=p_key;
  return result;
end; $$;

create function public.create_lot_transfers(p_key uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare item jsonb; l public.lots_medicaments; d public.demandes_stock; lot_uuid uuid;
  dest uuid; req uuid; qty integer; new_id uuid; ids jsonb:='[]'; previous jsonb;
begin
  if public.get_my_role() is distinct from 'fabricant' then
    raise exception 'Validated manufacturer required' using errcode='42501'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Transfer array required' using errcode='22023'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then
    raise exception '1 to 50 transfers required' using errcode='22023'; end if;
  previous:=private.begin_business_operation(p_key,'transfers',p_items);
  if previous is not null then return previous; end if;
  -- Common lock order for all workflows: sorted lots, then sorted requests.
  perform 1 from public.lots_medicaments where id in
    (select (value->>'lot_id')::uuid from jsonb_array_elements(p_items)) order by id for update;
  perform 1 from public.demandes_stock where id in
    (select (value->>'demande_id')::uuid from jsonb_array_elements(p_items)) order by id for update;
  if exists(select 1 from jsonb_array_elements(p_items) x where x->>'demande_id' is not null
    group by x->>'demande_id' having count(*)>1) then
    raise exception 'Duplicate request' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) is distinct from 'object' or
      item - array['lot_id','destinataire_id','quantite','note','demande_id'] <> '{}'::jsonb then
      raise exception 'Unexpected transfer fields' using errcode='22023'; end if;
    lot_uuid:=(item->>'lot_id')::uuid; dest:=(item->>'destinataire_id')::uuid;
    req:=(item->>'demande_id')::uuid; qty:=private.workflow_quantity(item->'quantite');
    select * into l from public.lots_medicaments where id=lot_uuid;
    if not found or l.fabricant_id<>auth.uid() then
      raise exception 'Owned lot required' using errcode='42501'; end if;
    perform private.check_lot_balance(l.id);
    if l.is_archived or l.statut_actuel='archive' or l.date_expiration<current_date
      or l.quantite_actuelle<qty or length(coalesce(item->>'note',''))>2000 then
      raise exception 'Lot unavailable or insufficient stock' using errcode='22023'; end if;
    if dest=auth.uid() or not exists(select 1 from public.utilisateurs u where u.id=dest
      and u.role='pharmacie' and u.statut='actif' and u.role_provisioned_at is not null) then
      raise exception 'Validated destination pharmacy required' using errcode='42501'; end if;
    if req is not null then
      select * into d from public.demandes_stock where id=req;
      if not found or d.fabricant_id<>auth.uid() or d.pharmacie_id<>dest or d.statut<>'en_attente'
        or d.transfert_id is not null or d.nom_medicament<>l.nom_medicament
        or coalesce(d.dosage,'')<>coalesce(l.dosage,'')
        or coalesce(d.forme_galenique,'')<>coalesce(l.forme_galenique,'')
        or qty>d.quantite_demandee then
        raise exception 'Request does not match pending delivery' using errcode='22023'; end if;
    end if;
    insert into public.transferts(lot_id,expediteur_id,destinataire_id,quantite_transferee,notes_expediteur)
    values(l.id,auth.uid(),dest,qty,item->>'note') returning id into new_id;
    update public.lots_medicaments set quantite_actuelle=quantite_actuelle-qty where id=l.id;
    if req is not null then
      update public.demandes_stock set statut='satisfait',transfert_id=new_id,decided_by=auth.uid(),decided_at=now(),
        notes_fabricant=format('Expédition de %s sur %s unités demandées',qty,d.quantite_demandee) where id=req;
    end if;
    perform private.refresh_lot_state(l.id);
    perform private.check_lot_balance(l.id);
    ids:=ids||jsonb_build_array(new_id);
  end loop;
  update private.business_operations o set result=jsonb_build_object('ids',ids)
    where o.caller_id=auth.uid() and o.operation_key=p_key;
  return jsonb_build_object('ids',ids);
end; $$;

create function public.decide_stock_requests(p_ids uuid[],p_decision text,p_note text default null)
returns integer language plpgsql security definer set search_path='' as $$
declare d public.demandes_stock; caller_role text:=public.get_my_role(); n integer:=0;
begin
  if caller_role is null or p_decision is null or not ((caller_role='fabricant' and p_decision='refuse')
    or (caller_role='pharmacie' and p_decision='annule')) then
    raise exception 'Request decision forbidden' using errcode='42501'; end if;
  if p_ids is null or coalesce(cardinality(p_ids),0) not between 1 and 50
    or array_position(p_ids,null) is not null or length(coalesce(p_note,''))>2000
    or (p_decision='refuse' and nullif(btrim(p_note),'') is null) then
    raise exception 'Invalid request decision' using errcode='22023'; end if;
  if (select count(distinct x) from unnest(p_ids) x)<>cardinality(p_ids) then
    raise exception 'Duplicate request IDs' using errcode='22023'; end if;
  for d in select * from public.demandes_stock where id=any(p_ids) order by id for update loop
    if (caller_role='fabricant' and d.fabricant_id<>auth.uid())
      or (caller_role='pharmacie' and d.pharmacie_id<>auth.uid()) then
      raise exception 'Own request required' using errcode='42501'; end if;
    if d.statut::text=p_decision then n:=n+1; continue; end if;
    if d.statut<>'en_attente' then
      raise exception 'Request already decided' using errcode='22023'; end if;
    update public.demandes_stock set statut=p_decision::public.statut_demande,decided_by=auth.uid(),decided_at=now(),
      notes_fabricant=case when caller_role='fabricant' then p_note else notes_fabricant end where id=d.id;
    n:=n+1;
  end loop;
  if n<>cardinality(p_ids) then raise exception 'Request not found' using errcode='42501'; end if;
  return n;
end; $$;

create function public.decide_lot_transfer(p_transfer_id uuid,p_decision text,p_identifier text default null)
returns uuid language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare t public.transferts; l public.lots_medicaments; lot_uuid uuid;
  caller_role text:=public.get_my_role();
begin
  if caller_role is null or p_decision is null or not
    ((caller_role='fabricant' and p_decision='annule') or
     (caller_role='pharmacie' and p_decision in ('refuse','receptionne'))) then
    raise exception 'Transfer decision forbidden' using errcode='42501'; end if;
  select lot_id into lot_uuid from public.transferts where id=p_transfer_id;
  select * into l from public.lots_medicaments where id=lot_uuid for update;
  perform 1 from public.demandes_stock where transfert_id=p_transfer_id order by id for update;
  select * into t from public.transferts where id=p_transfer_id for update;
  if not found or t.expediteur_id<>l.fabricant_id or
    (caller_role='fabricant' and t.expediteur_id<>auth.uid()) or
    (caller_role='pharmacie' and t.destinataire_id<>auth.uid()) then
    raise exception 'Authorized transfer party required' using errcode='42501'; end if;
  if p_decision='receptionne' and (p_identifier is null
    or p_identifier !~ '^[A-Za-z0-9_-]{1,100}$'
    or (p_identifier<>l.numero_lot and p_identifier<>l.hash_sha256)) then
    raise exception 'Scanned identifier does not match transfer' using errcode='22023'; end if;
  if t.statut::text=p_decision then return t.id; end if; -- retry without stock effect
  if t.statut<>'en_attente' then
    raise exception 'Transfer already decided' using errcode='22023'; end if;
  perform private.check_lot_balance(l.id);
  if p_decision='receptionne' and (l.is_archived or l.statut_actuel='archive' or l.date_expiration<current_date) then
    raise exception 'Expired or archived lot cannot be received' using errcode='22023'; end if;
  update public.transferts set statut=p_decision::public.statut_transfert,decided_by=auth.uid(),decided_at=now(),
    date_reception=case when p_decision='receptionne' then now() else null end,
    notes_expediteur=case when p_decision='annule' then 'Annulé par le fabricant' else notes_expediteur end,
    notes_destinataire=case when p_decision='refuse' then 'Refusé par la pharmacie'
      when p_decision='receptionne' then 'Réception confirmée par code' else notes_destinataire end
    where id=t.id;
  if p_decision in ('annule','refuse') then
    update public.lots_medicaments set quantite_actuelle=quantite_actuelle+t.quantite_transferee where id=l.id;
    update public.demandes_stock set statut=p_decision::public.statut_demande,decided_by=auth.uid(),decided_at=now(),
      notes_fabricant='Expédition annulée ou refusée ; stock restitué' where transfert_id=t.id and statut='satisfait';
  end if;
  perform private.refresh_lot_state(l.id);
  perform private.check_lot_balance(l.id);
  return t.id;
end; $$;

-- PostgreSQL already contains annule on the MVP; fresh installations need it too.
alter type public.statut_transfert add value if not exists 'annule';

drop policy if exists "transferts: fabricant crée" on public.transferts;
drop policy if exists "transferts: expediteur met à jour (annuler)" on public.transferts;
drop policy if exists "transferts: pharmacie met à jour (réceptionner/refuser)" on public.transferts;
drop policy if exists "demandes: pharmacie insère ses demandes" on public.demandes_stock;
drop policy if exists "demandes: fabricant met à jour (repondre/refuser)" on public.demandes_stock;
drop policy if exists "demandes: pharmacie met à jour (annulation)" on public.demandes_stock;
drop policy if exists "lots: fabricant modifie ses lots" on public.lots_medicaments;
alter policy "transferts: voir ses transferts" on public.transferts
  using ((select public.get_my_role())='agent_dph' or
    ((select public.get_my_role()) is not null and (expediteur_id=auth.uid() or destinataire_id=auth.uid())));
alter policy "demandes: voir ses propres demandes" on public.demandes_stock
  using ((select public.get_my_role())='agent_dph' or
    ((select public.get_my_role()) is not null and (pharmacie_id=auth.uid() or fabricant_id=auth.uid())));
revoke insert,update,delete,truncate,references,trigger on public.transferts,public.demandes_stock
  from anon,authenticated,service_role;
revoke update,delete,truncate,references,trigger on public.lots_medicaments from anon,authenticated,service_role;

revoke all on function private.begin_business_operation(uuid,text,jsonb),private.workflow_quantity(jsonb),
  private.check_lot_balance(uuid),private.refresh_lot_state(uuid),private.guard_business_write(),private.validate_new_lot()
  from public,anon,authenticated,service_role;
revoke all on function public.create_stock_requests(uuid,jsonb),public.create_lot_transfers(uuid,jsonb),
  public.decide_stock_requests(uuid[],text,text),public.decide_lot_transfer(uuid,text,text)
  from public,anon,authenticated,service_role;
grant execute on function public.create_stock_requests(uuid,jsonb),public.create_lot_transfers(uuid,jsonb),
  public.decide_stock_requests(uuid[],text,text),public.decide_lot_transfer(uuid,text,text) to authenticated;
