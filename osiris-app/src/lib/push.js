// $lib/push.js
import { supabase } from '$lib/supabase';

export async function subscribeToPush(userId) {

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  const registration = await navigator.serviceWorker.register('/sw.js');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
  });

  const { endpoint, keys } = subscription.toJSON();

  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'endpoint' }
  );

}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}