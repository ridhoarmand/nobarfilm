import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

// SSRF guard for server-side fetches of user-supplied URLs (video/subtitle proxies).
const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['224.0.0.0', 3],
] as const) blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], // IPv4-mapped (::ffff:a.b.c.d) is matched by the IPv4 rules above
] as const) blocked.addSubnet(net, prefix, 'ipv6');

export class BlockedUrlError extends Error {}

export async function isPublicUrl(url: URL): Promise<boolean> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  // Single-label names (localhost, docker service names like "portainer") are internal
  if (!isIP(host) && !host.includes('.')) return false;
  try {
    const addrs = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !blocked.check(a.address, a.family === 6 ? 'ipv6' : 'ipv4'));
  } catch {
    return false;
  }
}

// shortcut: DNS is resolved again by fetch, so a rebinding DNS server can still race this check; pin the IP via an undici Agent if that matters.
export async function fetchPublic(url: string | URL, init: RequestInit = {}, maxRedirects = 5): Promise<Response> {
  let current = new URL(url);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!(await isPublicUrl(current))) throw new BlockedUrlError(`Blocked target: ${current.host}`);
    const res = await fetch(current, { ...init, redirect: 'manual' });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!location) return res;
    await res.body?.cancel();
    current = new URL(location, current);
  }
  throw new Error('Too many redirects');
}
