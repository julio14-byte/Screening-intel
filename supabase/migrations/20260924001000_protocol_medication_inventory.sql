-- Medicamentos del protocolo, lotes de la farmacéutica, inventario y receta electrónica.
-- Al entregar la receta se descuenta el stock del lote (función atómica).

set statement_timeout = '30s';
set lock_timeout = '8s';

-- -----------------------------------------------------------------------------
-- 1) Medicamentos de estudio por protocolo
-- -----------------------------------------------------------------------------
create table if not exists public.protocol_study_medications (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  protocol_id      uuid not null references public.protocols (id) on delete cascade,
  name             text not null,
  strength         text not null default '',
  form             text not null default '',
  unit             text not null default 'unidades',
  created_at       timestamptz not null default now(),
  constraint protocol_study_medications_name_not_blank
    check (length(trim(name)) > 0),
  constraint protocol_study_medications_unique
    unique (protocol_id, name, strength)
);

comment on table public.protocol_study_medications is
  'Medicamento en investigación que la farmacéutica envía para un protocolo.';

create index if not exists protocol_study_medications_org_protocol_idx
  on public.protocol_study_medications (organization_id, protocol_id);

-- -----------------------------------------------------------------------------
-- 2) Lotes recibidos
-- -----------------------------------------------------------------------------
create table if not exists public.medication_lots (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  protocol_id          uuid not null references public.protocols (id) on delete cascade,
  study_medication_id  uuid not null references public.protocol_study_medications (id) on delete cascade,
  lot_number           text not null,
  expires_on           date,
  quantity_received    numeric(12, 2) not null,
  quantity_on_hand     numeric(12, 2) not null,
  received_at          timestamptz not null default now(),
  notes                text not null default '',
  created_at           timestamptz not null default now(),
  constraint medication_lots_number_not_blank
    check (length(trim(lot_number)) > 0),
  constraint medication_lots_received_positive
    check (quantity_received > 0),
  constraint medication_lots_on_hand_nonneg
    check (quantity_on_hand >= 0),
  constraint medication_lots_unique
    unique (study_medication_id, lot_number)
);

comment on table public.medication_lots is
  'Número de lote enviado por la farmacéutica y stock actual del site.';

create index if not exists medication_lots_org_protocol_idx
  on public.medication_lots (organization_id, protocol_id);

create index if not exists medication_lots_med_hand_idx
  on public.medication_lots (study_medication_id, quantity_on_hand);

-- -----------------------------------------------------------------------------
-- 3) Recetas electrónicas
-- -----------------------------------------------------------------------------
create table if not exists public.prescriptions (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  protocol_id          uuid not null references public.protocols (id) on delete restrict,
  patient_id           uuid not null references public.patients (id) on delete cascade,
  study_medication_id  uuid not null references public.protocol_study_medications (id) on delete restrict,
  lot_id               uuid not null references public.medication_lots (id) on delete restrict,
  quantity             numeric(12, 2) not null,
  directions           text not null default '',
  status               text not null default 'draft'
    check (status in ('draft', 'delivered', 'cancelled')),
  prescribed_by        uuid references auth.users (id) on delete set null,
  delivered_at         timestamptz,
  delivered_by         uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint prescriptions_quantity_positive check (quantity > 0)
);

comment on table public.prescriptions is
  'Receta electrónica de medicación del estudio. Al entregarse descuenta el lote.';

create index if not exists prescriptions_org_patient_idx
  on public.prescriptions (organization_id, patient_id, created_at desc);

create index if not exists prescriptions_lot_idx
  on public.prescriptions (lot_id, status);

drop trigger if exists prescriptions_set_updated_at on public.prescriptions;
create trigger prescriptions_set_updated_at
  before update on public.prescriptions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4) Movimientos de inventario
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  lot_id           uuid not null references public.medication_lots (id) on delete restrict,
  prescription_id  uuid references public.prescriptions (id) on delete set null,
  kind             text not null check (kind in ('receive', 'dispense', 'adjust')),
  quantity_delta   numeric(12, 2) not null,
  quantity_after   numeric(12, 2) not null,
  note             text not null default '',
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now()
);

comment on table public.inventory_movements is
  'Kardex del lote: recepción de farmacéutica, entrega al paciente o ajuste.';

create index if not exists inventory_movements_org_created_idx
  on public.inventory_movements (organization_id, created_at desc);

create index if not exists inventory_movements_lot_idx
  on public.inventory_movements (lot_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 5) Entrega atómica: descuenta stock del lote
-- -----------------------------------------------------------------------------
create or replace function public.deliver_study_prescription(p_prescription_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  rx public.prescriptions;
  lot public.medication_lots;
begin
  select * into rx
  from public.prescriptions
  where id = p_prescription_id
  for update;

  if not found then
    raise exception 'Receta no encontrada.';
  end if;

  if rx.status <> 'draft' then
    raise exception 'La receta ya fue entregada o cancelada.';
  end if;

  select * into lot
  from public.medication_lots
  where id = rx.lot_id
  for update;

  if not found then
    raise exception 'Lote no encontrado.';
  end if;

  if lot.organization_id <> rx.organization_id then
    raise exception 'El lote no pertenece a este centro.';
  end if;

  if lot.quantity_on_hand < rx.quantity then
    raise exception
      'Stock insuficiente en el lote % (hay %, se piden %).',
      lot.lot_number, lot.quantity_on_hand, rx.quantity;
  end if;

  update public.medication_lots
    set quantity_on_hand = quantity_on_hand - rx.quantity
    where id = lot.id
    returning * into lot;

  update public.prescriptions
    set
      status = 'delivered',
      delivered_at = now(),
      delivered_by = auth.uid()
    where id = rx.id
    returning * into rx;

  insert into public.inventory_movements (
    organization_id,
    lot_id,
    prescription_id,
    kind,
    quantity_delta,
    quantity_after,
    note,
    created_by
  ) values (
    rx.organization_id,
    lot.id,
    rx.id,
    'dispense',
    -rx.quantity,
    lot.quantity_on_hand,
    'Entrega de receta electrónica',
    auth.uid()
  );

  return to_jsonb(rx);
end;
$$;

revoke all on function public.deliver_study_prescription(uuid) from public;
revoke all on function public.deliver_study_prescription(uuid) from anon;
grant execute on function public.deliver_study_prescription(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6) RLS
-- -----------------------------------------------------------------------------
alter table public.protocol_study_medications enable row level security;
alter table public.medication_lots enable row level security;
alter table public.prescriptions enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists protocol_study_medications_select on public.protocol_study_medications;
create policy protocol_study_medications_select
  on public.protocol_study_medications for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists protocol_study_medications_insert on public.protocol_study_medications;
create policy protocol_study_medications_insert
  on public.protocol_study_medications for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists protocol_study_medications_update on public.protocol_study_medications;
create policy protocol_study_medications_update
  on public.protocol_study_medications for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists medication_lots_select on public.medication_lots;
create policy medication_lots_select
  on public.medication_lots for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists medication_lots_insert on public.medication_lots;
create policy medication_lots_insert
  on public.medication_lots for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists medication_lots_update on public.medication_lots;
create policy medication_lots_update
  on public.medication_lots for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists prescriptions_select on public.prescriptions;
create policy prescriptions_select
  on public.prescriptions for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists prescriptions_insert on public.prescriptions;
create policy prescriptions_insert
  on public.prescriptions for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists prescriptions_update on public.prescriptions;
create policy prescriptions_update
  on public.prescriptions for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists inventory_movements_select on public.inventory_movements;
create policy inventory_movements_select
  on public.inventory_movements for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists inventory_movements_insert on public.inventory_movements;
create policy inventory_movements_insert
  on public.inventory_movements for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  );

revoke all on table public.protocol_study_medications from anon;
revoke all on table public.medication_lots from anon;
revoke all on table public.prescriptions from anon;
revoke all on table public.inventory_movements from anon;

grant select, insert, update on table public.protocol_study_medications to authenticated;
grant select, insert, update on table public.medication_lots to authenticated;
grant select, insert, update on table public.prescriptions to authenticated;
grant select, insert on table public.inventory_movements to authenticated;
