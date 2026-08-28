-- ==========================================================
-- STUDIO JM — FASE 6.0
-- AGENDA OPERACIONAL / ENCAIXE CRIADO PELO SALÃO
-- Execute uma única vez no SQL Editor do Supabase.
-- ==========================================================

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS operational_stage text NOT NULL DEFAULT 'scheduled';

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS booking_origin text NOT NULL DEFAULT 'Site';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='appointments_operational_stage_check'
  ) THEN
    ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_operational_stage_check
    CHECK (operational_stage IN ('scheduled','arrived','in_service','done'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='appointments_booking_origin_check'
  ) THEN
    ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_booking_origin_check
    CHECK (booking_origin IN ('Site','Presencial','WhatsApp','Telefone'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_create_appointment_v60(
  p_user_id uuid,
  p_professional_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_notes text DEFAULT NULL,
  p_origin text DEFAULT 'Presencial'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_service public.services;
  v_subscription public.subscriptions;
  v_rule public.plan_service_rules;
  v_end timestamptz;
  v_date date;
  v_reserved integer := 0;
  v_billing text := 'avulso';
  v_credit_cost integer := 0;
  v_appointment_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_user_id AND role='client') THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  SELECT * INTO v_service
  FROM public.services
  WHERE id=p_service_id AND active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Serviço indisponível'; END IF;

  IF p_origin NOT IN ('Site','Presencial','WhatsApp','Telefone') THEN
    RAISE EXCEPTION 'Origem de agendamento inválida';
  END IF;

  v_date := (p_starts_at AT TIME ZONE 'America/Sao_Paulo')::date;
  v_end := p_starts_at + make_interval(mins=>v_service.duration_minutes);

  SELECT s.* INTO v_subscription
  FROM public.subscriptions s
  WHERE s.user_id=p_user_id
    AND s.status='active'
    AND s.starts_at IS NOT NULL
    AND s.ends_at IS NOT NULL
    AND v_date BETWEEN s.starts_at AND s.ends_at
  ORDER BY s.activated_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    SELECT r.* INTO v_rule
    FROM public.plan_service_rules r
    WHERE r.plan_id=v_subscription.plan_id
      AND r.service_id=p_service_id
      AND r.included=true;

    IF FOUND THEN
      SELECT COALESCE(SUM(a.credits_reserved),0)::integer INTO v_reserved
      FROM public.appointments a
      WHERE a.subscription_id=v_subscription.id
        AND a.billing_mode='plan'
        AND a.credits_charged=false
        AND a.status IN ('pending','confirmed');

      IF (v_subscription.credits_remaining-v_reserved)>=v_rule.credit_cost THEN
        v_billing := 'plan';
        v_credit_cost := v_rule.credit_cost;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.appointments(
    user_id,professional_id,service_id,starts_at,ends_at,status,notes,
    subscription_id,billing_mode,credits_reserved,credits_charged,
    operational_stage,booking_origin
  ) VALUES (
    p_user_id,p_professional_id,p_service_id,p_starts_at,v_end,'confirmed',
    NULLIF(trim(COALESCE(p_notes,'')),''),
    CASE WHEN v_billing='plan' THEN v_subscription.id ELSE NULL END,
    v_billing,v_credit_cost,false,'scheduled',p_origin
  )
  RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_appointment_v60(uuid,uuid,uuid,timestamptz,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_create_appointment_v60(uuid,uuid,uuid,timestamptz,text,text) TO authenticated;

-- ==========================================================
-- FIM — FASE 6.0
-- ==========================================================
