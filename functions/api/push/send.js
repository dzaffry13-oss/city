// Отправка уведомления подписчикам (только владелец). Пачками, чтобы не упереться в лимит запросов.
import { isOwner } from '../../_auth.js';
import { sendPush } from '../../_push.js';

const BATCH = 40;
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (request.headers.get('Origin') !== url.origin) return json(403, { ok: false, error: 'origin' });
  if (!env.PUSH || !env.VAPID_PUBLIC || !env.VAPID_PRIVATE) return json(500, { ok: false, error: 'config' });
  let data;
  try {
    const raw = await request.text();
    if (raw.length > 5000) return json(413, { ok: false, error: 'size' });
    data = JSON.parse(raw);
  } catch { return json(400, { ok: false, error: 'json' }); }
  if (!(await isOwner(data.token))) return json(401, { ok: false, error: 'auth' });

  let list = [];
  try { list = JSON.parse((await env.PUSH.get('subs')) || '[]'); } catch {}

  if (data.action === 'count') {
    const svc = (e) => { try { const h = new URL(e).hostname; return /apple/.test(h) ? 'Apple' : /googleapis/.test(h) ? 'Google' : /mozilla/.test(h) ? 'Firefox' : /windows/.test(h) ? 'Windows' : 'другое'; } catch { return 'другое'; } };
    return json(200, { ok: true, total: list.length, subs: list.map((s) => ({ t: s.t || 0, d: s.d || '', s: svc(s.e) })) });
  }

  if (data.action === 'prune') {
    const dead = new Set(Array.isArray(data.dead) ? data.dead.map(String) : []);
    await env.PUSH.put('subs', JSON.stringify(list.filter((s) => !dead.has(s.e))));
    return json(200, { ok: true });
  }

  const title = clip(data.title, 80), body = clip(data.body, 180);
  let target = clip(data.url, 200);
  if (!title || !body) return json(400, { ok: false, error: 'text' });
  if (!target.startsWith('/')) target = '/';
  const offset = Math.max(0, Number(data.offset) || 0);
  const part = list.slice(offset, offset + BATCH);
  const dead = [];
  let sent = 0;
  await Promise.all(part.map(async (s) => {
    try {
      const st = await sendPush(s, { title, body, url: target }, env);
      if (st === 404 || st === 410) dead.push(s.e);
      else if (st >= 200 && st < 300) sent++;
    } catch (e) { console.error('push failed', String(e).slice(0, 100)); }
  }));
  const next = offset + part.length;
  return json(200, { ok: true, total: list.length, sent, dead, next: next < list.length ? next : null });
}
