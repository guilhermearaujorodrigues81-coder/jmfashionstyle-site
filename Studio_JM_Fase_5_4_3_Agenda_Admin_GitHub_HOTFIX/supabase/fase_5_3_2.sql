
-- ==========================================================
-- STUDIO JM — FASE 5.3.2
-- ATIVAÇÃO, CICLO E CRÉDITOS
-- ==========================================================

-- Ativa uma solicitação pendente e inicia um ciclo de 30 dias.
-- Apenas administradores podem executar.
CREATE OR REPLACE FUNCTION public.admin_activate_subscription(p_subscription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_sub public.subscriptions;
  v_plan public.plans;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE id=p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Assinatura não encontrada'; END IF;
  IF v_sub.status <> 'pending' THEN RAISE EXCEPTION 'Somente solicitações pendentes podem ser ativadas'; END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id=v_sub.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano não encontrado'; END IF;

  UPDATE public.subscriptions
  SET status='active',
      starts_at=current_date,
      ends_at=current_date + 30,
      credits_total=v_plan.monthly_credits,
      credits_remaining=v_plan.monthly_credits,
      freestyles_total=v_plan.freestyles,
      freestyles_remaining=v_plan.freestyles,
      hydrations_total=v_plan.hydrations,
      hydrations_remaining=v_plan.hydrations,
      activated_at=now(),
      updated_at=now()
  WHERE id=p_subscription_id;
END;
$$;

-- Renova manualmente o ciclo por mais 30 dias e repõe benefícios.
CREATE OR REPLACE FUNCTION public.admin_renew_subscription(p_subscription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_sub public.subscriptions;
  v_plan public.plans;
  v_start date;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT * INTO v_sub FROM public.subscriptions WHERE id=p_subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assinatura não encontrada'; END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id=v_sub.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano não encontrado'; END IF;

  v_start := CASE
    WHEN v_sub.ends_at IS NOT NULL AND v_sub.ends_at >= current_date THEN v_sub.ends_at
    ELSE current_date
  END;

  UPDATE public.subscriptions
  SET status='active',
      starts_at=v_start,
      ends_at=v_start + 30,
      credits_total=v_plan.monthly_credits,
      credits_remaining=v_plan.monthly_credits,
      freestyles_total=v_plan.freestyles,
      freestyles_remaining=v_plan.freestyles,
      hydrations_total=v_plan.hydrations,
      hydrations_remaining=v_plan.hydrations,
      updated_at=now()
  WHERE id=p_subscription_id;
END;
$$;

-- Suspende plano ativo.
CREATE OR REPLACE FUNCTION public.admin_suspend_subscription(p_subscription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public.subscriptions SET status='suspended',updated_at=now()
  WHERE id=p_subscription_id AND status='active';
END;
$$;

-- Reativa plano suspenso sem alterar o saldo/ciclo.
CREATE OR REPLACE FUNCTION public.admin_resume_subscription(p_subscription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public.subscriptions SET status='active',updated_at=now()
  WHERE id=p_subscription_id AND status='suspended';
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activate_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_renew_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resume_subscription(uuid) TO authenticated;
