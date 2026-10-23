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

// Texto do push no idioma da pessoa (profiles.locale), montado pelo type + params da notificação.
// Mesmos textos de messages/partes/notificacoes.json e da função notificationText()
// (src/lib/notifications.js): ao mudar um, mude os outros. Tipo desconhecido usa title/body do banco.
const TEXTS: Record<string, Record<string, string>> = {
  "pt": {
    "nova_avaliacao_titulo": "Você recebeu uma avaliação",
    "nova_avaliacao_corpo": "{nome} avaliou você com {nota} estrelas.",
    "alguem": "Alguém",
    "nova_negociacao_titulo": "Nova solicitação de negociação",
    "nova_negociacao_corpo": "{nome} enviou uma nova proposta.",
    "um_cliente": "Um cliente",
    "nova_mensagem_titulo": "Novas mensagens",
    "nova_mensagem_corpo": "Você tem novas mensagens nesta negociação.",
    "negociacao_aceita_titulo": "Negociação aceita!",
    "negociacao_aceita_corpo": "Sua proposta foi aceita pelo prestador.",
    "negociacao_recusada_titulo": "Negociação recusada",
    "negociacao_recusada_corpo": "Sua proposta foi recusada.",
    "negociacao_cancelada_titulo": "Negociação cancelada",
    "negociacao_cancelada_corpo": "Esta negociação foi cancelada antes do aceite.",
    "operacao_cancelada_titulo": "Operação cancelada",
    "operacao_cancelada_corpo": "Sua operação foi cancelada. Toque aqui para ver o motivo e avaliar sua experiência com este usuário.",
    "status_reserva_titulo": "Status da operação atualizado",
    "status_reserva_corpo": "A operação agora está: {status}",
    "solicitacao_avaliacao_titulo": "Avalie sua experiência",
    "solicitacao_avaliacao_corpo": "A operação terminou. Compartilhe sua avaliação sobre esta experiência.",
    "status_operacao_pendente": "Aguardando início",
    "status_operacao_em_operacao": "Em operação",
    "status_operacao_em_avaliacao": "Em avaliação",
    "status_operacao_finalizada": "Finalizada",
    "status_operacao_cancelado": "Cancelada"
  },
  "en": {
    "nova_avaliacao_titulo": "You received a review",
    "nova_avaliacao_corpo": "{nome} rated you {nota} stars.",
    "alguem": "Someone",
    "nova_negociacao_titulo": "New negotiation request",
    "nova_negociacao_corpo": "{nome} sent you a new offer.",
    "um_cliente": "A client",
    "nova_mensagem_titulo": "New messages",
    "nova_mensagem_corpo": "You have new messages in this negotiation.",
    "negociacao_aceita_titulo": "Offer accepted!",
    "negociacao_aceita_corpo": "The provider accepted your offer.",
    "negociacao_recusada_titulo": "Offer declined",
    "negociacao_recusada_corpo": "Your offer was declined.",
    "negociacao_cancelada_titulo": "Negotiation canceled",
    "negociacao_cancelada_corpo": "This negotiation was canceled before it was accepted.",
    "operacao_cancelada_titulo": "Booking canceled",
    "operacao_cancelada_corpo": "Your booking was canceled. Tap here to see the reason and review your experience with this user.",
    "status_reserva_titulo": "Booking status updated",
    "status_reserva_corpo": "The booking is now: {status}",
    "solicitacao_avaliacao_titulo": "Review your experience",
    "solicitacao_avaliacao_corpo": "The booking has ended. Share your review of this experience.",
    "status_operacao_pendente": "Awaiting start",
    "status_operacao_em_operacao": "In progress",
    "status_operacao_em_avaliacao": "Awaiting review",
    "status_operacao_finalizada": "Completed",
    "status_operacao_cancelado": "Canceled"
  },
  "es": {
    "nova_avaliacao_titulo": "Recibiste una reseña",
    "nova_avaliacao_corpo": "{nome} te calificó con {nota} estrellas.",
    "alguem": "Alguien",
    "nova_negociacao_titulo": "Nueva solicitud de negociación",
    "nova_negociacao_corpo": "{nome} envió una nueva propuesta.",
    "um_cliente": "Un cliente",
    "nova_mensagem_titulo": "Nuevos mensajes",
    "nova_mensagem_corpo": "Tienes nuevos mensajes en esta negociación.",
    "negociacao_aceita_titulo": "¡Propuesta aceptada!",
    "negociacao_aceita_corpo": "El proveedor aceptó tu propuesta.",
    "negociacao_recusada_titulo": "Propuesta rechazada",
    "negociacao_recusada_corpo": "Tu propuesta fue rechazada.",
    "negociacao_cancelada_titulo": "Negociación cancelada",
    "negociacao_cancelada_corpo": "Esta negociación se canceló antes de ser aceptada.",
    "operacao_cancelada_titulo": "Reserva cancelada",
    "operacao_cancelada_corpo": "Tu reserva fue cancelada. Toca aquí para ver el motivo y calificar tu experiencia con este usuario.",
    "status_reserva_titulo": "Estado de la reserva actualizado",
    "status_reserva_corpo": "La reserva ahora está: {status}",
    "solicitacao_avaliacao_titulo": "Califica tu experiencia",
    "solicitacao_avaliacao_corpo": "La reserva terminó. Comparte tu opinión sobre esta experiencia.",
    "status_operacao_pendente": "Esperando inicio",
    "status_operacao_em_operacao": "En curso",
    "status_operacao_em_avaliacao": "Esperando reseña",
    "status_operacao_finalizada": "Finalizada",
    "status_operacao_cancelado": "Cancelada"
  }
};

type Notification = { type: string; title: string; body: string; params?: Record<string, unknown> | null };

function fill(text: string, values: Record<string, unknown>) {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

function pushText(notification: Notification, locale: string) {
  const t = TEXTS[locale] ?? TEXTS.pt;
  const p = notification.params ?? {};
  const nome = (p.nome as string) || null;
  const status = p.status ? (t["status_operacao_" + p.status] ?? String(p.status)) : null;
  switch (notification.type) {
    case "nova_avaliacao":
      return p.nota
        ? { title: t.nova_avaliacao_titulo, body: fill(t.nova_avaliacao_corpo, { nome: nome ?? t.alguem, nota: p.nota }) }
        : { title: t.nova_avaliacao_titulo, body: notification.body };
    case "nova_negociacao":
      return { title: t.nova_negociacao_titulo, body: fill(t.nova_negociacao_corpo, { nome: nome ?? t.um_cliente }) };
    case "status_reserva":
      return status
        ? { title: t.status_reserva_titulo, body: fill(t.status_reserva_corpo, { status }) }
        : { title: t.status_reserva_titulo, body: notification.body };
    case "nova_mensagem":
    case "negociacao_aceita":
    case "negociacao_recusada":
    case "negociacao_cancelada":
    case "operacao_cancelada":
    case "solicitacao_avaliacao":
      return { title: t[notification.type + "_titulo"], body: t[notification.type + "_corpo"] };
    default:
      return { title: notification.title, body: notification.body };
  }
}

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
    `${SUPABASE_URL}/rest/v1/notifications?id=eq.${encodeURIComponent(notificationId)}&select=user_id,type,title,body,link,params`,
    { headers: serviceHeaders }
  );
  const [notification] = await notifRes.json();
  if (!notification) {
    return new Response("notification not found", { status: 404 });
  }

  // idioma da pessoa; sem perfil, português
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(notification.user_id)}&select=locale`,
    { headers: serviceHeaders }
  );
  const [profile] = await profileRes.json().catch(() => []);
  const text = pushText(notification, profile?.locale ?? "pt");

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(notification.user_id)}`,
    { headers: serviceHeaders }
  );
  const subscriptions = await res.json();

  const pushPayload = JSON.stringify({
    title: text.title,
    body: text.body,
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
