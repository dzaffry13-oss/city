// Старые адреса *.pages.dev ведут на основной домен: у сайта должен быть один адрес.
const MAIN = 'https://city05.ru';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname.endsWith('.pages.dev')) {
    return Response.redirect(MAIN + url.pathname + url.search, 301);
  }
  return next();
}
