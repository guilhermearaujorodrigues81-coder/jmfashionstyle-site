import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record?: { id?: string };
};

const jsonHeaders = { "Content-Type": "application/json" };

function formatAppointment(value: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long"
    }).format(date),
    time: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit"
    }).format(date),
  };
}

async function reserveNotification(
  supabase: ReturnType<typeof createClient>, appointmentId: string,
  channel: "email" | "whatsapp", destination: string
) {
  const { data, error } = await supabase.from("appointment_notifications").upsert({
    appointment_id: appointmentId,
    event_name: "created",
    channel,
    destination,
    status: "pending",
    attempted_at: new Date().toISOString(),
  }, { onConflict: "appointment_id,event_name,channel", ignoreDuplicates: true }).select("id,status").maybeSingle();
  if (error) throw error;
  return data;
}

async function finishNotification(
  supabase: ReturnType<typeof createClient>, id: string, status: "sent" | "failed" | "skipped",
  providerMessageId?: string, errorMessage?: string
) {
  await supabase.from("appointment_notifications").update({
    status,
    provider_message_id: providerMessageId || null,
    error_message: errorMessage?.slice(0, 1000) || null,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  }).eq("id", id);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const expectedSecret = Deno.env.get("BOOKING_WEBHOOK_SECRET");
  if (!expectedSecret || request.headers.get("x-webhook-secret") !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = await request.json() as WebhookPayload;
    const appointmentId = payload.record?.id;
    if (payload.type !== "INSERT" || payload.table !== "appointments" || !appointmentId) {
      return new Response(JSON.stringify({ skipped: true }), { headers: jsonHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    const { data: appointment, error } = await supabase.from("appointments")
      .select("id,starts_at,booking_origin,notes,profiles(full_name,phone),services(name),professionals(name)")
      .eq("id", appointmentId).single();
    if (error) throw error;

    const professionalEmail = Deno.env.get("PROFESSIONAL_EMAIL") || "studiojm27oficial@gmail.com";
    const professionalWhatsApp = Deno.env.get("PROFESSIONAL_WHATSAPP") || "5511954773332";
    const { date, time } = formatAppointment(appointment.starts_at);
    const clientName = appointment.profiles?.full_name || "Cliente";
    const serviceName = appointment.services?.name || "Serviço";
    const professionalName = appointment.professionals?.name || "Cristiano";
    const origin = appointment.booking_origin || "Site";
    const panelUrl = Deno.env.get("ADMIN_PANEL_URL") || "https://jmfashionstyle.com.br/app/admin.html#agenda";
    const subject = `Novo agendamento: ${serviceName} em ${date} às ${time}`;
    const text = `Olá, ${professionalName}!\n\nUm novo atendimento foi agendado.\nCliente: ${clientName}\nServiço: ${serviceName}\nData: ${date}\nHorário: ${time}\nOrigem: ${origin}\n\nAgenda: ${panelUrl}`;

    const results: Record<string, string> = {};
    const emailLog = await reserveNotification(supabase, appointmentId, "email", professionalEmail);
    if (emailLog) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
      if (!resendKey || !fromEmail) {
        await finishNotification(supabase, emailLog.id, "failed", undefined, "RESEND_API_KEY ou RESEND_FROM_EMAIL não configurado");
        results.email = "not_configured";
      } else {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `booking-${appointmentId}-created` },
          body: JSON.stringify({ from: fromEmail, to: [professionalEmail], subject, text }),
        });
        const body = await response.json();
        if (response.ok) {
          await finishNotification(supabase, emailLog.id, "sent", body.id);
          results.email = "sent";
        } else {
          await finishNotification(supabase, emailLog.id, "failed", undefined, JSON.stringify(body));
          results.email = "failed";
        }
      }
    } else results.email = "already_processed";

    const whatsappLog = await reserveNotification(supabase, appointmentId, "whatsapp", professionalWhatsApp);
    if (whatsappLog) {
      const token = Deno.env.get("META_WHATSAPP_TOKEN");
      const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");
      const template = Deno.env.get("META_BOOKING_TEMPLATE") || "novo_agendamento_profissional";
      if (!token || !phoneNumberId) {
        await finishNotification(supabase, whatsappLog.id, "skipped", undefined, "Conta Meta WhatsApp ainda não configurada");
        results.whatsapp = "waiting_for_meta";
      } else {
        const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp", to: professionalWhatsApp, type: "template",
            template: { name: template, language: { code: "pt_BR" }, components: [{ type: "body", parameters: [
              { type: "text", text: clientName }, { type: "text", text: serviceName },
              { type: "text", text: date }, { type: "text", text: time }
            ] }] }
          }),
        });
        const body = await response.json();
        if (response.ok) {
          await finishNotification(supabase, whatsappLog.id, "sent", body.messages?.[0]?.id);
          results.whatsapp = "sent";
        } else {
          await finishNotification(supabase, whatsappLog.id, "failed", undefined, JSON.stringify(body));
          results.whatsapp = "failed";
        }
      }
    } else results.whatsapp = "already_processed";

    return new Response(JSON.stringify({ ok: true, results }), { headers: jsonHeaders });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), { status: 500, headers: jsonHeaders });
  }
});
