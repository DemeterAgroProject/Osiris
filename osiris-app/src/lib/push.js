// $lib/push.js
import { supabase } from '$lib/supabase';

/** O navegador aceita Web Push? (no iPhone, só com o app adicionado à tela de início) */
export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** @returns {'granted' | 'denied' | 'default' | 'unsupported'} */
export function pushPermission() {
  return pushSupported() ? Notification.permission : 'unsupported';
}

/**
 * Pede a permissão e inscreve o aparelho. Precisa ser chamada a partir de um toque do usuário:
 * celulares ignoram ou bloqueiam o pedido feito sem gesto.
 * @returns {Promise<boolean>} true se ficou inscrito
 */
export async function enablePush(userId) {
  if (!pushSupported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  return syncPushSubscription(userId);
}

/** @type {Promise<boolean> | null} */
let syncing = null;

/** @type {'push-service' | 'save' | 'unknown' | null} */
let lastFailure = null;

/**
 * Por que a última inscrição falhou: 'push-service' quando o navegador recusa o serviço de push
 * (o Brave vem com ele desligado), 'save' quando o banco não gravou.
 */
export function pushFailureReason() {
  return lastFailure;
}

/** Brave expõe navigator.brave; o push dele depende de uma opção nas configurações. */
export function isBrave() {
  return typeof navigator !== 'undefined' && 'brave' in navigator;
}

/**
 * Garante que este aparelho está inscrito com a chave VAPID atual e salvo no banco.
 * Não pede permissão: só age se ela já foi concedida. Se a chave mudou, refaz a inscrição.
 * @returns {Promise<boolean>}
 */
export function syncPushSubscription(userId) {
  if (pushPermission() !== 'granted' || !userId) return Promise.resolve(false);
  // o aviso e a troca de sessão podem pedir ao mesmo tempo: uma inscrição por vez
  syncing ??= subscribeThisDevice().finally(() => (syncing = null));
  return syncing;
}

async function subscribeThisDevice() {
  lastFailure = null;
  try {
    await navigator.serviceWorker.register('/sw.js');
    // subscribe() falha se o service worker ainda está instalando: espera ele ficar ativo
    const registration = await navigator.serviceWorker.ready;
    const applicationServerKey = urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY);

    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options.applicationServerKey, applicationServerKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    }

    const { endpoint, keys } = subscription.toJSON();
    // a função passa o aparelho para a conta atual, mesmo que outra conta já tenha entrado nele
    const { error } = await supabase.rpc('registrar_push', {
      p_endpoint: endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth
    });

    if (error) {
      console.error('Erro ao salvar inscrição de notificações:', error.message);
      lastFailure = 'save';
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erro ao ativar notificações:', error);
    // "Registration failed - push service error": a permissão existe, mas o serviço de push do navegador recusou
    lastFailure = error?.name === 'AbortError' || /push service/i.test(error?.message ?? '') ? 'push-service' : 'unknown';
    return false;
  }
}

/** @param {ArrayBuffer | null} current @param {Uint8Array} expected */
function sameKey(current, expected) {
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === expected.length && bytes.every((byte, i) => byte === expected[i]);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
