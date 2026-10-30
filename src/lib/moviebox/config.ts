// MovieBox gateway configuration — single source of truth for provider protocol values.
// Update these in ONE place when the provider releases a new app version and changes
// the protocol/version/headers. Never hardcode these values in services.ts / webClient.ts.
export const ALLOWED_SUBJECT_TYPES = new Set([1, 2]);

// Web player BFF (officialmoviebox.com) — replicates the official web player's stream request.
// NO HMAC/Bearer needed; only plain browser headers (see .omo/evidence/trace-analysis.md).
// referer MUST be a /movies/ detail URL with empty detailSe/detailEp (verified via probes).
export const WEB_CLIENT_UA = process.env.MOVIEBOX_WEB_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// H5 web BFF (todo 4, plan web-h5-indonesia-noauth) — split host/referer config with
// ordered host fallback. NO HMAC/Bearer; plain browser headers + lang=id signals.
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
