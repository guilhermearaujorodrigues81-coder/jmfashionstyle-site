/* Studio JM - permissao de notificacoes, apenas para administradores.
 * A chave VAPID publica vem da Edge Function. A chave privada nunca sai do servidor.
 */
(() => {
  const feedback = (message, error = false) => {
    const status = document.getElementById("pushStatus");
    if (status) {
      status.textContent = message;
      status.style.color = error ? "#b91c1c" : "";
    }
  };
  const button = () => document.getElementById("enablePushNotifications");
  const supportsPush = () => "serviceWorker" in navigator &&
    "PushManager" in window && "Notification" in window;

  function decodeKey(base64url) {
    const normalized = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }

  async function start() {
    // Nunca renderizar o controle antes da validacao da permissao admin.
    const auth = await requireAdmin();
    if (!auth) return;
    const panel = document.getElementById("pushNotificationPanel");
    if (!panel) return;
    panel.hidden = false;
    const btn = button();

    if (!supportsPush()) {
      btn.disabled = true;
      feedback("Este navegador não oferece notificações push. Use o Chrome atualizado no Android.", true);
      return;
    }

    if (Notification.permission === "denied") {
      btn.disabled = true;
      feedback("Notificações bloqueadas. Libere nas configurações do Chrome para este site.", true);
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      btn.textContent = "Notificações ativadas";
      // Um subscription antigo pode não estar salvo no Supabase:
      // sincronizar novamente ao abrir o painel.
      await saveSubscription(auth.session.user.id, subscription);
      feedback("Este celular está preparado para receber avisos de novos agendamentos.");
    } else {
      feedback("Toque no botão para autorizar os avisos no Android.");
    }
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        if (Notification.permission === "denied") throw new Error("Permissão bloqueada nas configurações do navegador.");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Permissão não concedida. Autorize os avisos para continuar.");

        const { data, error } = await sb.functions.invoke("appointment-push", { method: "GET" });
        if (error) throw error;
        if (!data?.publicKey) throw new Error("Chave pública VAPID ainda não configurada no Supabase.");
        const existing = await registration.pushManager.getSubscription();
        const sub = existing || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeKey(data.publicKey)
        });
        await saveSubscription(auth.session.user.id, sub);
        btn.textContent = "Notificações ativadas";
        feedback("Pronto! O Cristiano receberá avisos neste Android.");
      } catch (err) {
        console.error("Falha ao ativar Web Push:", err);
        feedback(err?.message || "Não foi possível ativar as notificações.", true);
      } finally {
        btn.disabled = Notification.permission === "denied";
      }
    });
  }

  async function saveSubscription(userId, sub) {
    const record = sub.toJSON();
    if (!record?.endpoint || !record?.keys?.p256dh || !record?.keys?.auth) {
      throw new Error("O navegador não retornou uma assinatura push válida.");
    }
    const { error } = await sb.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: record.endpoint,
      p256dh: record.keys.p256dh,
      auth_key: record.keys.auth,
      updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
    if (error) throw error;
  }

  document.addEventListener("DOMContentLoaded", () => {
    start().catch(err => {
      console.error("Push Studio JM:", err);
      feedback("Não foi possível preparar as notificações. Confira a configuração do Supabase.", true);
    });
  });
})();
