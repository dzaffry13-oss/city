// Статистика по объектам: просмотры, звонки, WhatsApp, заявки. Хранится в KV (привязка PUSH, ключи "st:<id>").
// Запись — с сайта (тот же origin, без ботов, не чаще раза за визит со стороны страницы); чтение — только владелец.
import { isOwner } from '../_auth.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const EVENTS = { view: 'v', call: 'c', wa: 'w', lead: 'l', fav: 'f', share: 's' };
const BOT = /bot|spider|crawl|slurp|headless|preview|facebookexternalhit|monitor|lighthouse|python|curl|wget|go-http|java\//i;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const DAYS = 30;
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (request.headers.get('Origin') !== url.origin) return json(403, { ok: false });
  if (!env.PUSH) return json(503, { ok: false, error: 'config' });
  let data;
  try {
    const raw = await request.text();
    if (raw.length > 4000) return json(413, { ok: false });
    data = JSON.parse(raw);
  } catch { return json(400, { ok: false }); }

  // Чтение для админки
  if (data.action === 'get') {
    if (!(await isOwner(data.token))) return json(401, { ok: false, error: 'auth' });
    const ids = (Array.isArray(data.ids) ? data.ids : []).map(String).filter((i) => ID.test(i)).slice(0, 200);
    const out = {};
    const cut = day(Date.now() - 6 * 864e5);
    await Promise.all(ids.map(async (id) => {
      let s; try { s = JSON.parse((await env.PUSH.get('st:' + id)) || 'null'); } catch {}
      if (!s) return;
      const w7 = Object.entries(s.d || {}).filter(([k]) => k >= cut).reduce((a, [, n]) => a + n, 0);
      out[id] = { v: s.v || 0, c: s.c || 0, w: s.w || 0, l: s.l || 0, f: s.f || 0, s: s.s || 0, w7 };
    }));
    return json(200, { ok: true, stats: out });
  }

  // Запись события
  const key = EVENTS[data.ev];
  const id = String(data.id || '');
  if (!key || !ID.test(id)) return json(400, { ok: false });
  const ua = request.headers.get('User-Agent') || '';
  if (!ua || BOT.test(ua)) return json(200, { ok: true, skipped: 'bot' });

  let s = null;
  try { s = JSON.parse((await env.PUSH.get('st:' + id)) || 'null'); } catch {}
  if (!s) {
    // Новые ключи заводим только для реально существующих объектов.
    try {
      const r = await env.ASSETS.fetch(new URL('/listings.json', url));
      const list = await r.json();
      if (!list.some((x) => String(x.id) === id)) return json(200, { ok: true, skipped: 'unknown' });
    } catch { return json(200, { ok: true, skipped: 'nolist' }); }
    s = { v: 0, c: 0, w: 0, l: 0, f: 0, s: 0, d: {} };
  }
  s[key] = (s[key] || 0) + 1;
  if (key === 'v') {
    s.d = s.d || {};
    const t = day();
    s.d[t] = (s.d[t] || 0) + 1;
    const keep = day(Date.now() - DAYS * 864e5);
    for (const k of Object.keys(s.d)) if (k < keep) delete s.d[k];
  }
  await env.PUSH.put('st:' + id, JSON.stringify(s));
  return json(200, { ok: true });
}
