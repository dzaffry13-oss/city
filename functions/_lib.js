// Общие помощники для страниц объектов (Cloudflare Pages Functions).
export const CITY = 'Буйнакск';
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Number(n) || 0).replace(/\u00a0|\u202f/g, ' ');

// Забирает файл сайта; Cloudflare может перенаправлять /file.html на /file, поэтому идём по редиректам.
export async function asset(env, origin, path) {
  let url = new URL(path, origin).toString();
  for (let i = 0; i < 3; i++) {
    const r = await env.ASSETS.fetch(new Request(url, { redirect: 'manual' }));
    if (r.status >= 300 && r.status < 400 && r.headers.get('Location')) {
      url = new URL(r.headers.get('Location'), url).toString();
      continue;
    }
    return r;
  }
  return new Response('', { status: 508 });
}

export async function loadListings(env, origin) {
  const r = await asset(env, origin, '/listings.json');
  if (!r.ok) return [];
  try { return await r.json(); } catch { return []; }
}

export const isPublic = (i) => i && !i.hidden && String(i.city || '').trim() === CITY;

export function descriptionOf(i) {
  const unit = i.category === 'uchastki' ? 'сот.' : 'м²';
  const deal = { prodazha: 'Продажа', arenda: 'Аренда', posutochno: 'Посуточно' }[i.deal] || '';
  const head = `${deal}: ${i.title}, ${i.city || CITY}${i.location ? ', ' + String(i.location).replace(/^.*?·\s*/, '') : ''}. ${i.area ? i.area + ' ' + unit + '. ' : ''}Цена ${fmt(i.price)} ₽.`;
  const body = String(i.description || '').replace(/\s+/g, ' ').trim();
  return (head + ' ' + body).slice(0, 300).trim();
}
