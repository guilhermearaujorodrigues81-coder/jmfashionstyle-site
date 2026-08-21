
-- ==========================================================
-- STUDIO JM — FASE 5.3.1
-- PLANOS VINCULADOS À CONTA
--
-- Nesta etapa:
-- - catálogo de planos no banco;
-- - cliente escolhe e confirma um plano;
-- - solicitação fica vinculada à conta;
-- - status inicial: pending;
-- - cliente e admin visualizam a solicitação.
--
-- Pagamento automático entra na Fase 5.5.
-- Consumo automático / extrato detalhado entra nas próximas
-- evoluções da Fase 5.3.
-- ==========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='subscription_status'
      AND n.nspname='public'
  ) THEN
    CREATE TYPE public.subscription_status AS ENUM (
      'pending',
      'active',
      'suspended',
      'expired',
      'cancelled'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  monthly_price numeric(10,2) NOT NULL CHECK (monthly_price >= 0),
  monthly_credits integer NOT NULL DEFAULT 0 CHECK (monthly_credits >= 0),
  freestyles integer NOT NULL DEFAULT 0 CHECK (freestyles >= 0),
  hydrations integer NOT NULL DEFAULT 0 CHECK (hydrations >= 0),
  family_members integer NOT NULL DEFAULT 1 CHECK (family_members >= 1),
  discount_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0),
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status public.subscription_status NOT NULL DEFAULT 'pending',

  -- datas serão preenchidas quando o plano for efetivamente ativado
  starts_at date,
  ends_at date,

  -- snapshot do ciclo atual (preparação para a Fase 5.3)
  credits_total integer NOT NULL DEFAULT 0 CHECK (credits_total >= 0),
  credits_remaining integer NOT NULL DEFAULT 0 CHECK (credits_remaining >= 0),
  freestyles_total integer NOT NULL DEFAULT 0 CHECK (freestyles_total >= 0),
  freestyles_remaining integer NOT NULL DEFAULT 0 CHECK (freestyles_remaining >= 0),
  hydrations_total integer NOT NULL DEFAULT 0 CHECK (hydrations_total >= 0),
  hydrations_remaining integer NOT NULL DEFAULT 0 CHECK (hydrations_remaining >= 0),

  selected_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Um cliente só pode ter uma solicitação/plano corrente por vez.
CREATE UNIQUE INDEX IF NOT EXISTS one_current_subscription_per_user
ON public.subscriptions(user_id)
WHERE status IN ('pending','active','suspended');

-- Catálogo oficial da Studio JM.
INSERT INTO public.plans (
  name, slug, monthly_price, monthly_credits,
  freestyles, hydrations, family_members,
  discount_percent, description, sort_order
)
VALUES
(
  'Bronze','bronze',79.90,2,
  0,0,1,
  5,
  'Para manter o corte sempre em dia.',
  1
),
(
  'Prata','prata',129.90,4,
  1,0,1,
  10,
  'Mais liberdade para escolher entre corte e barba.',
  2
),
(
  'Ouro','ouro',219.90,12,
  2,1,1,
  20,
  'Plano individual para quem frequenta toda semana.',
  3
),
(
  'Family VIP','family-vip',299.90,8,
  2,2,4,
  15,
  'Créditos compartilhados por até 4 pessoas.',
  4
)
ON CONFLICT (name)
DO UPDATE SET
  slug=EXCLUDED.slug,
  monthly_price=EXCLUDED.monthly_price,
  monthly_credits=EXCLUDED.monthly_credits,
  freestyles=EXCLUDED.freestyles,
  hydrations=EXCLUDED.hydrations,
  family_members=EXCLUDED.family_members,
  discount_percent=EXCLUDED.discount_percent,
  description=EXCLUDED.description,
  sort_order=EXCLUDED.sort_order,
  active=true,
  updated_at=now();

-- Cliente confirma um plano.
-- Se já houver solicitação pending, atualiza para o novo plano.
CREATE OR REPLACE FUNCTION public.select_plan(p_plan_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_plan public.plans;
  v_subscription_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT *
  INTO v_plan
  FROM public.plans
  WHERE slug=p_plan_slug
    AND active=true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano não encontrado';
  END IF;

  -- Não troca automaticamente plano ativo nesta etapa.
  IF EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id=auth.uid()
      AND status IN ('active','suspended')
  ) THEN
    RAISE EXCEPTION 'Você já possui um plano vigente. A troca será gerenciada na área do cliente.';
  END IF;

  SELECT id
  INTO v_subscription_id
  FROM public.subscriptions
  WHERE user_id=auth.uid()
    AND status='pending'
  LIMIT 1;

  IF v_subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET plan_id=v_plan.id,
        credits_total=v_plan.monthly_credits,
        credits_remaining=0,
        freestyles_total=v_plan.freestyles,
        freestyles_remaining=0,
        hydrations_total=v_plan.hydrations,
        hydrations_remaining=0,
        selected_at=now(),
        updated_at=now()
    WHERE id=v_subscription_id;

    RETURN v_subscription_id;
  END IF;

  INSERT INTO public.subscriptions(
    user_id,
    plan_id,
    status,
    credits_total,
    credits_remaining,
    freestyles_total,
    freestyles_remaining,
    hydrations_total,
    hydrations_remaining
  )
  VALUES(
    auth.uid(),
    v_plan.id,
    'pending',
    v_plan.monthly_credits,
    0,
    v_plan.freestyles,
    0,
    v_plan.hydrations,
    0
  )
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$;

-- Cliente pode cancelar uma solicitação ainda pendente.
CREATE OR REPLACE FUNCTION public.cancel_pending_subscription()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  UPDATE public.subscriptions
  SET status='cancelled',
      cancelled_at=now(),
      updated_at=now()
  WHERE user_id=auth.uid()
    AND status='pending';
END;
$$;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_read" ON public.plans;
CREATE POLICY "plans_read"
ON public.plans
FOR SELECT
TO authenticated
USING (active OR public.is_admin());

DROP POLICY IF EXISTS "subscriptions_self_read" ON public.subscriptions;
CREATE POLICY "subscriptions_self_read"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id=auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "subscriptions_admin_all" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_all"
ON public.subscriptions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT SELECT ON public.plans TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

REVOKE ALL ON FUNCTION public.select_plan(text) FROM public;
GRANT EXECUTE ON FUNCTION public.select_plan(text) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_pending_subscription() FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_pending_subscription() TO authenticated;

-- ==========================================================
-- FIM — FASE 5.3.1
-- ==========================================================
