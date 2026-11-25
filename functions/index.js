// Главная страница: карточки объектов выводятся уже в HTML (для поисковиков и быстрого показа).
// Разметка и порядок совпадают с тем, что рисует скрипт на странице, поэтому внешне ничего не меняется.
import { asset, loadListings, esc } from './_lib.js';

const PHONE_DIGITS = '79094833939';
const DEALLBL = { prodazha: 'Продажа', arenda: 'Аренда', posutochno: 'Посуточно' };
const GLYPH = {
  kvartiry: '<path d="M18 62V14h28v48M10 62h44M25 24h4M35 24h4M25 34h4M35 34h4M25 44h4M35 44h4M28 62V54h8v8"/>',
  komnaty: '<path d="M10 14h44v40H10zM10 38h44M22 14v-4h20v4M26 54v-8h12v8"/>',
  doma: '<path d="M8 32L32 12l24 20M14 28v26h36V28M27 54V40h10v14"/>',
  uchastki: '<path d="M6 42L32 26l26 16-26 16zM32 26V10l12 6-12 6"/>',
  garazhi: '<path d="M6 28L32 12l26 16v28H6zM14 56V38h36v18M14 44h36M14 50h36"/>',
  kommerciya: '<path d="M8 26h48l-4-12H12zM10 26v28h44V26M25 54V38h14v16M8 26c0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0"/>',
};
const ICON_CHAT = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n);
const PAGE = 12;

function card(i) {
  const land = i.category === 'uchastki', u = land ? 'сот.' : 'м²';
  const per = i.deal === 'arenda' ? 'в месяц' : i.deal === 'posutochno' ? 'в сутки' : '';
  const city = String(i.city || '').trim() || 'Город не указан';
  const msg = 'Здравствуйте! Интересует объект: ' + i.title + ', город: ' + city + ', ' + fmt(i.price) + ' ₽' + (per ? ' ' + per : '') + '. Он ещё актуален?';
  const wa = 'https://wa.me/' + PHONE_DIGITS + '?text=' + encodeURIComponent(msg);
  const floorTxt = i.floor ? 'Этаж ' + i.floor + (i.floors ? ' из ' + i.floors : '') : '';
  const specs = [i.rooms ? i.rooms + ' комн.' : '', fmt(i.area) + ' ' + u, floorTxt || i.extra || ''].filter(Boolean).map((t) => '<li>' + esc(t) + '</li>').join('');
  const photos = Array.isArray(i.images) && i.images.length ? i.images : i.image ? [i.image] : [];
  const vis = photos.length
    ? '<button type="button" class="photo-open" data-photo="' + esc(photos[0]) + '" data-photo-alt="' + esc(i.title) + '" aria-label="Увеличить фотографию: ' + esc(i.title) + '"><img src="' + esc(photos[0]) + '" alt="' + esc(i.title) + '" loading="lazy"></button>'
      + (photos.length > 1 ? '<button type="button" class="gallery-arrow prev" data-gallery-prev="' + i.id + '" aria-label="Предыдущее фото">‹</button><button type="button" class="gallery-arrow next" data-gallery-next="' + i.id + '" aria-label="Следующее фото">›</button><span class="gallery-count" data-gallery-count="' + i.id + '">1 / ' + photos.length + '</span>' : '')
    : '<svg class="glyph" viewBox="0 0 64 64" aria-hidden="true">' + (GLYPH[i.category] || GLYPH.doma) + '</svg>';
  return '<article class="card' + (i.image ? ' photo-card' : '') + '"><div class="visual">' + vis + '<div class="chips"><span class="chip">' + DEALLBL[i.deal] + '</span>' + (i.demo ? '<span class="chip o">пример</span>' : '') + '</div></div>'
    + '<div class="cbody"><div class="price">' + fmt(i.price) + ' ₽' + (per ? '<small>' + per + '</small>' : '') + '</div><h3>' + esc(i.title) + '</h3><div class="loc"><strong>Город:</strong> ' + esc(city) + '</div><ul class="specs">' + specs + '</ul><div class="loc">' + esc(i.location || 'Район не указан') + '</div>'
    + '<div class="acts"><a class="ask" href="/o/' + encodeURIComponent(i.id) + '">Подробнее</a><a class="btn acc sm wa" href="' + wa + '" target="_blank" rel="noopener">' + ICON_CHAT + 'WhatsApp</a></div></div></article>';
}

export async function onRequest({ request, env, next }) {
  try {
    return await build(request, env);
  } catch {
    return next(); // при любой ошибке отдаём обычную статическую главную
  }
}

async function build(request, env) {
  const url = new URL(request.url);
  const tpl = await asset(env, url.origin, '/index.html');
  if (!tpl.ok) throw new Error('no index');
  let html = await tpl.text();
  try {
    const list = (await loadListings(env, url.origin)).filter((i) => String(i.city || '').trim() === 'Буйнакск' && !i.hidden);
    if (list.length && html.includes('<div class="cards" id="cards"></div>')) {
      html = html
        .replace('<div class="cards" id="cards"></div>', '<div class="cards" id="cards">' + list.slice(0, PAGE).map(card).join('') + '</div>')
        .replace('<span id="count"></span>', '<span id="count">Найдено: ' + list.length + '</span>')
        .replace('<div class="more-wrap" id="more-wrap" hidden>', list.length > PAGE ? '<div class="more-wrap" id="more-wrap">' : '<div class="more-wrap" id="more-wrap" hidden>');
    }
  } catch {}
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
