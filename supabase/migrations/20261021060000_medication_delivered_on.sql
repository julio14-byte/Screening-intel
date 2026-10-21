-- Fecha en que el sitio entregó el medicamento del estudio.
-- Solo aplica a un screening ya marcado como randomizado.
-- No hay lotes, stock ni kit: eso lo lleva el sistema del sponsor.

alter table public.screenings
  add column if not exists medication_delivered_on date;

comment on column public.screenings.medication_delivered_on is
  'Día calendario en que el sitio entregó el medicamento, después de la randomización del sponsor.';

alter table public.screenings
  drop constraint if exists screenings_delivery_date_ok;

alter table public.screenings
  add constraint screenings_delivery_date_ok
  check (
    medication_delivered_on is null
    or (
      status = 'randomized'::public.screening_status
      and medication_delivered_on >= date '1990-01-01'
      and medication_delivered_on <= (current_date + 1)
    )
  );

create or replace function public.clear_delivery_unless_randomized()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from 'randomized'::public.screening_status then
    new.medication_delivered_on := null;
  end if;
  return new;
end;
$$;

drop trigger if exists screenings_clear_delivery on public.screenings;
create trigger screenings_clear_delivery
  before insert or update on public.screenings
  for each row execute function public.clear_delivery_unless_randomized();

revoke all on function public.clear_delivery_unless_randomized() from public, anon, authenticated;
