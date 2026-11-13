-- Studio JM | Web Push (Android)
-- Executar uma vez em Supabase > SQL Editor.
-- Não modifica appointments, profiles nem os avisos existentes por email/WhatsApp.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_endpoint_https CHECK (left(endpoint, 8) = 'https://'),
  CONSTRAINT push_endpoint_length CHECK (char_length(endpoint) BETWEEN 20 AND 2048),
  CONSTRAINT push_keys_present CHECK (char_length(p256dh) BETWEEN 40 AND 500 AND char_length(auth_key) BETWEEN 10 AND 500)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_admin_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_admin_own
ON public.push_subscriptions
FOR ALL TO authenticated
USING (user_id = auth.uid() AND public.is_admin())
WITH CHECK (user_id = auth.uid() AND public.is_admin());

REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
ON public.push_subscriptions (user_id);

-- Registra cada tentativa (agendamento + dispositivo) para evitar envios duplicados.
-- Somente a Edge Function com service role pode consultar/modificar esta tabela.
CREATE TABLE IF NOT EXISTS public.appointment_push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  http_status integer,
  error_message text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (appointment_id, subscription_id)
);

ALTER TABLE public.appointment_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_push_deliveries FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS appointment_push_deliveries_status_idx
ON public.appointment_push_deliveries (status, attempted_at DESC);
