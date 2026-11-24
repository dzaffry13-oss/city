// Доступ только у владельца репозитория: проверяется ключ GitHub из админки.
const REPO = 'dzaffry13-oss/city';
export async function isOwner(token) {
  token = String(token || '');
  if (!token || token.length > 255) return false;
  const gh = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'city-admin', Accept: 'application/vnd.github+json' },
  });
  const repo = gh.ok ? await gh.json().catch(() => null) : null;
  return !!repo?.permissions?.push;
}
