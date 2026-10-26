// notify-booking: sends a phone notification to every device saved on the
// signed-in account (push_subscriptions) — for a new booking, or a test.
// Runs as the signed-in user, so Row Level Security limits it to their own
// bookings and devices. The VAPID private key is a Supabase secret.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

webpush.setVapidDetails("mailto:mikeyatch01@gmail.com", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
function stay(checkin?: string | null, checkout?: string | null) {
  if (!checkin) return "";
  if (!checkout || checkout === checkin) return day(checkin);
  return checkin.slice(0, 7) === checkout.slice(0, 7)
    ? `${Number(checkin.slice(8, 10))}–${day(checkout)}`
    : `${day(checkin)} – ${day(checkout)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "Sign in first." }, 401);

  let body: { bookingId?: string; test?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body */ }

  let payload;
  if (body.test) {
    payload = { title: "Anak Homes", body: "Notifications are working on this device.", url: "settings.html", tag: "test" };
  } else {
    const { data: b } = await sb.from("bookings")
      .select("guest, apartment, checkin, checkout, total").eq("id", String(body.bookingId ?? "")).maybeSingle();
    if (!b) return json({ error: "Booking not found." }, 404);
    const total = Number(b.total) ? `TZS ${Math.round(Number(b.total)).toLocaleString("en-US")}` : "";
    payload = {
      title: `New booking: ${b.guest || "Guest"}`,
      body: [b.apartment, total, stay(b.checkin, b.checkout)].filter(Boolean).join(" · "),
      url: "bookings.html",
      tag: `booking-${body.bookingId}`,
    };
  }

  const { data: subs } = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  let sent = 0;
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 86400 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("id", s.id); // device turned it off
      else console.error("push failed", code, (e as { body?: string }).body);
    }
  }));
  return json({ sent, devices: subs?.length ?? 0 });
});
