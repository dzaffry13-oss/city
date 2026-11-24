// Web Push (RFC 8030, шифрование RFC 8291 aes128gcm, подпись VAPID RFC 8292) на WebCrypto, без внешних библиотек.
const enc = new TextEncoder();
export const b64u = (buf) => {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const c of u) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const unb64u = (s) => {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const concat = (...a) => {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of a) { out.set(x, o); o += x.length; }
  return out;
};

// Разрешённые адреса push-сервисов (защита от того, чтобы сервер ходил на произвольные адреса).
const HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/, /^push\.services\.mozilla\.com$/];
export function endpointOk(endpoint) {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && endpoint.length < 600 && HOSTS.some((r) => r.test(u.hostname));
  } catch { return false; }
}

async function vapidJwt(aud, publicKey, privateKey, subject) {
  const pub = unb64u(publicKey); // 65 байт: 0x04 | X | Y
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: privateKey, ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`));
  return `${head}.${body}.${b64u(sig)}`;
}

export async function encryptPayload(sub, payloadBytes) {
  const uaPublic = unb64u(sub.p);
  const authSecret = unb64u(sub.a);
  const asKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256);
  const hkdf = async (salt, ikm, info, bits) => {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, bits));
  };
  const ikm = await hkdf(authSecret, new Uint8Array(ecdh), concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 256);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 96);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(payloadBytes, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 0x10, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

// Возвращает статус ответа push-сервиса. 404/410 означают, что подписка больше не действует.
export async function sendPush(sub, message, env) {
  const aud = new URL(sub.e).origin;
  const jwt = await vapidJwt(aud, env.VAPID_PUBLIC, env.VAPID_PRIVATE, 'mailto:info@city05.ru');
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(message)));
  const r = await fetch(sub.e, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
  });
  return r.status;
}
