// Studio JM — Web Push para o Android do administrador.
// GET: somente a chave PUBLICA VAPID.
// POST: somente webhook Supabase autenticado por x-webhook-secret.
// Necessario: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
// BOOKING_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "https://studiojmoficial.com.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: cors });
}
function asRelatedName(value: unknown, fallback: string) {
  const v = Array.isArray(value) ? value[0] : value;
  if (v && typeof v === "object" && "name" in v) return String(v.name || fallback);
  if (v && typeof v === "object" && "full_name" in v) return String(v.full_name || fallback);
  return fallback;
}
function dateAndTime(startsAt: string) {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) throw Error("Data de agendamento inválida");
  const day = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(date);
  const hour = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
  return { day, hour };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method === "GET") {
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    return publicKey ? json({ publicKey }) : json({ error: "VAPID não configurado" }, 503);
  }
  if (request.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const secret = Deno.env.get("BOOKING_WEBHOOK_SECRET");
  if (!secret || request.headers.get("x-webhook-secret") !== secret) return json({ error: "Não autorizado" }, 401);

  try {
    const payload = await request.json();
    if (payload?.type !== "INSERT" || payload?.schema !== "public" ||
        payload?.table !== "appointments" || !payload?.record?.id) {
      return json({ skipped: "Evento não aplicável" });
    }

    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT");
    if (!publicKey || !privateKey || !subject) return json({ error: "VAPID não configurado" }, 503);
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    // Consulta os dados atuais: não confiar nos nomes do payload do webhook.
    const { data: appointment, error: bookingError } = await supabase.from("appointments")
      .select("id,starts_at,status,profiles(full_name),services(name)")
      .eq("id", payload.record.id).single();
    if (bookingError) throw bookingError;
    if (!["pending", "confirmed"].includes(appointment.status)) return json({ skipped: "Agendamento não ativo" });
    const name = asRelatedName(appointment.profiles, "Cliente");
    const service = asRelatedName(appointment.services, "Serviço");
    const { day, hour } = dateAndTime(appointment.starts_at);

    const { data: subscriptions, error: subsError } = await supabase.from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth_key");
    if (subsError) throw subsError;
    if (!subscriptions?.length) return json({ ok: true, delivered: 0, reason: "Nenhum aparelho ativado" });

    // Somente contas ADMIN recebem os dados do cliente.
    const ids = [...new Set(subscriptions.map(s => s.user_id))];
    const { data: admins, error: adminError } = await supabase.from("profiles")
      .select("id").in("id", ids).eq("role", "admin");
    if (adminError) throw adminError;
    const adminIds = new Set((admins || []).map(x => x.id));

    let sent = 0, failed = 0;
    for (const sub of subscriptions.filter(s => adminIds.has(s.user_id))) {
      // INSERT ON CONFLICT DO NOTHING: webhook repetido nao dispara o mesmo push.
      const { data: delivery, error: deliveryError } = await supabase
        .from("appointment_push_deliveries")
        .upsert({ appointment_id: appointment.id, subscription_id: sub.id, status: "pending" }, {
          onConflict: "appointment_id,subscription_id", ignoreDuplicates: true,
        }).select("id").maybeSingle();
      if (deliveryError) { console.error("delivery insert", deliveryError); failed++; continue; }
      if (!delivery) continue;

      try {
        const result = await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        }, JSON.stringify({
          title: "Studio JM — Novo agendamento",
          body: name + " agendou " + service + " para " + day + " às " + hour + ".",
          tag: "appointment-" + appointment.id,
        }), { TTL: 3600, urgency: "high" });
        await supabase.from("appointment_push_deliveries").update({
          status: "sent", http_status: result.statusCode, sent_at: new Date().toISOString(),
        }).eq("id", delivery.id);
        sent++;
      } catch (err) {
        const code = typeof err === "object" && err && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode) : null;
        console.error("push failed", code, err);
        await supabase.from("appointment_push_deliveries").update({
          status: "failed", http_status: code,
          error_message: String(err).slice(0, 500),
        }).eq("id", delivery.id);
        if (code === 404 || code === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        failed++;
      }
    }
    return json({ ok: true, sent, failed });
  } catch (err) {
    console.error("appointment-push", err);
    return json({ error: "Erro ao processar a notificação" }, 500);
  }
});
