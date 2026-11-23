export async function onRequest() {
  const origin = 'https://city05.ru';
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
