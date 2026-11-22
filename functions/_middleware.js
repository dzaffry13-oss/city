// Один адрес сайта: старые *.pages.dev и www ведут на основной домен.
const MAIN = 'https://city05.ru';
const YANDEX_PATH = '/yandex_6bb457f319514230.html';
const YANDEX_HTML = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body>Verification: 6bb457f319514230</body></html>';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);

  // Отдаём подтверждение Яндекса до обработки clean URLs в Cloudflare Pages.
  if (url.hostname === 'city05.ru' && url.pathname === YANDEX_PATH) {
    return new Response(YANDEX_HTML, {
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
