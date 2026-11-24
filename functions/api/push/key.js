// Публичный ключ VAPID для подписки в браузере.
export async function onRequestGet({ env }) {
  if (!env.VAPID_PUBLIC || !env.PUSH) return new Response(JSON.stringify({ ok: false }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true, key: env.VAPID_PUBLIC }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
