import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// mesmo valor guardado no Vault como 'push_webhook_secret' e enviado pelo trigger em public.notifications
const PUSH_WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET");

const serviceHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`
};

webpush.setVapidDetails(
  "mailto:demeter.agro.project@gmail.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

function timingSafeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const secret = req.headers.get("x-webhook-secret") ?? "";
  if (!PUSH_WEBHOOK_SECRET || !timingSafeEqual(secret, PUSH_WEBHOOK_SECRET)) {
    return new Response("unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const notificationId = payload?.record?.id;
  if (!notificationId) {
    return new Response("missing record id", { status: 400 });
  }

  // busca a notificação no banco em vez de confiar no conteúdo recebido
  const notifRes = await fetch(
    `${SUPABASE_URL}/rest/v1/notifications?id=eq.${encodeURIComponent(notificationId)}&select=user_id,title,body,link`,
    { headers: serviceHeaders }
  );
  const [notification] = await notifRes.json();
  if (!notification) {
    return new Response("notification not found", { status: 404 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(notification.user_id)}`,
    { headers: serviceHeaders }
  );
  const subscriptions = await res.json();

  const pushPayload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    link: notification.link
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        pushPayload
      );
    } catch (err) {
      console.error("Erro ao enviar push:", err);

      // 404/410 = inscrição expirada ou cancelada pelo navegador
      if (err.statusCode === 404 || err.statusCode === 410) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
          { method: "DELETE", headers: serviceHeaders }
        );
        console.log("Inscrição expirada removida:", sub.endpoint);
      }
    }
  }

  return new Response("ok", { status: 200 });
});
