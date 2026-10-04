/**
 * H5 web API client (todo 4, plan web-h5-indonesia-noauth).
 * Plain browser-style fetch against the H5 BFF: NO HMAC, NO Bearer, NO master env.
 * Centralizes the H5 path prefix, lang=id signals (query/headers), the referer
 * origin, and ordered host fallback (network error / HTTP 5xx / 404 -> next host).
 */
import {
  WEB_BFF_HOSTS,
  WEB_REFERER_ORIGIN,
  H5_PATH_PREFIX,
  WEB_CLIENT_UA,
} from './config';

export interface H5FetchOptions {
  query?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: unknown;
  referer?: string;
}

function buildUrl(host: string, path: string, query?: Record<string, string>): URL {
  const url = new URL(`${host}${H5_PATH_PREFIX}${path}`);
  url.searchParams.set('lang', 'id');
  url.searchParams.set('host', url.host);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

function buildHeaders(referer: string): HeadersInit {
  return {
    accept: 'application/json',
    'user-agent': WEB_CLIENT_UA,
    'x-client-info': '{"timezone":"Asia/Jakarta"}',
    'X-Request-Lang': 'id',
    referer,
  };
}

/**
 * Fetch an H5 BFF endpoint with ordered host fallback.
 * URL = {host}{H5_PATH_PREFIX}{path}?lang=id&host={host}&...query
 * On network error, HTTP 5xx or 404 the next host is tried; when every host
 * fails the thrown error names every host with its reason.
 */
export async function h5Fetch(path: string, opts: H5FetchOptions = {}): Promise<unknown> {
  const method = opts.method ?? 'GET';
  const referer = opts.referer ?? `${WEB_REFERER_ORIGIN}/`;
  const headers = buildHeaders(referer);

  const attempts: string[] = [];
  for (const host of WEB_BFF_HOSTS) {
    const url = buildUrl(host, path, opts.query);
    try {
      const res = await fetch(url, {
        method,
        headers: method === 'POST' && opts.body !== undefined
          ? { ...headers, 'content-type': 'application/json' }
          : headers,
        body: method === 'POST' && opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        attempts.push(`${host}: HTTP ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (err) {
      attempts.push(`${host}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`H5 BFF request failed for ${path} — all ${WEB_BFF_HOSTS.length} host(s) down: ${attempts.join(' | ')}`);
}
