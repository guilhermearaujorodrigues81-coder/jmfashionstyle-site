
-- ==========================================================
-- STUDIO JM — FASE 5.1
-- Base do sistema: login, cadastro, clientes e permissões
-- Execute TODO este arquivo no SQL Editor do Supabase.
-- ==========================================================

create extension if not exists pgcrypto;

-- 1) TIPOS
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'user_role'
  ) then
    create type public.user_role as enum ('client','admin');
  end if;
end $$;

-- 2) PERFIS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role public.user_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Não permitimos duas contas diferentes com o mesmo telefone quando preenchido.
create unique index if not exists profiles_phone_unique
on public.profiles(phone)
where phone <> '';

-- 3) CRIA PERFIL AUTOMATICAMENTE NO CADASTRO
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,full_name,phone)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'phone','')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- 4) FUNÇÃO DE ADMIN
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 5) LISTAGEM ADMINISTRATIVA
-- E-mail vem de auth.users, mas só é exposto através desta função
-- quando o usuário autenticado é administrador.
create or replace function public.admin_list_profiles()
returns table(
  id uuid,
  full_name text,
  phone text,
  role public.user_role,
  created_at timestamptz,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.phone,
    p.role,
    p.created_at,
    u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

-- 6) ROW LEVEL SECURITY
alter table public.profiles enable row level security;

drop policy if exists "profile_self_read" on public.profiles;
drop policy if exists "profile_self_update" on public.profiles;
drop policy if exists "admin_read_profiles" on public.profiles;

create policy "profile_self_read"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profile_self_update"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (
    select p2.role
    from public.profiles p2
    where p2.id = auth.uid()
  )
);

create policy "admin_read_profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- 7) RESTRIÇÕES DE PERMISSÃO
revoke all on public.profiles from anon;
grant select,update on public.profiles to authenticated;

revoke all on function public.admin_list_profiles() from public;
grant execute on function public.admin_list_profiles() to authenticated;

-- ==========================================================
-- FIM DA FASE 5.1
-- ==========================================================
