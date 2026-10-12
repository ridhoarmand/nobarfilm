import { test, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { serverCache } from './cache';
import { ApiError } from './fetcher';
import { searchSubdlTitles, searchSubdlSubtitles, downloadSubdlSubtitle } from './subdl';

// Route utilities start a second singleton interval; do not keep the test worker alive for it.
const originalSetInterval = globalThis.setInterval;
globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
  const timer = originalSetInterval(...args);
  timer.unref();
  return timer;
}) as typeof setInterval;
let searchRoute: typeof import('../app/api/subtitles/search/route');
let downloadRoute: typeof import('../app/api/subtitles/download/route');
try {
  searchRoute = await import('../app/api/subtitles/search/route');
  downloadRoute = await import('../app/api/subtitles/download/route');
} finally {
  globalThis.setInterval = originalSetInterval;
}

const titles = [
  { sd_id: 'sd2922', type: 'movie', name: 'Inception', original_name: 'Inception', year: 2010, imdb_id: 'tt1375666', tmdb_id: 27205 },
  { sd_id: 'sd26683', type: 'movie', name: 'Inception - The Cobol Job', original_name: 'Inception: The Cobol Job', year: 2010, imdb_id: 'tt5295894', tmdb_id: 64956 },
];
const duneRow = {
  release_name: 'Dune.Part.two.2024.Bluray.Indonesian.Harq.al-Ada.',
  name: 'Dune.Part.two.2024.Bluray.Indonesian.Harq.al-Ada.zip',
  lang: 'Indonesian', author: 'Harq al-Ada', subtitlePage: '/s/info/45nV3KSXyv',
  season: 0, episode: null, language: 'ID', framerate: 0, fps: null, hi: false,
  episode_from: null, episode_end: 0, full_season: false,
  unpack_files: [{ file_n_id: 'NROSXU9D0p', name: 'Dune.Part.two.2024.Bluray.Indonesian.Harq.al-Ada..srt',
    release_name: 'Dune.Part.two.2024.Bluray.Indonesian.Harq.al-Ada.', season: 0, episode: 0,
    language: 'ID', hi: false, format: 'srt', size: 110941, md5: 'd2f1c1959e163a3e1ae63e50880cced8' }],
};
const episodeRow = {
  ...duneRow, release_name: 'Breaking.Bad.S01E01.DVDRip.XviD-ORPHEUS.ind',
  name: 'SUBDL.com::breaking.bad.first.season643454.zip', lang: 'indonesian', author: 'masukmas',
  subtitlePage: '/s/info/BmB5OrEjpi', season: 1, episode: 1, hi: true, episode_from: 1, episode_end: 1,
  unpack_files: [{ file_n_id: '4h1k4N532J', name: 'Breaking.Bad.S01E01.DVDRip.XviD-ORPHEUS.ind.srt',
    release_name: 'Breaking.Bad.S01E01.DVDRip.XviD-ORPHEUS.ind', season: 1, episode: 1,
    language: 'ID', hi: false, format: 'srt', size: 41843, md5: '020a817a46ee395196998c7ad57c3b84' }],
};
const srt = '1\n00:00:01,000 --> 00:00:03,000\nSelamat datang.\n';
const originalFetch = globalThis.fetch;
const originalKey = process.env.SUBDL_API_KEY;
const originalNow = Date.now;
let calls: { url: URL; init: RequestInit }[];
let responder: (url: URL, init: RequestInit) => Response | Promise<Response>;
let requestCounter = 0;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  serverCache.clear();
  calls = [];
  process.env.SUBDL_API_KEY = 'test-key-not-a-real-secret';
  responder = (url) => {
    if (url.pathname.endsWith('/movies/search')) return json({ results: titles });
    if (url.pathname.endsWith('/subtitles/search')) return json({ status: true, results: [], subtitles: [duneRow], totalPages: 1, currentPage: 1 });
    return new Response(srt, { headers: { 'Content-Type': 'application/octet-stream' } });
  };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, init: init ?? {} });
    return responder(url, init ?? {});
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
  if (originalKey === undefined) delete process.env.SUBDL_API_KEY;
  else process.env.SUBDL_API_KEY = originalKey;
  serverCache.clear();
});
after(() => serverCache.destroy());

async function ticket() {
  await searchSubdlTitles('Inception', 'movie');
  const results = await searchSubdlSubtitles('sd2922', 'movie');
  assert.equal(results.length, 1);
  return results[0];
}

function rejectsStatus(status: number) {
  return (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, status);
    assert.ok(!error.message.includes('test-key'));
    assert.ok(!error.message.includes('https://'));
    return true;
  };
}

function routeRequest(path: string, body?: string | ReadableStream<Uint8Array>, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set('x-forwarded-for', `test-client-${++requestCounter}`);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  return new NextRequest(`http://localhost${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers, body,
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  });
}

function streamed(size: number, cancelled: () => void) {
  let remaining = size;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!remaining) { controller.close(); return; }
      const length = Math.min(65536, remaining);
      remaining -= length;
      controller.enqueue(new Uint8Array(length).fill(32));
    },
    cancel: cancelled,
  });
}

test('title ambiguity is preserved and query punctuation reaches the provider', async () => {
  const result = await searchSubdlTitles('Inception: The Cobol Job', 'movie');
  assert.deepEqual(result, titles.map(row => ({ id: row.sd_id, title: row.name, type: row.type, year: row.year })));
  assert.equal(calls[0].url.searchParams.get('q'), 'Inception: The Cobol Job');
  assert.equal(calls[0].url.searchParams.get('limit'), '10');
});

test('movie candidates and results use exact provider IDs, Indonesian only, and private UUID tickets', async () => {
  const base = structuredClone(duneRow);
  const foreign = { ...structuredClone(base), language: 'EN', lang: 'English' };
  foreign.unpack_files[0].language = 'EN';
  const ass = structuredClone(base); ass.unpack_files[0].format = 'ass';
  const pack = { ...structuredClone(base), full_season: true };
  const multi = structuredClone(base); multi.unpack_files.push({ ...multi.unpack_files[0], file_n_id: 'second' });
  responder = url => url.pathname.endsWith('/movies/search') ? json({ results: titles }) :
    json({ status: true, results: [], subtitles: [base, foreign, ass, pack, multi] });
  const result = await ticket();
  assert.equal(result.id, '45nV3KSXyv:NROSXU9D0p');
  assert.equal(result.language, 'id');
  assert.match(result.token, /^[0-9a-f-]{36}$/i);
  assert.deepEqual(Object.keys(result).sort(), ['id', 'language', 'release', 'token']);
  const url = calls[1].url;
  assert.equal(url.searchParams.get('sd_id'), 'sd2922');
  assert.equal(url.searchParams.get('languages'), 'ID');
  assert.equal(url.searchParams.get('unpack'), '1');
  assert.equal(url.searchParams.get('type'), 'movie');
});

test('TV excludes wrong episode, season packs, from-pack files, and wrong file language', async () => {
  const wrongEpisode = structuredClone(episodeRow); wrongEpisode.unpack_files[0].episode = 2;
  const wrongSeason = structuredClone(episodeRow); wrongSeason.season = 2;
  const fullSeason = { ...structuredClone(episodeRow), full_season: true, episode: null };
  const fromPack = structuredClone(episodeRow);
  Object.assign(fromPack.unpack_files[0], { from_pack: true });
  const foreign = structuredClone(episodeRow); foreign.unpack_files[0].language = 'EN';
  responder = url => url.pathname.endsWith('/movies/search') ?
    json({ results: [{ sd_id: 'sd1300044', type: 'tv', name: 'Breaking Bad', original_name: 'Breaking Bad', year: 2008 }] }) :
    json({ status: true, results: [], subtitles: [episodeRow, wrongEpisode, wrongSeason, fullSeason, fromPack, foreign] });
  await searchSubdlTitles('Breaking Bad', 'tv');
  const result = await searchSubdlSubtitles('sd1300044', 'tv', 1, 1);
  assert.deepEqual(result.map(row => row.id), ['BmB5OrEjpi:4h1k4N532J']);
  assert.equal(calls[1].url.searchParams.get('season'), '1');
  assert.equal(calls[1].url.searchParams.get('episode'), '1');
});

test('unknown and expired candidates/tokens never call the provider', async () => {
  await assert.rejects(searchSubdlSubtitles('sdunknown', 'movie'), rejectsStatus(410));
  await assert.rejects(downloadSubdlSubtitle('00000000-0000-4000-8000-000000000000'), rejectsStatus(410));
  assert.equal(calls.length, 0);
  const result = await ticket();
  const now = originalNow();
  Date.now = () => now + 301000;
  const before = calls.length;
  await assert.rejects(searchSubdlSubtitles('sd2922', 'movie'), rejectsStatus(410));
  await assert.rejects(downloadSubdlSubtitle(result.token), rejectsStatus(410));
  assert.equal(calls.length, before);
});

test('download uses parent nId and concurrent tickets share one file fetch and cached bytes', async () => {
  const first = await ticket();
  const [second] = await searchSubdlSubtitles('sd2922', 'movie');
  assert.notEqual(first.token, second.token);
  const before = calls.length;
  const [a, b] = await Promise.all([downloadSubdlSubtitle(first.token), downloadSubdlSubtitle(second.token)]);
  assert.deepEqual(a, b);
  assert.equal(a.text, srt);
  assert.equal(a.label, `Indonesia · SubDL · ${duneRow.unpack_files[0].release_name}`);
  assert.equal(calls.length, before + 1);
  assert.equal(calls.at(-1)!.url.pathname, '/api/v2/subtitles/45nV3KSXyv/download');
  assert.equal(calls.at(-1)!.url.searchParams.get('format'), 'file');
  await downloadSubdlSubtitle(second.token);
  assert.equal(calls.length, before + 1);
});

for (const location of ['http://127.0.0.1/file', 'https://localhost/file', 'https://evil.example/file', 'https://api.subdl.com.evil.example/file', 'https://api.subdl.com:444/file', 'https://user:pass@dl.subdl.com/file']) {
  test(`download rejects redirect ${location} before a second fetch`, async () => {
    const result = await ticket();
    responder = () => new Response(null, { status: 302, headers: { Location: location } });
    const before = calls.length;
    await assert.rejects(downloadSubdlSubtitle(result.token), rejectsStatus(502));
    assert.equal(calls.length, before + 1);
    assert.equal(calls.at(-1)!.init.redirect, 'manual');
  });
}

test('allowed CDN redirects strip provider authorization and resolve relative locations', async () => {
  const result = await ticket();
  responder = url => {
    if (url.hostname === 'api.subdl.com') return new Response(null, { status: 302, headers: { Location: 'https://dl.subdl.com/start' } });
    if (url.pathname === '/start') return new Response(null, { status: 302, headers: { Location: '/file.srt' } });
    return new Response(srt);
  };
  const before = calls.length;
  assert.equal((await downloadSubdlSubtitle(result.token)).text, srt);
  const downloads = calls.slice(before);
  assert.equal(new Headers(downloads[0].init.headers).get('Authorization'), 'Bearer test-key-not-a-real-secret');
  assert.equal(downloads[2].url.href, 'https://dl.subdl.com/file.srt');
  for (const call of downloads.slice(1)) assert.equal(new Headers(call.init.headers).get('Authorization'), null);
});

for (const [name, body, contentType] of [
  ['ZIP', new Uint8Array([80, 75, 3, 4, 0]), 'application/zip'],
  ['HTML', '<html><body>00:00:01,000 --> 00:00:02,000</body></html>', 'text/html'],
  ['no cue', 'plain text, not a subtitle', 'text/plain'],
  ['empty', '', 'application/octet-stream'],
  ['invalid UTF8', new Uint8Array([0xff, 0xfe, 0xff]), 'application/octet-stream'],
] as const) {
  test(`download rejects ${name} and a later successful request is not stuck in failed in-flight cache`, async () => {
    const result = await ticket();
    responder = () => new Response(body, { headers: { 'Content-Type': contentType } });
    await assert.rejects(downloadSubdlSubtitle(result.token), rejectsStatus(422));
    responder = () => new Response(srt);
    assert.equal((await downloadSubdlSubtitle(result.token)).text, srt);
  });
}

test('UTF16 BOM subtitle bytes decode without adding a second parser', async () => {
  const result = await ticket();
  const bytes = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(srt, 'utf16le')]);
  responder = () => new Response(bytes);
  assert.equal((await downloadSubdlSubtitle(result.token)).text, srt);
});

test('file and JSON stream limits cancel oversized bodies without Content-Length', async () => {
  const result = await ticket();
  let cancelled = false;
  responder = () => new Response(streamed(2 * 1024 * 1024, () => { cancelled = true; }));
  await assert.rejects(downloadSubdlSubtitle(result.token), rejectsStatus(422));
  assert.equal(cancelled, true);
  cancelled = false;
  responder = () => new Response(streamed(3 * 1024 * 1024, () => { cancelled = true; }));
  await assert.rejects(searchSubdlTitles('other query', 'movie'), rejectsStatus(502));
  assert.equal(cancelled, true);
});

for (const [upstream, expected] of [[401, 503], [429, 429], [500, 502]] as const) {
  test(`provider search HTTP ${upstream} is error ${expected}, not empty results`, async () => {
    responder = () => json({ error: 'private upstream detail' }, upstream);
    await assert.rejects(searchSubdlTitles('Inception', 'movie'), rejectsStatus(expected));
  });
}
for (const upstream of [403, 409]) {
  test(`forbidden or multi-file download HTTP ${upstream} is 422 without ZIP fallback`, async () => {
    const result = await ticket();
    responder = () => json({ error: 'not_a_single_file' }, upstream);
    const before = calls.length;
    await assert.rejects(downloadSubdlSubtitle(result.token), rejectsStatus(422));
    assert.equal(calls.length, before + 1);
  });
}

test('missing configuration, network failure, and malformed schemas are controlled errors', async () => {
  delete process.env.SUBDL_API_KEY;
  await assert.rejects(searchSubdlTitles('Inception', 'movie'), rejectsStatus(503));
  assert.equal(calls.length, 0);
  process.env.SUBDL_API_KEY = 'test-key-not-a-real-secret';
  responder = () => { throw new TypeError('private network detail'); };
  await assert.rejects(searchSubdlTitles('Inception', 'movie'), rejectsStatus(502));
  responder = () => json({ unexpected: [] });
  await assert.rejects(searchSubdlTitles('Inception', 'movie'), rejectsStatus(502));
});

test('search route rejects invalid, duplicate, and unknown parameters before provider fetch', async () => {
  for (const query of [
    '', 'query=x&type=movie', `query=${'x'.repeat(151)}&type=movie`, 'query=ab&type=Movie',
    'query=ab&type=movie&query=cd', 'query=ab&type=movie&url=http://127.0.0.1',
    'query=ab&type=movie&titleId=sd2922', 'query=ab&type=tv&season=1&episode=1',
    'titleId=sd2922&type=movie&season=1', 'titleId=sd2922&type=movie&episode=1',
    'titleId=sd2922&type=tv', 'titleId=sd2922&type=tv&season=0&episode=1',
    'titleId=sd2922&type=tv&season=1&episode=1.5', 'titleId=sd2922&type=tv&season=1e2&episode=1',
    'titleId=sd2922&type=tv&season=9007199254740992&episode=1',
    'titleId=%2Fbad&type=movie', 'titleId=&type=movie', `titleId=${'x'.repeat(65)}&type=movie`,
  ]) {
    const response = await searchRoute.GET(routeRequest(`/api/subtitles/search?${query}`));
    assert.equal(response.status, 400, query);
    assert.deepEqual(await response.json(), { error: 'Permintaan subtitle tidak valid.' });
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(calls.length, 0);
});

test('download route rejects malformed/non-object/extra-field/non-UUID bodies before provider fetch', async () => {
  for (const body of ['', '{', 'null', '[]', '"token"', '{}', '{"token":1}', '{"token":"http://127.0.0.1"}',
    '{"token":"00000000-0000-4000-8000-000000000000","url":"https://evil.example"}']) {
    const response = await downloadRoute.POST(routeRequest('/api/subtitles/download', body));
    assert.equal(response.status, 400, body);
    assert.deepEqual(await response.json(), { error: 'Permintaan subtitle tidak valid.' });
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  assert.equal(calls.length, 0);
});

test('download route stream bound ignores a false Content-Length and cancels at 2KiB', async () => {
  let cancelled = false;
  const response = await downloadRoute.POST(routeRequest('/api/subtitles/download',
    streamed(131072, () => { cancelled = true; }), { 'Content-Length': '1' }));
  assert.equal(response.status, 400);
  assert.equal(cancelled, true);
  assert.equal(calls.length, 0);
});

test('routes provide envelopes, no-store, and expired-ticket errors without CORS', async () => {
  const search = await searchRoute.GET(routeRequest('/api/subtitles/search?query=%20Inception%20&type=movie'));
  assert.equal(search.status, 200);
  assert.equal(search.headers.get('Cache-Control'), 'no-store');
  assert.equal((await search.json()).data.titles.length, 2);
  assert.equal(calls[0].url.searchParams.get('q'), 'Inception');
  const list = await searchRoute.GET(routeRequest('/api/subtitles/search?titleId=sd2922&type=movie'));
  const result = (await list.json()).data.subtitles[0];
  const download = await downloadRoute.POST(routeRequest('/api/subtitles/download', JSON.stringify({ token: result.token })));
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('Cache-Control'), 'no-store');
  assert.equal(download.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await download.json()).data.text, srt);
  const expired = await downloadRoute.POST(routeRequest('/api/subtitles/download', '{"token":"00000000-0000-4000-8000-000000000000"}'));
  assert.equal(expired.status, 410);
  assert.deepEqual(await expired.json(), { error: 'Hasil pencarian kedaluwarsa. Cari kembali.' });
});

test('routes reject foreign browser origins before any provider request', async () => {
  const search = await searchRoute.GET(routeRequest('/api/subtitles/search?query=Inception&type=movie', undefined, { Origin: 'https://evil.example' }));
  const download = await downloadRoute.POST(routeRequest('/api/subtitles/download', '{}', { Origin: 'https://evil.example' }));
  assert.equal(search.status, 400);
  assert.equal(download.status, 400);
  assert.equal(calls.length, 0);
});

test('browser origin uses the public Host when Next rewrites the internal request hostname', async () => {
  const headers = { Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3000' };
  const search = await searchRoute.GET(routeRequest('/api/subtitles/search?query=Inception&type=movie', undefined, headers));
  assert.equal(search.status, 200);
  const result = await ticket();
  const download = await downloadRoute.POST(routeRequest('/api/subtitles/download', JSON.stringify({ token: result.token }), headers));
  assert.equal(download.status, 200);
  assert.equal((await download.json()).data.text, srt);
  const before = calls.length;
  for (const Origin of ['https://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://evil.example']) {
    const rejected = await downloadRoute.POST(routeRequest('/api/subtitles/download', JSON.stringify({ token: result.token }), { ...headers, Origin }));
    assert.equal(rejected.status, 400);
  }
  assert.equal(calls.length, before);
});

test('download route rejects missing body, wrong content type, and invalid UTF8', async () => {
  const missing = new NextRequest('http://localhost/api/subtitles/download', {
    method: 'POST', headers: { 'x-forwarded-for': `test-client-${++requestCounter}`, 'Content-Type': 'application/json' },
  });
  const wrongType = new NextRequest('http://localhost/api/subtitles/download', {
    method: 'POST', headers: { 'x-forwarded-for': `test-client-${++requestCounter}`, 'Content-Type': 'text/plain' }, body: '{}',
  });
  const invalidUtf8 = new NextRequest('http://localhost/api/subtitles/download', {
    method: 'POST', headers: { 'x-forwarded-for': `test-client-${++requestCounter}`, 'Content-Type': 'application/json' },
    body: new Uint8Array([0xff]),
  });
  for (const request of [missing, wrongType, invalidUtf8]) {
    assert.equal((await downloadRoute.POST(request)).status, 400);
  }
  assert.equal(calls.length, 0);
});

test('route provider errors stay controlled and are never cached publicly', async () => {
  for (const [upstream, status, message] of [
    [401, 503, 'Subtitle eksternal belum dikonfigurasi.'],
    [429, 429, 'Kuota subtitle penyedia sedang habis. Coba lagi setelah kuota tersedia.'],
    [500, 502, 'Penyedia subtitle tidak dapat dihubungi. Coba lagi.'],
  ] as const) {
    responder = () => json({ error: 'private upstream detail' }, upstream);
    const response = await searchRoute.GET(routeRequest('/api/subtitles/search?query=Inception&type=movie'));
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: message });
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});

for (const [path, maximum, method] of [['search', 10, 'GET'], ['download', 5, 'POST']] as const) {
  test(`${path} route retains local limiter message and Retry-After with no-store`, async () => {
    const ip = `limiter-${++requestCounter}`;
    let response: Response | undefined;
    for (let index = 0; index <= maximum; index++) {
      const request = new NextRequest(`http://localhost/api/subtitles/${path}`, {
        method, headers: { 'x-forwarded-for': ip, 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: '{}' } : {}),
      });
      response = method === 'GET' ? await searchRoute.GET(request) : await downloadRoute.POST(request);
    }
    assert.equal(response!.status, 429);
    assert.ok(response!.headers.get('Retry-After'));
    assert.equal(response!.headers.get('Cache-Control'), 'no-store');
    const body = await response!.json();
    assert.equal(body.error, 'Too Many Requests');
    assert.match(body.message, /Terlalu banyak permintaan/);
  });
}
