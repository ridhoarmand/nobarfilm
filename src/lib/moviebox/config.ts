// MovieBox gateway configuration — single source of truth for provider protocol values.
// Update these in ONE place when the provider releases a new app version and changes
// the protocol/version/headers. Never hardcode these values in services.ts / client.ts.
export const GATEWAY_SECRET = '76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O';
export const keyBuffer = Buffer.from(GATEWAY_SECRET, 'base64');
export const HOST = 'api6.aoneroom.com';
export const ALLOWED_SUBJECT_TYPES = new Set([1, 2]);

// Client identity sent to the gateway. Bump APP_VERSION when the provider ships a
// new APK — if the stream flow changed, the gateway expects a newer version header.
export const APP_VERSION = process.env.MOVIEBOX_APP_VERSION || '3.0.15';

export const CLIENT_USER_AGENT = process.env.MOVIEBOX_USER_AGENT || 'okhttp/4.12.0';
export const STREAM_USER_AGENT = process.env.MOVIEBOX_STREAM_USER_AGENT || 'okhttp/4.9.0';
export const CLIENT_TYPE = 'android';
export const PACKAGE_NAME = process.env.MOVIEBOX_PACKAGE_NAME || 'com.moviebox.android';
export const REFERER = process.env.MOVIEBOX_REFERER || 'https://lok-lok.cc/';

// Web player BFF (officialmoviebox.com) — replicates the official web player's stream request.
// NO HMAC/Bearer needed; only plain browser headers (see .omo/evidence/trace-analysis.md).
// referer MUST be a /movies/ detail URL with empty detailSe/detailEp (verified via probes).
export const WEB_BFF_HOST = process.env.MOVIEBOX_WEB_BFF_HOST || 'https://officialmoviebox.com';
export const WEB_BFF_BASE = `${WEB_BFF_HOST}/wefeed-h5api-bff`;
export const WEB_CLIENT_UA = process.env.MOVIEBOX_WEB_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// H5 web BFF (todo 4, plan web-h5-indonesia-noauth) — split host/referer config with
// ordered host fallback. NO HMAC/Bearer; plain browser headers + lang=id signals.
// WEB_BFF_HOST/WEB_BFF_BASE above are deprecated (removed in a later todo) — new code
// must use WEB_BFF_HOSTS via h5Fetch().
export const WEB_BFF_HOSTS: readonly string[] = (process.env.MOVIEBOX_WEB_BFF_HOSTS || 'https://h5-api.aoneroom.com,https://officialmoviebox.com')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);
export const WEB_REFERER_ORIGIN = process.env.MOVIEBOX_WEB_REFERER_ORIGIN || 'https://officialmoviebox.com';
// Probe-verified (.omo/evidence/host-referer-matrix.md): the prefix is mandatory on EVERY
// host (missing prefix = 404) and subject/search requires the h5 referer.
export const H5_PATH_PREFIX = '/wefeed-h5api-bff';
export const H5_SEARCH_REFERER = 'https://h5.aoneroom.com/';

// Video proxy routing is host-agnostic: /api/proxy/video rewrites and proxies ANY
// https stream URL from H5 play responses (any host), so future provider host
// rotations need zero code change. SSRF guard (private/loopback IP block) still
// applies per-request in the route.
export const PROXY_ALL_STREAMS = true;

// Placeholder / degraded-stream heuristics from the provider response. When a stream
// lacks a signing cookie / idType / uses the trailer host, it is NOT the real film.
// Used to detect and reject those without hardcoding brittle values in services.ts.
export const PLACEHOLDER_HOST = 'macdn.aoneroom.com';
export const PLACEHOLDER_PATH_MARKERS = ['/other/'];
export const MIN_REAL_DURATION_SECONDS = 300;
