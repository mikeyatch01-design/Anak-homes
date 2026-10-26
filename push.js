// ---------- Phone notifications (Web Push) ----------
// Each device that turns notifications on (Settings → Phone notifications)
// saves a push "subscription" to Supabase. When a new booking is added, the
// app asks the notify-booking Supabase function to send a notification to
// every device saved on this account. The public key below is meant to be
// public; its private half lives only in the Supabase function's secrets.
const VAPID_PUBLIC_KEY = 'BPI61V2AC7LzPLK9mB1dS789_iq68ZQFuLu9eXg8ycCu-3Nx2LC9JPJHa-VHzhoJas9IzdY_xgEIiLZSvA62Aek';

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isInstalledApp() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
function pushDeviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'Browser';
}

function base64UrlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function pushRegistration() {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  await navigator.serviceWorker.register('sw.js');
  return navigator.serviceWorker.ready;
}

async function currentPushSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Notifications are blocked for Anak Homes. Allow them in your phone or browser settings, then try again.'
      : 'Notifications weren’t allowed.');
  }
  const reg = await pushRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) });
  const j = sub.toJSON();
  const { error } = await sb.from('push_subscriptions').upsert(
    { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, device: pushDeviceLabel() },
    { onConflict: 'endpoint' });
  if (error) throw error;
}

async function disablePush() {
  const sub = await currentPushSubscription();
  if (!sub) return;
  await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

// Fire-and-forget after a NEW booking is saved; never blocks or breaks saving.
function notifyNewBooking(dbId) {
  if (!dbId) return;
  sb.functions.invoke('notify-booking', { body: { bookingId: dbId } })
    .then(({ error }) => { if (error) console.error('notify-booking failed:', error); })
    .catch(err => console.error('notify-booking failed:', err));
}

async function sendTestPush() {
  const { data, error } = await sb.functions.invoke('notify-booking', { body: { test: true } });
  if (error) throw error;
  return data;
}
