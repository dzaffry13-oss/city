import { loadListings, isPublic, esc } from './_lib.js';

export async function onRequest({ request, env }) {
  const reqOrigin = new URL(request.url).origin;
  const origin = 'https://city05.ru'; // адреса в карте сайта всегда https и основной домен
  const list = (await loadListings(env, reqOrigin)).filter(isPublic).sort((a, b) => b.id - a.id);
  const pages = ['pokupka', 'prodazha', 'arenda', 'uslugi', 'o-kompanii'];
  const urls = [`${origin}/`, ...pages.map((p) => `${origin}/${p}/`), ...list.map((i) => `${origin}/o/${encodeURIComponent(i.id)}`)];
  const mod = Object.fromEntries(list.filter((i) => i.updated).map((i) => [`${origin}/o/${encodeURIComponent(i.id)}`, i.updated]));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${esc(u)}</loc>${mod[u] ? `<lastmod>${esc(mod[u])}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=900' } });
}
