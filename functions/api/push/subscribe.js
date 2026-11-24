import { endpointOk, unb64u } from '../../_push.js';

const MAX_SUBS = 5000;
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function load(env) {
  try { return JSON.parse((await env.PUSH.get('subs')) || '[]'); } catch { return []; }
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (request.headers.get('Origin') !== url.origin) return json(403, { ok: false, error: 'origin' });
  if (!env.PUSH) return json(503, { ok: false, error: 'config' });
  let data;
  try {
    const raw = await request.text();
    if (raw.length > 3000) return json(413, { ok: false, error: 'size' });
    data = JSON.parse(raw);
  } catch { return json(400, { ok: false, error: 'json' }); }

  const e = String(data.endpoint || '');
  if (!endpointOk(e)) return json(400, { ok: false, error: 'endpoint' });

  const list = await load(env);
  if (data.action === 'unsubscribe') {
    await env.PUSH.put('subs', JSON.stringify(list.filter((s) => s.e !== e)));
    return json(200, { ok: true });
  }
  let p, a;
  try { p = String(data.keys?.p256dh || ''); a = String(data.keys?.auth || ''); if (unb64u(p).length !== 65 || unb64u(a).length !== 16) throw 0; } catch { return json(400, { ok: false, error: 'keys' }); }
  if (!list.some((s) => s.e === e)) {
    if (list.length >= MAX_SUBS) return json(429, { ok: false, error: 'limit' });
    list.push({ e, p, a, t: Date.now() });
  } else {
    const i = list.findIndex((s) => s.e === e);
    list[i] = { ...list[i], p, a };
  }
  await env.PUSH.put('subs', JSON.stringify(list));
  return json(200, { ok: true });
}
