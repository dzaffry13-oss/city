// Отдельная страница объекта: /o/<id>. Отдаёт object.html с готовыми
// названием, ценой, фото и описанием для поисковиков и превью в мессенджерах.
import { asset, loadListings, isPublic, esc, fmt, descriptionOf } from '../_lib.js';

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const id = String(params.id || '');
  const [list, tpl] = await Promise.all([loadListings(env, url.origin), asset(env, url.origin, '/object.html')]);
  const item = list.find((x) => String(x.id) === id);
  let html = tpl.ok ? await tpl.text() : '';
  if (!html) return new Response('Страница временно недоступна', { status: 502 });

  if (!isPublic(item)) {
    html = html.replace('</head>', '<meta name="robots" content="noindex"></head>');
    return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const page = `${url.origin}/o/${encodeURIComponent(item.id)}`;
  const photos = (Array.isArray(item.images) && item.images.length ? item.images : item.image ? [item.image] : []).map((p) => new URL('/' + String(p).replace(/^\/+/, ''), url.origin).toString());
  const per = item.deal === 'arenda' ? ' в месяц' : item.deal === 'posutochno' ? ' в сутки' : '';
  const title = `${item.title} — ${fmt(item.price)} ₽${per}, ${item.city || 'Буйнакск'} | CITY`;
  const desc = descriptionOf(item);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: item.title,
    description: desc,
    url: page,
    ...(item.updated ? { datePosted: item.updated } : {}),
    ...(photos.length ? { image: photos } : {}),
    offers: { '@type': 'Offer', price: Number(item.price) || 0, priceCurrency: 'RUB', availability: 'https://schema.org/InStock' },
    address: { '@type': 'PostalAddress', addressLocality: item.city || 'Буйнакск', addressCountry: 'RU', streetAddress: String(item.location || '').replace(/^.*?·\s*/, '') },
  };
  const meta = [
    `<link rel="canonical" href="${esc(page)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="CITY — недвижимость в Буйнакске">`,
    `<meta property="og:locale" content="ru_RU">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(page)}">`,
    ...(photos.length ? [`<meta property="og:image" content="${esc(photos[0])}">`, `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:image" content="${esc(photos[0])}">`] : []),
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
    `<base href="/">`,
  ].join('\n');

  // Краткое содержание для поисковиков; браузер подменит его полной версией страницы.
  const plain = `<h2>${esc(item.title)}</h2><p>${esc(fmt(item.price))} ₽${esc(per)}. ${esc(item.location || '')}</p><p>${esc(String(item.description || '')).replace(/\n+/g, '<br>')}</p>`;

  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}">`)
    .replace('<head>', `<head>\n<base href="/">`)
    .replace('</head>', meta.replace('<base href="/">', '') + '\n</head>')
    .replace(/(<div id="loading" class="panel">)[\s\S]*?(<\/div>)/, `$1${plain}$2`);

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
