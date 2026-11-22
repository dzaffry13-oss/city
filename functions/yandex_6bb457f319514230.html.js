// Яндекс.Вебмастер: отдаём файл подтверждения напрямую, без Pages redirect .html.
export async function onRequest() {
  const html = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body>Verification: 6bb457f319514230</body></html>';
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex'
    }
  });
}
