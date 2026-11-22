// Cloudflare Worker: принимает заявку с сайта CITY и отправляет её в Telegram.
// BOT_TOKEN и CHAT_ID хранятся как секреты Cloudflare и не попадают в код сайта.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const originOk = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': originOk ? origin : allowed[0] || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    const reply = (status, body) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
      });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { ok: false, error: 'method' });
    if (!originOk) return reply(403, { ok: false, error: 'origin' });
    if (!env.BOT_TOKEN || !env.CHAT_ID) return reply(500, { ok: false, error: 'config' });

    let data;
    try {
      const raw = await request.text();
      if (raw.length > 5000) return reply(413, { ok: false, error: 'size' });
      data = JSON.parse(raw);
    } catch {
      return reply(400, { ok: false, error: 'json' });
    }

    // Скрытое поле-ловушка для ботов: люди его не заполняют.
    if (clip(data.website, 100)) return reply(200, { ok: true });

    if (data.consent !== 'on' && data.consent !== true) {
      return reply(400, { ok: false, error: 'consent' });
    }

    const name = clip(data.name, 80);
    const phone = clip(data.phone, 30);
    const message = clip(data.message, 1000);
    const topic = clip(data.topic, 120);
    const page = clip(data.page, 200);
    const digits = phone.replace(/\D/g, '');
    if (!name || digits.length < 10 || digits.length > 15) {
      return reply(400, { ok: false, error: 'validation' });
    }

    const text = [
      '<b>Новая заявка с сайта CITY</b>',
      topic && `Тема: ${esc(topic)}`,
      `Имя: ${esc(name)}`,
      `Телефон: ${esc(phone)}`,
      message && `Сообщение: ${esc(message)}`,
      page && `Страница: ${esc(page)}`,
    ]
      .filter(Boolean)
      .join('\n');

    const tg = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    let tgResult;
    try { tgResult = await tg.json(); } catch { tgResult = null; }
    if (!tg.ok || !tgResult?.ok) {
      console.error('Telegram delivery failed', tg.status, tgResult?.description || 'unknown');
      return reply(502, { ok: false, error: 'telegram' });
    }
    return reply(200, { ok: true });
  },
};
