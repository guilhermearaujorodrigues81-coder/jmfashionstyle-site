
-- ==========================================================
-- STUDIO JM — FASE 5.4.7
-- DATA DE ANIVERSÁRIO DO CLIENTE
-- ==========================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birth_date date;

-- Atualiza o gatilho de novos cadastros para salvar a data,
-- quando ela for informada no formulário.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles(id,full_name,phone,birth_date)
  VALUES(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    CASE
      WHEN coalesce(new.raw_user_meta_data->>'birth_date','') <> ''
      THEN (new.raw_user_meta_data->>'birth_date')::date
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- A função administrativa precisa devolver a nova coluna.
DROP FUNCTION IF EXISTS public.admin_list_profiles();

CREATE FUNCTION public.admin_list_profiles()
RETURNS TABLE(
  id uuid,
  full_name text,
  phone text,
  birth_date date,
  role public.user_role,
  created_at timestamptz,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.phone,
    p.birth_date,
    p.role,
    p.created_at,
    u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- ==========================================================
-- FIM
-- ==========================================================
