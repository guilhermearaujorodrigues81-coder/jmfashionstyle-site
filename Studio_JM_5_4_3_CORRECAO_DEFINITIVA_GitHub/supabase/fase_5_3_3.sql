
-- ==========================================================
-- STUDIO JM — FASE 5.3.3
-- CRÉDITOS INTEGRADOS À AGENDA
--
-- Regra:
-- - agendamento NÃO desconta crédito;
-- - agendamento com plano RESERVA crédito;
-- - cancelamento libera a reserva;
-- - conclusão pelo admin desconta o crédito;
-- - cada desconto gera extrato;
-- - serviços sem cobertura/saldo seguem como avulso.
-- ==========================================================

-- 1) SERVIÇOS: custo em créditos
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS credit_cost integer NOT NULL DEFAULT 1
CHECK (credit_cost >= 0);

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS plan_eligible boolean NOT NULL DEFAULT true;

UPDATE public.services SET credit_cost=1, plan_eligible=true WHERE name='Corte';
UPDATE public.services SET credit_cost=1, plan_eligible=true WHERE name='Barba';
UPDATE public.services SET credit_cost=2, plan_eligible=true WHERE name='Corte + Barba';
UPDATE public.services SET credit_cost=1, plan_eligible=true WHERE name='Corte Infantil';
UPDATE public.services SET credit_cost=0, plan_eligible=false WHERE name='Outros';

-- 2) REGRAS POR PLANO/SERVIÇO
CREATE TABLE IF NOT EXISTS public.plan_service_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  included boolean NOT NULL DEFAULT true,
  credit_cost integer NOT NULL CHECK (credit_cost > 0),
  UNIQUE(plan_id,service_id)
);

-- Bronze: foco em Corte
INSERT INTO public.plan_service_rules(plan_id,service_id,included,credit_cost)
SELECT p.id,s.id,true,1
FROM public.plans p
JOIN public.services s ON s.name='Corte'
WHERE p.slug='bronze'
ON CONFLICT(plan_id,service_id)
DO UPDATE SET included=true,credit_cost=excluded.credit_cost;

-- Prata, Ouro e Family: Corte, Barba, Corte+Barba e Corte Infantil
INSERT INTO public.plan_service_rules(plan_id,service_id,included,credit_cost)
SELECT p.id,s.id,true,
  CASE WHEN s.name='Corte + Barba' THEN 2 ELSE 1 END
FROM public.plans p
JOIN public.services s ON s.name IN ('Corte','Barba','Corte + Barba','Corte Infantil')
WHERE p.slug IN ('prata','ouro','family-vip')
ON CONFLICT(plan_id,service_id)
DO UPDATE SET included=true,credit_cost=excluded.credit_cost;

-- 3) AGENDAMENTOS: origem de cobrança
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id);

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'avulso'
CHECK (billing_mode IN ('plan','avulso'));

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS credits_reserved integer NOT NULL DEFAULT 0
CHECK (credits_reserved >= 0);

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS credits_charged boolean NOT NULL DEFAULT false;

-- 4) EXTRATO DE CRÉDITOS
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  balance_after integer,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_credit_charge_per_appointment
ON public.credit_ledger(appointment_id)
WHERE appointment_id IS NOT NULL AND amount < 0;

ALTER TABLE public.plan_service_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_rules_read" ON public.plan_service_rules;
CREATE POLICY "plan_rules_read"
ON public.plan_service_rules
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "credit_ledger_self_read" ON public.credit_ledger;
CREATE POLICY "credit_ledger_self_read"
ON public.credit_ledger
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id=subscription_id
      AND s.user_id=auth.uid()
  )
);

GRANT SELECT ON public.plan_service_rules TO authenticated;
GRANT SELECT ON public.credit_ledger TO authenticated;

-- 5) COTAÇÃO DO USO DE CRÉDITO PARA UM SERVIÇO/DATA
CREATE OR REPLACE FUNCTION public.get_booking_credit_quote(
  p_service_id uuid,
  p_starts_at timestamptz
)
RETURNS TABLE(
  billing_mode text,
  subscription_id uuid,
  plan_name text,
  credit_cost integer,
  credits_remaining integer,
  credits_reserved integer,
  credits_available integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_sub public.subscriptions;
  v_plan public.plans;
  v_rule public.plan_service_rules;
  v_reserved integer := 0;
  v_booking_date date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  v_booking_date := (p_starts_at AT TIME ZONE 'America/Sao_Paulo')::date;

  SELECT s.*
  INTO v_sub
  FROM public.subscriptions s
  WHERE s.user_id=auth.uid()
    AND s.status='active'
    AND s.starts_at IS NOT NULL
    AND s.ends_at IS NOT NULL
    AND v_booking_date BETWEEN s.starts_at AND s.ends_at
  ORDER BY s.activated_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 'avulso'::text,NULL::uuid,NULL::text,0,0,0,0,
           'Sem plano ativo para esta data. O atendimento será avulso.'::text;
    RETURN;
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id=v_sub.plan_id;

  SELECT r.*
  INTO v_rule
  FROM public.plan_service_rules r
  WHERE r.plan_id=v_sub.plan_id
    AND r.service_id=p_service_id
    AND r.included=true;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 'avulso'::text,v_sub.id,v_plan.name,0,
           v_sub.credits_remaining,0,v_sub.credits_remaining,
           'Este serviço não está incluído no seu plano. O atendimento será avulso.'::text;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(a.credits_reserved),0)::integer
  INTO v_reserved
  FROM public.appointments a
  WHERE a.subscription_id=v_sub.id
    AND a.billing_mode='plan'
    AND a.credits_charged=false
    AND a.status IN ('pending','confirmed');

  IF (v_sub.credits_remaining - v_reserved) < v_rule.credit_cost THEN
    RETURN QUERY
    SELECT 'avulso'::text,v_sub.id,v_plan.name,v_rule.credit_cost,
           v_sub.credits_remaining,v_reserved,
           GREATEST(v_sub.credits_remaining-v_reserved,0),
           'Seu saldo disponível está comprometido com outros agendamentos. Este atendimento será avulso.'::text;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 'plan'::text,v_sub.id,v_plan.name,v_rule.credit_cost,
         v_sub.credits_remaining,v_reserved,
         GREATEST(v_sub.credits_remaining-v_reserved,0),
         format('%s crédito(s) serão reservados e descontados somente após a conclusão do atendimento.',v_rule.credit_cost)::text;
END;
$$;

-- 6) CRIA AGENDAMENTO DE FORMA ATÔMICA
CREATE OR REPLACE FUNCTION public.create_appointment_v2(
  p_professional_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_service public.services;
  v_quote record;
  v_id uuid;
  v_end timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_service
  FROM public.services
  WHERE id=p_service_id AND active=true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço indisponível';
  END IF;

  v_end := p_starts_at + make_interval(mins => v_service.duration_minutes);

  SELECT *
  INTO v_quote
  FROM public.get_booking_credit_quote(p_service_id,p_starts_at)
  LIMIT 1;

  -- trava a assinatura quando houver plano, evitando reservas simultâneas acima do saldo
  IF v_quote.subscription_id IS NOT NULL THEN
    PERFORM 1
    FROM public.subscriptions
    WHERE id=v_quote.subscription_id
    FOR UPDATE;

    -- recalcula após o lock
    SELECT *
    INTO v_quote
    FROM public.get_booking_credit_quote(p_service_id,p_starts_at)
    LIMIT 1;
  END IF;

  INSERT INTO public.appointments(
    user_id,
    professional_id,
    service_id,
    starts_at,
    ends_at,
    status,
    notes,
    subscription_id,
    billing_mode,
    credits_reserved,
    credits_charged
  )
  VALUES(
    auth.uid(),
    p_professional_id,
    p_service_id,
    p_starts_at,
    v_end,
    'pending',
    NULLIF(trim(COALESCE(p_notes,'')),''),
    v_quote.subscription_id,
    v_quote.billing_mode,
    CASE WHEN v_quote.billing_mode='plan' THEN v_quote.credit_cost ELSE 0 END,
    false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_credit_quote(uuid,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_appointment_v2(uuid,uuid,timestamptz,text) TO authenticated;

-- 7) STATUS ADMIN: CONCLUSÃO DESCONTA CRÉDITOS UMA ÚNICA VEZ
CREATE OR REPLACE FUNCTION public.admin_set_appointment_status(
  p_appointment_id uuid,
  p_status public.appointment_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_a public.appointments;
  v_s public.subscriptions;
  v_new_balance integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_a
  FROM public.appointments
  WHERE id=p_appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado';
  END IF;

  IF p_status='completed'
     AND v_a.billing_mode='plan'
     AND v_a.credits_reserved > 0
     AND NOT v_a.credits_charged THEN

    SELECT * INTO v_s
    FROM public.subscriptions
    WHERE id=v_a.subscription_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Assinatura não encontrada';
    END IF;

    IF v_s.credits_remaining < v_a.credits_reserved THEN
      RAISE EXCEPTION 'Saldo de créditos insuficiente para concluir este atendimento';
    END IF;

    v_new_balance := v_s.credits_remaining - v_a.credits_reserved;

    UPDATE public.subscriptions
    SET credits_remaining=v_new_balance,
        updated_at=now()
    WHERE id=v_s.id;

    INSERT INTO public.credit_ledger(
      subscription_id,
      appointment_id,
      amount,
      balance_after,
      description
    )
    VALUES(
      v_s.id,
      v_a.id,
      -v_a.credits_reserved,
      v_new_balance,
      'Atendimento concluído'
    )
    ON CONFLICT DO NOTHING;

    UPDATE public.appointments
    SET credits_charged=true,
        updated_at=now()
    WHERE id=v_a.id;
  END IF;

  UPDATE public.appointments
  SET status=p_status,
      updated_at=now()
  WHERE id=p_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_appointment_status(uuid,public.appointment_status) TO authenticated;

-- ==========================================================
-- FIM — FASE 5.3.3
-- ==========================================================
