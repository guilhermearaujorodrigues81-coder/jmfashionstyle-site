
-- ==========================================================
-- STUDIO JM — FASE 5.2.1
-- Agenda: Cristiano, horários, bloqueios, cancelamento e confirmação
-- Execute este arquivo no SQL Editor do Supabase.
-- ==========================================================

create type if not exists public.appointment_status as enum (
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  specialty text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_open boolean not null default false,
  unique(weekday)
);

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.professionals(id),
  service_id uuid not null references public.services(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create unique index if not exists unique_professional_active_slot
on public.appointments(professional_id, starts_at)
where status in ('pending','confirmed');

insert into public.professionals(name,specialty)
values ('Cristiano','Barbeiro')
on conflict (name) do update set specialty=excluded.specialty, active=true;

insert into public.services(name,duration_minutes,active,sort_order) values
('Corte',60,true,1),
('Barba',60,true,2),
('Corte + Barba',60,true,3),
('Corte Infantil',60,true,4),
('Outros',60,true,5)
on conflict (name) do update
set duration_minutes=excluded.duration_minutes,
    active=excluded.active,
    sort_order=excluded.sort_order;

insert into public.business_hours(weekday,opens_at,closes_at,is_open) values
(0,null,null,false),
(1,null,null,false),
(2,'09:00','19:00',true),
(3,'09:00','19:00',true),
(4,'09:00','19:00',true),
(5,'09:00','19:00',true),
(6,'09:00','19:00',true)
on conflict (weekday) do update
set opens_at=excluded.opens_at,
    closes_at=excluded.closes_at,
    is_open=excluded.is_open;

create or replace function public.validate_appointment_schedule()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  local_start timestamp;
  local_end timestamp;
  dow integer;
  bh public.business_hours;
  conflict_count integer;
  block_count integer;
begin
  local_start := new.starts_at at time zone 'America/Sao_Paulo';
  local_end := new.ends_at at time zone 'America/Sao_Paulo';
  dow := extract(dow from local_start);

  select * into bh from public.business_hours where weekday=dow;

  if bh is null or not bh.is_open then
    raise exception 'Studio fechado neste dia';
  end if;

  if local_start::time < bh.opens_at or local_end::time > bh.closes_at then
    raise exception 'Horário fora do expediente';
  end if;

  if date_trunc('minute', local_end - local_start) <> interval '60 minutes' then
    raise exception 'Cada atendimento deve ter 60 minutos';
  end if;

  select count(*) into conflict_count
  from public.appointments a
  where a.professional_id=new.professional_id
    and a.id is distinct from new.id
    and a.status in ('pending','confirmed')
    and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)');

  if conflict_count > 0 then
    raise exception 'Horário já ocupado';
  end if;

  select count(*) into block_count
  from public.schedule_blocks b
  where b.professional_id=new.professional_id
    and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)');

  if block_count > 0 then
    raise exception 'Horário bloqueado';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_appointment_schedule on public.appointments;

create trigger trg_validate_appointment_schedule
before insert or update of starts_at,ends_at,professional_id,status
on public.appointments
for each row
when (new.status in ('pending','confirmed'))
execute function public.validate_appointment_schedule();

create or replace function public.admin_set_appointment_status(
  p_appointment_id uuid,
  p_status public.appointment_status
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  update public.appointments
  set status=p_status, updated_at=now()
  where id=p_appointment_id;

  if not found then
    raise exception 'Agendamento não encontrado';
  end if;
end;
$$;

alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.business_hours enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "public_professionals_read" on public.professionals;
create policy "public_professionals_read"
on public.professionals for select
to authenticated
using (active or public.is_admin());

drop policy if exists "public_services_read" on public.services;
create policy "public_services_read"
on public.services for select
to authenticated
using (active or public.is_admin());

drop policy if exists "business_hours_read" on public.business_hours;
create policy "business_hours_read"
on public.business_hours for select
to authenticated
using (true);

drop policy if exists "blocks_read_auth" on public.schedule_blocks;
create policy "blocks_read_auth"
on public.schedule_blocks for select
to authenticated
using (true);

drop policy if exists "blocks_admin_all" on public.schedule_blocks;
create policy "blocks_admin_all"
on public.schedule_blocks for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "appointment_self_read" on public.appointments;
create policy "appointment_self_read"
on public.appointments for select
to authenticated
using (user_id=auth.uid() or public.is_admin());

drop policy if exists "appointment_self_insert" on public.appointments;
create policy "appointment_self_insert"
on public.appointments for insert
to authenticated
with check (user_id=auth.uid());

drop policy if exists "appointment_self_cancel" on public.appointments;
create policy "appointment_self_cancel"
on public.appointments for update
to authenticated
using (user_id=auth.uid() and status in ('pending','confirmed'))
with check (user_id=auth.uid() and status='cancelled');

drop policy if exists "appointment_admin_all" on public.appointments;
create policy "appointment_admin_all"
on public.appointments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.professionals,public.services,public.business_hours,public.schedule_blocks to authenticated;
grant select,insert,update on public.appointments to authenticated;
grant insert,update,delete on public.schedule_blocks to authenticated;
grant execute on function public.admin_set_appointment_status(uuid,public.appointment_status) to authenticated;
