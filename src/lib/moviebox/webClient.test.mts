/**
 * Tests for the H5 web API client (todo 4, plan web-h5-indonesia-noauth).
 * Runner: node:test (repo has no vitest/jest; runs via `node --import tsx --test`).
 * Stubs globalThis.fetch — no network access.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Hosts come from env at module load — set BEFORE importing the module.
process.env.MOVIEBOX_WEB_BFF_HOSTS = 'https://a.test,https://b.test';
delete process.env.MOVIEBOX_WEB_REFERER_ORIGIN;

const { h5Fetch } = await import('./webClient');
const { WEB_BFF_HOSTS, WEB_REFERER_ORIGIN, H5_PATH_PREFIX, H5_SEARCH_REFERER, WEB_CLIENT_UA } = await import('./config');

type FetchCall = { url: string; init: RequestInit };

let calls: FetchCall[] = [];
let responder: (url: URL, init: RequestInit) => Response = () => new Response('{}', { status: 200 });
const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url: String(input), init: init ?? {} });
    return responder(url, init ?? {});
  }) as typeof fetch;
});

afterEach(() => { globalThis.fetch = originalFetch; });

test('h5Fetch falls back to the next host when the first returns HTTP 500', async () => {
  const byHost: Record<string, unknown> = {
    'a.test': { code: 500, message: 'first host broken' },
    'b.test': { code: 0, data: { items: ['from-b'] } },
  };
  responder = (url) => {
    const body = byHost[url.host];
    return jsonResponse(body, url.host === 'a.test' ? 500 : 200);
  };

  const result = (await h5Fetch('/subject/search', { method: 'POST', body: { keyword: 'x' } })) as { data: { items: string[] } };

  assert.equal(result.data.items[0], 'from-b');
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[0].url).host, 'a.test');
  assert.equal(new URL(calls[1].url).host, 'b.test');
});

test('h5Fetch builds every URL with the H5 prefix plus lang:id and host= query params', async () => {
  responder = () => jsonResponse({ code: 0 });

  await h5Fetch('/subject/search', { query: { keyword: 'nobar' } });

  const url = new URL(calls[0].url);
  assert.equal(url.origin + url.pathname, `https://a.test${H5_PATH_PREFIX}/subject/search`);
  assert.equal(url.searchParams.get('lang'), 'id');
  assert.equal(url.searchParams.get('host'), 'a.test');
  assert.equal(url.searchParams.get('keyword'), 'nobar');
  assert.ok(H5_PATH_PREFIX.startsWith('/'), 'prefix must start with /');
});

test('h5Fetch sends browser headers with default referer from WEB_REFERER_ORIGIN', async () => {
  responder = () => jsonResponse({ code: 0 });

  await h5Fetch('/detail', { query: { subjectId: '1' } });

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get('accept'), 'application/json');
  assert.equal(headers.get('user-agent'), WEB_CLIENT_UA);
  assert.equal(headers.get('x-client-info'), '{"timezone":"Asia/Jakarta"}');
  assert.equal(headers.get('X-Request-Lang'), 'id');
  assert.equal(headers.get('referer'), `${WEB_REFERER_ORIGIN}/`);
});

test('h5Fetch referer option overrides the default', async () => {
  responder = () => jsonResponse({ code: 0 });

  await h5Fetch('/subject/search', { method: 'POST', body: { keyword: 'x' }, referer: H5_SEARCH_REFERER });

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get('referer'), 'https://h5.aoneroom.com/');
  assert.equal(headers.get('content-type'), 'application/json');
});

test('h5Fetch moves on from 404 and network errors and throws naming every host when all fail', async () => {
  responder = (url) => {
    if (url.host === 'a.test') return jsonResponse({}, 404);
    throw new TypeError('simulated network failure');
  };

  await assert.rejects(
    () => h5Fetch('/home'),
    (err: Error) => {
      assert.ok(err.message.includes('a.test'), 'error must name host a.test');
      assert.ok(err.message.includes('b.test'), 'error must name host b.test');
      return true;
    },
  );
  assert.equal(calls.length, 2, 'both hosts must have been attempted');
});

test('config exports keep the existing web BFF values and expose the new H5 config', async () => {
  assert.ok(Array.isArray(WEB_BFF_HOSTS));
  assert.deepEqual(WEB_BFF_HOSTS, ['https://a.test', 'https://b.test']);
  assert.equal(WEB_REFERER_ORIGIN, 'https://officialmoviebox.com');
  assert.equal(H5_PATH_PREFIX, '/wefeed-h5api-bff');
  assert.equal(H5_SEARCH_REFERER, 'https://h5.aoneroom.com/');
});
