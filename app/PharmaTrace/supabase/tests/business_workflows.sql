-- Execute only through prepare-business-rehearsal.cjs. All fixtures and DDL roll back.
create or replace function pg_temp.business_call(actor uuid, statement text, db_role text default 'authenticated')
returns jsonb language plpgsql as $$
declare observed jsonb;
begin
  perform set_config('request.jwt.claim.sub',coalesce(actor::text,''),true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role',db_role)::text,true);
  execute format('set local role %I',db_role);
  execute statement into observed;
  reset role;
  return jsonb_build_object('ok',true,'value',observed);
exception when others then
  return jsonb_build_object('ok',false,'code',sqlstate,'message',sqlerrm);
end; $$;

create or replace function pg_temp.business_test()
returns jsonb language plpgsql as $$
declare
  maker uuid:=gen_random_uuid(); other_maker uuid:=gen_random_uuid(); pharmacy uuid:=gen_random_uuid();
  other_pharmacy uuid:=gen_random_uuid(); pending uuid:=gen_random_uuid(); dph uuid:=gen_random_uuid(); inactive uuid:=gen_random_uuid();
  own_lot uuid:=gen_random_uuid(); foreign_lot uuid:=gen_random_uuid(); expired_lot uuid:=gen_random_uuid();
  archived_lot uuid:=gen_random_uuid(); broken_lot uuid:=gen_random_uuid(); today_lot uuid:=gen_random_uuid();
  key1 uuid:=gen_random_uuid(); key2 uuid:=gen_random_uuid(); request_id uuid; transfer_id uuid; second_id uuid;
  payload jsonb; altered jsonb; request_payload jsonb; observed jsonb; original jsonb;
  actor uuid; decision text; from_state text; bad jsonb; sql text; r jsonb:='[]'; n integer; failure_id uuid;
begin
  insert into auth.users(id,email) select x,'business_test_'||x||'@example.invalid'
    from unnest(array[maker,other_maker,pharmacy,other_pharmacy,pending,dph,inactive]) x;
  perform private.provision_business_profile(maker,'fabricant','BUSINESS_TEST_MAKER',null,'actif','BUSINESS_TEST');
  perform private.provision_business_profile(other_maker,'fabricant','BUSINESS_TEST_OTHER',null,'actif','BUSINESS_TEST');
  perform private.provision_business_profile(pharmacy,'pharmacie','BUSINESS_TEST_PHARMACY',null,'actif','BUSINESS_TEST');
  perform private.provision_business_profile(other_pharmacy,'pharmacie','BUSINESS_TEST_OTHER_PHARMACY',null,'actif','BUSINESS_TEST');
  perform private.provision_business_profile(dph,'agent_dph','BUSINESS_TEST_DPH',null,'actif','BUSINESS_TEST');
  perform private.provision_business_profile(inactive,'pharmacie','BUSINESS_TEST_INACTIVE',null,'archive','BUSINESS_TEST');
  insert into public.lots_medicaments(id,numero_lot,nom_medicament,dosage,forme_galenique,quantite_initiale,quantite_actuelle,
    date_fabrication,date_expiration,fabricant_id,hash_sha256)
  select x,'BUSINESS_TEST_'||replace(x::text,'-',''),'BUSINESS_TEST_MED','500mg','Comprime',100,100,'2000-01-01',
    case when x=expired_lot then '2001-01-01'::date when x=today_lot then current_date else '2099-01-01'::date end,
    case when x=foreign_lot then other_maker else maker end,repeat('a',32)||replace(x::text,'-','')
  from unnest(array[own_lot,foreign_lot,expired_lot,archived_lot,broken_lot,today_lot]) x;
  update public.lots_medicaments set is_archived=true where id=archived_lot;
  update public.lots_medicaments set quantite_actuelle=90 where id=broken_lot;
  payload:=jsonb_build_array(jsonb_build_object('lot_id',own_lot,'destinataire_id',pharmacy,'quantite',10));

  -- Actual roles/grants/RLS, not a simulated JavaScript authorization matrix.
  foreach actor in array array[pharmacy,dph,pending,inactive] loop
    observed:=pg_temp.business_call(actor,format('select public.create_lot_transfers(%L,%L)',gen_random_uuid(),payload));
    r:=r||pg_temp.lot02_assert(observed->>'code'='42501','create_transfer_wrong_role_'||actor);
  end loop;
  observed:=pg_temp.business_call(null,format('select public.create_lot_transfers(%L,%L)',key1,payload),'anon');
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501','anon_RPC_denied');
  observed:=pg_temp.business_call(other_maker,format('select public.create_lot_transfers(%L,%L)',key1,payload));
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501','foreign_lot_transfer_denied');
  foreach actor in array array[maker,other_maker,inactive] loop
    altered:=jsonb_set(payload,'{0,destinataire_id}',to_jsonb(actor));
    observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',gen_random_uuid(),altered));
    r:=r||pg_temp.lot02_assert(observed->>'code'='42501','invalid_destination_'||actor);
  end loop;
  for bad in select x from jsonb_array_elements('[0,-1,1.5,2147483648,"2",null]') x loop
    altered:=jsonb_set(payload,'{0,quantite}',bad);
    observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',gen_random_uuid(),altered));
    r:=r||pg_temp.lot02_assert(observed->>'code'='22023','invalid_quantity_'||bad::text);
  end loop;
  foreach actor in array array[expired_lot,archived_lot,broken_lot] loop
    altered:=jsonb_set(payload,'{0,lot_id}',to_jsonb(actor));
    observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',gen_random_uuid(),altered));
    r:=r||pg_temp.lot02_assert(observed->>'code'=case when actor=broken_lot then '23514' else '22023' end,'unavailable_lot_'||actor);
  end loop;
  foreach decision in array array['expediteur_id','statut','date_reception','id'] loop
    altered:=jsonb_build_array((payload->0)||jsonb_build_object(decision,'forged'));
    observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',gen_random_uuid(),altered));
    r:=r||pg_temp.lot02_assert(observed->>'code'='22023','forged_transfer_'||decision);
  end loop;
  altered:=jsonb_set(payload,'{0,quantite}','60'); altered:=altered||altered;
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',key1,altered));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023'
    and (select quantite_actuelle=100 from public.lots_medicaments where id=own_lot)
    and not exists(select 1 from public.transferts where lot_id=own_lot)
    and not exists(select 1 from private.business_operations where caller_id=maker),'batch_oversell_rolls_back_every_write');

  request_payload:=jsonb_build_array(jsonb_build_object('fabricant_id',maker,'nom_medicament','BUSINESS_TEST_MED',
    'dosage','500mg','forme_galenique','Comprime','quantite',20));
  foreach actor in array array[maker,dph,pending] loop
    observed:=pg_temp.business_call(actor,format('select public.create_stock_requests(%L,%L)',key2,request_payload));
    r:=r||pg_temp.lot02_assert(observed->>'code'='42501','request_wrong_actor_'||actor);
  end loop;
  observed:=pg_temp.business_call(pharmacy,format('select public.create_stock_requests(%L,%L)',key2,request_payload));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean,'request_created');
  request_id:=(observed#>>'{value,ids,0}')::uuid; original:=observed;
  observed:=pg_temp.business_call(pharmacy,format('select public.create_stock_requests(%L,%L)',key2,request_payload));
  r:=r||pg_temp.lot02_assert(observed=original,'request_retry_same_id');
  altered:=jsonb_set(request_payload,'{0,quantite}','21');
  observed:=pg_temp.business_call(pharmacy,format('select public.create_stock_requests(%L,%L)',key2,altered));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','request_key_payload_mismatch');
  altered:=jsonb_build_array((request_payload->0)||jsonb_build_object('statut','satisfait','pharmacie_id',other_pharmacy));
  observed:=pg_temp.business_call(pharmacy,format('select public.create_stock_requests(%L,%L)',gen_random_uuid(),altered));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','request_forged_identity_status');
  altered:=jsonb_set(request_payload,'{0,fabricant_id}',to_jsonb(pharmacy));
  observed:=pg_temp.business_call(pharmacy,format('select public.create_stock_requests(%L,%L)',gen_random_uuid(),altered));
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501','request_wrong_target_role');

  payload:=jsonb_build_array((payload->0)||jsonb_build_object('demande_id',request_id));
  altered:=jsonb_set(payload,'{0,destinataire_id}',to_jsonb(other_pharmacy));
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',key1,altered));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','request_wrong_destination');
  altered:=jsonb_set(payload,'{0,quantite}','21');
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',key1,altered));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','request_quantity_exceeded');
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',key1,payload));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean,'transfer_created');
  transfer_id:=(observed#>>'{value,ids,0}')::uuid; original:=observed;
  r:=r||pg_temp.lot02_assert((select quantite_actuelle=90 from public.lots_medicaments where id=own_lot)
    and exists(select 1 from public.demandes_stock where id=request_id and statut='satisfait' and transfert_id=transfer_id),'stock_and_request_atomic_success');
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',key1,payload));
  r:=r||pg_temp.lot02_assert(observed=original and (select quantite_actuelle=90 from public.lots_medicaments where id=own_lot),'transfer_retry_no_double_debit');
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',gen_random_uuid(),payload));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','duplicate_request_delivery_denied');
  altered:=payload||payload;
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',gen_random_uuid(),altered));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','duplicate_request_in_batch_denied');

  -- SELECT isolation includes authenticated accounts without an effective role.
  foreach actor in array array[pending,other_pharmacy,other_maker] loop
    observed:=pg_temp.business_call(actor,format('select to_jsonb(count(*)) from public.transferts where id=%L',transfer_id));
    r:=r||pg_temp.lot02_assert(observed->>'value'='0','cross_party_transfer_read_'||actor);
  end loop;
  observed:=pg_temp.business_call(other_maker,format('select to_jsonb(count(*)) from public.lots_medicaments where id=%L',own_lot));
  r:=r||pg_temp.lot02_assert(observed->>'value'='0','cross_owner_lot_read');
  observed:=pg_temp.business_call(dph,format('select to_jsonb(count(*)) from public.transferts where id=%L',transfer_id));
  r:=r||pg_temp.lot02_assert(observed->>'value'='1','DPH_supervision_read');

  foreach actor in array array[other_pharmacy,other_maker,pending,dph] loop
    observed:=pg_temp.business_call(actor,format('select to_jsonb(public.decide_lot_transfer(%L,''refuse''))',transfer_id));
    r:=r||pg_temp.lot02_assert(observed->>'code'='42501','transfer_decision_wrong_actor_'||actor);
  end loop;
  observed:=pg_temp.business_call(pharmacy,format('select to_jsonb(public.decide_lot_transfer(%L,''receptionne'',''WRONG''))',transfer_id));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','receipt_wrong_identifier');
  observed:=pg_temp.business_call(pharmacy,format('select to_jsonb(public.decide_lot_transfer(%L,''refuse''))',transfer_id));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean
    and (select quantite_actuelle=100 from public.lots_medicaments where id=own_lot)
    and exists(select 1 from public.demandes_stock where id=request_id and statut='refuse'),'refusal_refunds_and_updates_request');
  observed:=pg_temp.business_call(pharmacy,format('select to_jsonb(public.decide_lot_transfer(%L,''refuse''))',transfer_id));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean and (select quantite_actuelle=100 from public.lots_medicaments where id=own_lot),'refusal_retry_no_double_refund');
  observed:=pg_temp.business_call(maker,format('select to_jsonb(public.decide_lot_transfer(%L,''annule''))',transfer_id));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','terminal_transfer_reverse_denied');

  payload:=jsonb_build_array(jsonb_build_object('lot_id',today_lot,'destinataire_id',pharmacy,'quantite',100));
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',gen_random_uuid(),payload));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean,'expiration_day_inclusive');
  second_id:=(observed#>>'{value,ids,0}')::uuid;
  observed:=pg_temp.business_call(pharmacy,format('select to_jsonb(public.decide_lot_transfer(%L,''receptionne'',%L))',second_id,'BUSINESS_TEST_'||replace(today_lot::text,'-','')));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean
    and (select quantite_actuelle=0 and statut_actuel='en_pharmacie' from public.lots_medicaments where id=today_lot),'receive_preserves_reserved_balance');
  observed:=pg_temp.business_call(pharmacy,format('select to_jsonb(public.decide_lot_transfer(%L,''receptionne'',%L))',second_id,'BUSINESS_TEST_'||replace(today_lot::text,'-','')));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean and (select count(*)=1 from public.transferts where lot_id=today_lot),'receive_retry_no_double_credit');
  observed:=pg_temp.business_call(maker,format('select to_jsonb(public.decide_lot_transfer(%L,''annule''))',second_id));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','cancel_received_denied');

  payload:=jsonb_build_array(jsonb_build_object('lot_id',own_lot,'destinataire_id',pharmacy,'quantite',5));
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',gen_random_uuid(),payload));
  second_id:=(observed#>>'{value,ids,0}')::uuid;
  observed:=pg_temp.business_call(maker,format('select to_jsonb(public.decide_lot_transfer(%L,''annule''))',second_id));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean and (select quantite_actuelle=100 from public.lots_medicaments where id=own_lot),'P09_cancel_uses_server_lot_id');
  observed:=pg_temp.business_call(maker,format('select to_jsonb(public.decide_lot_transfer(%L,''annule''))',second_id));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean and (select quantite_actuelle=100 from public.lots_medicaments where id=own_lot),'cancel_retry_no_double_refund');

  observed:=pg_temp.business_call(pharmacy,format('select public.create_stock_requests(%L,%L)',gen_random_uuid(),request_payload));
  request_id:=(observed#>>'{value,ids,0}')::uuid;
  foreach actor in array array[other_maker,other_pharmacy,dph,pending] loop
    observed:=pg_temp.business_call(actor,format('select to_jsonb(public.decide_stock_requests(array[%L]::uuid[],''refuse'',''test''))',request_id));
    r:=r||pg_temp.lot02_assert(observed->>'code'='42501','request_decision_wrong_actor_'||actor);
  end loop;
  observed:=pg_temp.business_call(maker,format('select to_jsonb(public.decide_stock_requests(array[%L]::uuid[],''refuse'',''test''))',request_id));
  r:=r||pg_temp.lot02_assert(observed->>'value'='1','request_manufacturer_refusal');
  observed:=pg_temp.business_call(pharmacy,format('select to_jsonb(public.decide_stock_requests(array[%L]::uuid[],''annule''))',request_id));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','request_terminal_reverse_denied');

  -- Cancellation and bulk decisions are atomic, including a missing final row.
  observed:=pg_temp.business_call(pharmacy,format('select public.create_stock_requests(%L,%L)',gen_random_uuid(),request_payload));
  request_id:=(observed#>>'{value,ids,0}')::uuid;
  observed:=pg_temp.business_call(pharmacy,format('select to_jsonb(public.decide_stock_requests(array[%L,%L]::uuid[],''annule''))',request_id,gen_random_uuid()));
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501' and exists(select 1 from public.demandes_stock where id=request_id and statut='en_attente'),'request_batch_missing_row_rolls_back');
  observed:=pg_temp.business_call(pharmacy,format('select to_jsonb(public.decide_stock_requests(array[%L]::uuid[],''annule''))',request_id));
  r:=r||pg_temp.lot02_assert(observed->>'value'='1','request_pharmacy_cancellation');
  observed:=pg_temp.business_call(pharmacy,format('select to_jsonb(public.decide_stock_requests(array[%L]::uuid[],''annule''))',request_id));
  r:=r||pg_temp.lot02_assert(observed->>'value'='1','request_cancellation_retry');
  observed:=pg_temp.business_call(maker,format('select to_jsonb(public.decide_stock_requests(array[%L]::uuid[],null))',request_id));
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501','null_decision_rejected');

  -- Force an error in the third business write (request update), after the
  -- transfer INSERT and stock decrement; the entire RPC must roll back.
  observed:=pg_temp.business_call(pharmacy,format('select public.create_stock_requests(%L,%L)',gen_random_uuid(),request_payload));
  failure_id:=(observed#>>'{value,ids,0}')::uuid;
  payload:=jsonb_build_array(jsonb_build_object('lot_id',own_lot,'destinataire_id',pharmacy,'quantite',10,'demande_id',failure_id));
  perform set_config('pharmatrace.test_fail_request',failure_id::text,true);
  key1:=gen_random_uuid();
  select count(*) into n from public.transferts where lot_id=own_lot;
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',key1,payload));
  r:=r||pg_temp.lot02_assert(observed->>'code'='ZX004'
    and (select count(*)=n from public.transferts where lot_id=own_lot)
    and (select quantite_actuelle=100 from public.lots_medicaments where id=own_lot)
    and exists(select 1 from public.demandes_stock where id=failure_id and statut='en_attente' and transfert_id is null)
    and not exists(select 1 from private.business_operations where operation_key=key1),'third_write_failure_rolls_back_transfer_stock_request_and_key');
  perform set_config('pharmatrace.test_fail_request','',true);
  observed:=pg_temp.business_call(maker,format('select public.create_lot_transfers(%L,%L)',key1,payload));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean,'retry_after_rollback_can_succeed');
  second_id:=(observed#>>'{value,ids,0}')::uuid;
  -- Archiving after shipment blocks receipt, but never blocks returning units.
  update public.lots_medicaments set is_archived=true where id=own_lot;
  observed:=pg_temp.business_call(pharmacy,format('select to_jsonb(public.decide_lot_transfer(%L,''receptionne'',%L))',second_id,'BUSINESS_TEST_'||replace(own_lot::text,'-','')));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','receipt_archived_after_shipment_denied');
  observed:=pg_temp.business_call(maker,format('select to_jsonb(public.decide_lot_transfer(%L,''annule''))',second_id));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean
    and (select quantite_actuelle=100 and is_archived and statut_actuel='archive' from public.lots_medicaments where id=own_lot)
    and exists(select 1 from public.demandes_stock where id=failure_id and statut='annule'),'archived_cancellation_refunds_without_reactivating_lot');

  -- New lots cannot start with a fabricated custody/state or partial stock.
  observed:=pg_temp.business_call(maker,format('insert into public.lots_medicaments(numero_lot,nom_medicament,quantite_initiale,quantite_actuelle,date_fabrication,date_expiration,fabricant_id,hash_sha256) values(%L,''BUSINESS_TEST_NEW'',10,10,''2020-01-01'',''2099-01-01'',%L,%L) returning to_jsonb(id)',
    'BUSINESS_TEST_NEW_'||maker,maker,replace(maker::text,'-','')||replace(maker::text,'-','')));
  r:=r||pg_temp.lot02_assert((observed->>'ok')::boolean,'new_owned_lot_allowed');
  observed:=pg_temp.business_call(maker,format('insert into public.lots_medicaments(numero_lot,nom_medicament,quantite_initiale,quantite_actuelle,date_fabrication,date_expiration,fabricant_id,hash_sha256) values(%L,''BUSINESS_TEST_NEW'',10,5,''2020-01-01'',''2099-01-01'',%L,%L) returning to_jsonb(id)',
    'BUSINESS_TEST_BAD_'||maker,maker,replace(pharmacy::text,'-','')||replace(maker::text,'-','')));
  r:=r||pg_temp.lot02_assert(observed->>'code'='22023','new_lot_partial_stock_denied');

  -- Every terminal transfer edge: identical decision is a retry, all other
  -- decisions are forbidden. No operator fixture is ever committed.
  foreach from_state in array array['receptionne','refuse','annule','archive'] loop
    insert into public.transferts(lot_id,expediteur_id,destinataire_id,quantite_transferee,statut)
    values(foreign_lot,other_maker,other_pharmacy,1,from_state::public.statut_transfert) returning id into second_id;
    foreach decision in array array['receptionne','refuse','annule'] loop
      actor:=case when decision='annule' then other_maker else other_pharmacy end;
      observed:=pg_temp.business_call(actor,format('select to_jsonb(public.decide_lot_transfer(%L,%L,%L))',second_id,decision,'BUSINESS_TEST_'||replace(foreign_lot::text,'-','')));
      r:=r||pg_temp.lot02_assert(case when decision=from_state then (observed->>'ok')::boolean
        else observed->>'code'='22023' end,'terminal_edge_'||from_state||'_to_'||decision);
    end loop;
  end loop;

  -- Direct HTTP equivalents must also fail when they forge INSERT/DELETE,
  -- including actor, destination, state, timestamps and request links.
  observed:=pg_temp.business_call(maker,format('insert into public.transferts(lot_id,expediteur_id,destinataire_id,quantite_transferee,statut) values(%L,%L,%L,1,''receptionne'') returning to_jsonb(id)',foreign_lot,maker,pharmacy));
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501','raw_transfer_insert_forgery_denied');
  observed:=pg_temp.business_call(pharmacy,format('insert into public.demandes_stock(pharmacie_id,fabricant_id,nom_medicament,dosage,quantite_demandee,statut) values(%L,%L,''forged'',''forged'',1,''satisfait'') returning to_jsonb(id)',other_pharmacy,maker));
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501','raw_request_insert_forgery_denied');
  observed:=pg_temp.business_call(maker,format('delete from public.transferts where id=%L returning to_jsonb(id)',second_id));
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501','authenticated_transfer_delete_denied');
  observed:=pg_temp.business_call(pharmacy,format('delete from public.demandes_stock where id=%L returning to_jsonb(id)',request_id));
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501','authenticated_request_delete_denied');

  -- Raw REST/SDK equivalents are denied, not misleading zero-row successes.
  foreach decision in array array['transferts','demandes_stock'] loop
    foreach actor in array array[maker,pharmacy,pending,dph] loop
      observed:=pg_temp.business_call(actor,format('update public.%I set statut=''en_attente'' returning to_jsonb(id)',decision));
      r:=r||pg_temp.lot02_assert(observed->>'code'='42501','raw_update_'||decision||'_'||actor);
    end loop;
    observed:=pg_temp.business_call(null,format('delete from public.%I returning to_jsonb(id)',decision),'anon');
    r:=r||pg_temp.lot02_assert(observed->>'code'='42501','anon_delete_'||decision);
    observed:=pg_temp.business_call(null,format('update public.%I set statut=''en_attente'' returning to_jsonb(id)',decision),'service_role');
    r:=r||pg_temp.lot02_assert(observed->>'code'='42501','service_raw_update_'||decision);
  end loop;
  observed:=pg_temp.business_call(maker,format('update public.lots_medicaments set quantite_actuelle=99 where id=%L returning to_jsonb(id)',own_lot));
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501','raw_lot_stock_update_denied');
  observed:=pg_temp.business_call(maker,format('update public.lots_medicaments set hash_sha256=''forged'' where id=%L returning to_jsonb(id)',own_lot));
  r:=r||pg_temp.lot02_assert(observed->>'code'='42501','lot_identity_immutable');
  r:=r||pg_temp.lot02_assert(not has_table_privilege('authenticated','public.transferts','TRUNCATE')
    and not has_table_privilege('anon','public.demandes_stock','TRUNCATE'),'truncate_grants_revoked');
  return jsonb_build_object('count',jsonb_array_length(r),'tests',r);
end; $$;

create or replace function pg_temp.business_fail_request()
returns trigger language plpgsql as $$
begin
  if new.id::text=current_setting('pharmatrace.test_fail_request',true) then
    raise exception 'BUSINESS_TEST injected third-write failure' using errcode='ZX004';
  end if;
  return new;
end; $$;
