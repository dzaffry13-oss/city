// Один адрес сайта: старые *.pages.dev и www ведут на основной домен.
const MAIN = 'https://city05.ru';
const YANDEX_PATHS = new Set(['/yandex_6bb457f319514230.html', '/yandex_df676b419be8155b.html']);
const YANDEX_HTML = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body>Verification: 6bb457f319514230</body></html>';
const YANDEX_NEW_HTML = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body>Verification: df676b419be8155b</body></html>';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);

  // Отдаём подтверждение Яндекса до обработки clean URLs в Cloudflare Pages.
  if (url.hostname === 'city05.ru' && YANDEX_PATHS.has(url.pathname)) {
    return new Response(url.pathname === '/yandex_df676b419be8155b.html' ? YANDEX_NEW_HTML : YANDEX_HTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'no-store',
      }
    });
  }

  if (url.hostname.endsWith('.pages.dev') || url.hostname === 'www.city05.ru') {
    return Response.redirect(MAIN + url.pathname + url.search, 301);
  }
  return next();
}
