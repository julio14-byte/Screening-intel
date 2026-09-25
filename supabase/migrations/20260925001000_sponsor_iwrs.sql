-- IWRS del sponsor: el IRT de Lilly / IQVIA / Suvoda / etc. es la fuente de verdad.
-- Crisvia no llama a esas APIs. El centro registra el kit que el IRT ya asignó.

set statement_timeout = '60s';
set lock_timeout = '8s';

alter table public.protocol_iwrs_config
  add column if not exists source text not null default 'site';

alter table public.protocol_iwrs_config
  drop constraint if exists protocol_iwrs_config_source_check;
alter table public.protocol_iwrs_config
  add constraint protocol_iwrs_config_source_check
  check (source in ('site', 'sponsor'));

alter table public.protocol_iwrs_config
  add column if not exists sponsor_vendor text not null default '';

alter table public.protocol_iwrs_config
  drop constraint if exists protocol_iwrs_config_vendor_check;
alter table public.protocol_iwrs_config
  add constraint protocol_iwrs_config_vendor_check
  check (
    sponsor_vendor in (
      '',
      'lilly',
      'iqvia',
      'suvoda',
      'medidata',
      'endpoint',
      'signant',
      'almac',
      '4gclinical',
      'other'
    )
  );

alter table public.protocol_iwrs_config
  add column if not exists sponsor_study_id text not null default '';

alter table public.protocol_iwrs_config
  add column if not exists sponsor_site_id text not null default '';

comment on column public.protocol_iwrs_config.source is
  'site: Crisvia genera bloques. sponsor: el IRT de la farmacéutica asigna; acá se registra el kit.';
comment on column public.protocol_iwrs_config.sponsor_vendor is
  'Proveedor IRT del estudio (Lilly designa uno por protocolo; no hay API pública única).';

alter table public.iwrs_randomizations
  alter column slot_id drop not null;

alter table public.iwrs_randomizations
  add column if not exists assignment_source text not null default 'site';

alter table public.iwrs_randomizations
  drop constraint if exists iwrs_randomizations_assignment_source_check;
alter table public.iwrs_randomizations
  add constraint iwrs_randomizations_assignment_source_check
  check (assignment_source in ('site', 'sponsor'));

alter table public.iwrs_randomizations
  add column if not exists external_id text not null default '';

create unique index if not exists iwrs_randomizations_external_uidx
  on public.iwrs_randomizations (protocol_id, external_id)
  where length(btrim(external_id)) > 0;

comment on column public.iwrs_randomizations.external_id is
  'Número de randomización / subject ID que devolvió el IRT del sponsor.';

-- El IWRS local no debe sortear si el protocolo apunta al IRT del sponsor.
create or replace function public.iwrs_randomize(p_screening_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scr public.screenings;
  v_patient public.patients;
  v_cfg public.protocol_iwrs_config;
  v_stratum text;
  v_slot public.iwrs_slots;
  v_kit text;
  v_seq int;
  v_row public.iwrs_randomizations;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;
  if not public.can_write_clinical_data() then
    raise exception 'Sin permiso para randomizar.';
  end if;

  select * into v_scr
  from public.screenings
  where id = p_screening_id
  for update;

  if not found then
    raise exception 'Screening no encontrado.';
  end if;

  if v_scr.status is distinct from 'screening'::public.screening_status then
    raise exception 'Solo se randomiza un paciente en etapa Screening (visitas de screening hechas).';
  end if;

  select * into v_patient
  from public.patients
  where id = v_scr.patient_id;

  if v_patient.clinic_id not in (select public.get_user_organization_ids()) then
    raise exception 'Paciente fuera de tu centro.';
  end if;

  select * into v_cfg
  from public.protocol_iwrs_config
  where protocol_id = v_scr.protocol_id;

  if v_cfg is null or not v_cfg.enabled then
    raise exception 'Este protocolo no tiene IWRS activo.';
  end if;

  if coalesce(v_cfg.source, 'site') = 'sponsor' then
    raise exception 'Este protocolo usa el IWRS del sponsor. Registrá el kit que asignó su IRT (Lilly, IQVIA, Suvoda, etc.).';
  end if;

  if exists (
    select 1 from public.iwrs_randomizations r
    where r.protocol_id = v_scr.protocol_id and r.patient_id = v_scr.patient_id
  ) then
    raise exception 'Este paciente ya fue randomizado en el protocolo.';
  end if;

  v_stratum := case
    when v_cfg.stratify_gender then coalesce(v_patient.gender::text, 'all')
    else 'all'
  end;

  perform pg_advisory_xact_lock(hashtext(v_scr.protocol_id::text || ':' || v_stratum));

  select * into v_slot
  from public.iwrs_slots s
  where s.protocol_id = v_scr.protocol_id
    and s.stratum = v_stratum
    and s.claimed_at is null
  order by s.sequence
  limit 1
  for update skip locked;

  if not found then
    raise exception 'NEED_BLOCK'
      using errcode = 'P0001';
  end if;

  select coalesce(max((regexp_replace(kit_code, '^.*-', ''))::int), 0) + 1
    into v_seq
  from public.iwrs_randomizations
  where protocol_id = v_scr.protocol_id
    and kit_code ~ '-[0-9]+$';

  select upper(left(regexp_replace(code_name, '[^A-Za-z0-9]', '', 'g'), 8))
    into v_code
  from public.protocols
  where id = v_scr.protocol_id;

  v_kit := coalesce(nullif(v_code, ''), 'KIT') || '-' || lpad(v_seq::text, 4, '0');

  insert into public.iwrs_randomizations (
    organization_id,
    protocol_id,
    patient_id,
    screening_id,
    slot_id,
    stratum,
    kit_code,
    randomized_by,
    assignment_source
  ) values (
    v_patient.clinic_id,
    v_scr.protocol_id,
    v_scr.patient_id,
    v_scr.id,
    v_slot.id,
    v_stratum,
    v_kit,
    auth.uid(),
    'site'
  )
  returning * into v_row;

  insert into public.iwrs_arm_assignments (
    randomization_id, organization_id, arm_id
  ) values (
    v_row.id, v_patient.clinic_id, v_slot.arm_id
  );

  update public.iwrs_slots
    set claimed_at = now()
    where id = v_slot.id;

  update public.screenings
    set status = 'randomized'::public.screening_status
    where id = v_scr.id;

  return jsonb_build_object(
    'id', v_row.id,
    'kit_code', v_row.kit_code,
    'stratum', v_row.stratum,
    'randomized_at', v_row.randomized_at,
    'arm_visible', public.iwrs_arm_visible(v_row.id)
  );
end;
$$;

revoke all on function public.iwrs_randomize(uuid) from public;
revoke all on function public.iwrs_randomize(uuid) from anon;
grant execute on function public.iwrs_randomize(uuid) to authenticated;

create or replace function public.iwrs_register_sponsor_kit(
  p_screening_id uuid,
  p_kit_code text,
  p_external_id text default '',
  p_arm_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scr public.screenings;
  v_patient public.patients;
  v_cfg public.protocol_iwrs_config;
  v_stratum text;
  v_kit text;
  v_ext text;
  v_row public.iwrs_randomizations;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;
  if not public.can_write_clinical_data() then
    raise exception 'Sin permiso para registrar el kit del sponsor.';
  end if;

  v_kit := upper(btrim(coalesce(p_kit_code, '')));
  v_ext := btrim(coalesce(p_external_id, ''));
  if length(v_kit) < 3 or length(v_kit) > 40 then
    raise exception 'El código de kit del sponsor debe tener entre 3 y 40 caracteres.';
  end if;
  if length(v_ext) > 80 then
    raise exception 'El ID externo es demasiado largo.';
  end if;

  select * into v_scr
  from public.screenings
  where id = p_screening_id
  for update;

  if not found then
    raise exception 'Screening no encontrado.';
  end if;
  if v_scr.status is distinct from 'screening'::public.screening_status then
    raise exception 'Solo se registra un kit con el paciente en etapa Screening.';
  end if;

  select * into v_patient
  from public.patients
  where id = v_scr.patient_id;

  if v_patient.clinic_id not in (select public.get_user_organization_ids()) then
    raise exception 'Paciente fuera de tu centro.';
  end if;

  select * into v_cfg
  from public.protocol_iwrs_config
  where protocol_id = v_scr.protocol_id;

  if v_cfg is null or not v_cfg.enabled then
    raise exception 'Este protocolo no tiene IWRS activo.';
  end if;
  if coalesce(v_cfg.source, 'site') is distinct from 'sponsor' then
    raise exception 'Este protocolo usa el IWRS del centro, no el del sponsor.';
  end if;

  if exists (
    select 1 from public.iwrs_randomizations r
    where r.protocol_id = v_scr.protocol_id and r.patient_id = v_scr.patient_id
  ) then
    raise exception 'Este paciente ya tiene kit asignado en el protocolo.';
  end if;

  if p_arm_id is not null then
    if v_cfg.blinding is distinct from 'open' and not public.is_clinical_lead() then
      raise exception 'En un estudio ciego el coordinador no carga el brazo; solo el kit.';
    end if;
    if not exists (
      select 1 from public.protocol_arms a
      where a.id = p_arm_id and a.protocol_id = v_scr.protocol_id
    ) then
      raise exception 'Ese brazo no pertenece a este protocolo.';
    end if;
  end if;

  v_stratum := case
    when v_cfg.stratify_gender then coalesce(v_patient.gender::text, 'all')
    else 'all'
  end;

  insert into public.iwrs_randomizations (
    organization_id,
    protocol_id,
    patient_id,
    screening_id,
    slot_id,
    stratum,
    kit_code,
    randomized_by,
    assignment_source,
    external_id
  ) values (
    v_patient.clinic_id,
    v_scr.protocol_id,
    v_scr.patient_id,
    v_scr.id,
    null,
    v_stratum,
    v_kit,
    auth.uid(),
    'sponsor',
    v_ext
  )
  returning * into v_row;

  if p_arm_id is not null then
    insert into public.iwrs_arm_assignments (
      randomization_id, organization_id, arm_id
    ) values (
      v_row.id, v_patient.clinic_id, p_arm_id
    );
  end if;

  update public.screenings
    set status = 'randomized'::public.screening_status
    where id = v_scr.id;

  return jsonb_build_object(
    'id', v_row.id,
    'kit_code', v_row.kit_code,
    'external_id', v_row.external_id,
    'stratum', v_row.stratum,
    'randomized_at', v_row.randomized_at,
    'arm_visible', public.iwrs_arm_visible(v_row.id)
  );
end;
$$;

revoke all on function public.iwrs_register_sponsor_kit(uuid, text, text, uuid) from public;
revoke all on function public.iwrs_register_sponsor_kit(uuid, text, text, uuid) from anon;
grant execute on function public.iwrs_register_sponsor_kit(uuid, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';
