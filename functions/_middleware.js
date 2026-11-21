// Один адрес сайта: старые *.pages.dev и www ведут на основной домен.
const MAIN = 'https://city05.ru';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname.endsWith('.pages.dev') || url.hostname === 'www.city05.ru') {
    return Response.redirect(MAIN + url.pathname + url.search, 301);
  }
  return next();
}
