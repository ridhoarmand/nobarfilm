import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isPublicUrl, fetchPublic, BlockedUrlError } from './safeFetch';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('blocks internal targets', async () => {
  for (const url of [
    'http://127.0.0.2:3000/',
    'http://0.0.0.0/',
    'http://[::ffff:127.0.0.1]/',
    'http://[::1]/',
    'http://10.1.2.3/',
    'http://172.20.0.5/',
    'http://169.254.169.254/latest/meta-data/',
    'http://localhost/',
    'http://portainer:9000/api',
    'ftp://8.8.8.8/',
  ]) {
    assert.equal(await isPublicUrl(new URL(url)), false, url);
  }
});

test('allows public IPs', async () => {
  assert.equal(await isPublicUrl(new URL('https://8.8.8.8/x.m3u8')), true);
  assert.equal(await isPublicUrl(new URL('http://[2606:4700::1111]/')), true);
});

test('re-checks every redirect hop', async () => {
  globalThis.fetch = (async () =>
    new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } })) as typeof fetch;
  await assert.rejects(fetchPublic('https://8.8.8.8/a'), BlockedUrlError);
});

test('follows public redirects', async () => {
  const seen: string[] = [];
  globalThis.fetch = (async (input: URL) => {
    seen.push(String(input));
    return seen.length === 1
      ? new Response(null, { status: 302, headers: { location: '/b' } })
      : new Response('ok');
  }) as typeof fetch;
  const res = await fetchPublic('https://8.8.8.8/a');
  assert.equal(await res.text(), 'ok');
  assert.deepEqual(seen, ['https://8.8.8.8/a', 'https://8.8.8.8/b']);
});
