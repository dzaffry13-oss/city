// Публикация объекта в Telegram-канал из админки.
// Секреты задаются в Cloudflare Pages (Settings → Variables and secrets): TG_BOT_TOKEN и TG_CHANNEL.
// Доступ только у владельца репозитория: проверяется ключ GitHub из админки.

const REPO = 'dzaffry13-oss/city';
const MAX_BODY = 20 * 1024 * 1024; // всё письмо
const MAX_FILE = 4 * 1024 * 1024; // одно фото
const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (request.headers.get('Origin') !== url.origin) return json(403, { ok: false, error: 'origin' });
  const size = Number(request.headers.get('Content-Length') || 0);
  if (size > MAX_BODY) return json(413, { ok: false, error: 'size' });
  if (!env.TG_BOT_TOKEN || !env.TG_CHANNEL) return json(500, { ok: false, error: 'config' });

  let form;
  try { form = await request.formData(); } catch { return json(400, { ok: false, error: 'form' }); }

  const token = String(form.get('token') || '');
  if (!token || token.length > 255) return json(401, { ok: false, error: 'auth' });
  const gh = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'city-admin', Accept: 'application/vnd.github+json' },
  });
  const repo = gh.ok ? await gh.json().catch(() => null) : null;
  if (!repo?.permissions?.push) return json(401, { ok: false, error: 'auth' });

  const caption = String(form.get('caption') || '').slice(0, 1024);
  const files = [];
  const okFile = (f) => f && typeof f !== 'string' && f.size > 0 && f.size <= MAX_FILE && /^image\/jpeg$/i.test(f.type);
  const cover = form.get('cover');
  if (!okFile(cover)) return json(400, { ok: false, error: 'cover' });
  files.push(cover);
  for (let i = 1; i <= 9; i++) {
    const f = form.get('p' + i);
    if (f == null) continue;
    if (!okFile(f)) return json(400, { ok: false, error: 'photo' });
    files.push(f);
  }

  const out = new FormData();
  out.set('chat_id', env.TG_CHANNEL);
  let method;
  if (files.length === 1) {
    method = 'sendPhoto';
    out.set('photo', files[0], 'cover.jpg');
    out.set('caption', caption);
  } else {
    method = 'sendMediaGroup';
    out.set('media', JSON.stringify(files.map((_, i) => ({
      type: 'photo', media: `attach://f${i}`, ...(i === 0 ? { caption } : {}),
    }))));
    files.forEach((f, i) => out.set(`f${i}`, f, `f${i}.jpg`));
  }

  const tg = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, { method: 'POST', body: out });
  const res = await tg.json().catch(() => null);
  if (!tg.ok || !res?.ok) {
    console.error('Telegram publish failed', tg.status, res?.description || 'unknown');
    const d = String(res?.description || '');
    return json(502, { ok: false, error: /chat not found/i.test(d) ? 'chat' : /not enough rights|administrator|forbidden/i.test(d) ? 'rights' : 'telegram' });
  }
  return json(200, { ok: true });
}
