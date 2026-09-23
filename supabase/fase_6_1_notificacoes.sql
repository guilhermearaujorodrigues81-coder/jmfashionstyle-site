-- ==========================================================
-- STUDIO JM — FASE 6.1
-- CONTROLE DE AVISOS DE NOVOS AGENDAMENTOS
-- Execute uma única vez no SQL Editor do Supabase.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.appointment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event_name text NOT NULL DEFAULT 'created',
  channel text NOT NULL CHECK (channel IN ('email','whatsapp')),
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  provider_message_id text,
  error_message text,
  attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id,event_name,channel)
);

ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_notifications_admin_read" ON public.appointment_notifications;
CREATE POLICY "appointment_notifications_admin_read"
ON public.appointment_notifications FOR SELECT TO authenticated
USING (public.is_admin());

REVOKE ALL ON public.appointment_notifications FROM anon,authenticated;
GRANT SELECT ON public.appointment_notifications TO authenticated;

CREATE INDEX IF NOT EXISTS appointment_notifications_status_idx
ON public.appointment_notifications(status,created_at DESC);

-- A Edge Function usa a service role para inserir e atualizar os registros.
-- O webhook deve ser configurado para INSERT na tabela public.appointments.

-- ==========================================================
-- FIM — FASE 6.1
-- ==========================================================
