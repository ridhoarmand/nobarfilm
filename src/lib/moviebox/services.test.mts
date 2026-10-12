import { test, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { serverCache } from '../cache';

process.env.MOVIEBOX_WEB_BFF_HOSTS = 'https://mock.test';

const { movieBoxService } = await import('./services');

const originalFetch = globalThis.fetch;
let homeResponder: () => Response = () => new Response('{}', { status: 200 });
let filterResponder: () => Response = () => new Response('{}', { status: 200 });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeValidFilterResponse(sectionIndex = 0) {
  return jsonResponse({
    code: 0,
    message: 'ok',
    data: {
      items: [
        {
          subjectId: `100${sectionIndex}`,
          subjectType: 1,
          title: `Film Bagus ${sectionIndex}`,
          description: 'Sinopsis film bagus',
          releaseDate: '2025-01-01',
          duration: 7200,
          hasResource: true,
          cover: { url: 'https://pbcdn.aoneroom.com/cover.jpg', width: 300, height: 450 },
        },
      ],
    },
  });
}

beforeEach(() => {
  serverCache.clear();
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? new URL(input) : input instanceof URL ? input : new URL(input.url);
    if (url.pathname.includes('/home')) {
      return homeResponder();
    }
    if (url.pathname.includes('/subject/filter')) {
      return filterResponder();
    }
    return jsonResponse({ code: 0, data: {} });
  }) as typeof fetch;
});

afterEach(() => {
  serverCache.clear();
  globalThis.fetch = originalFetch;
});

after(() => {
  serverCache.destroy();
});

test('response /home landscape valid menghasilkan BANNER + filter sections dan topPickList katalog', async () => {
  homeResponder = () =>
    jsonResponse({
      code: 0,
      data: {
        operatingList: [
          {
            type: 'BANNER',
            title: 'BANNER',
            banner: {
              items: [
                {
                  id: '0',
                  title: 'Hero Landscape Movie',
                  image: {
                    url: 'https://pbcdnw.aoneroom.com/banner.webp',
                    width: 1920,
                    height: 1080,
                  },
                  subject: {
                    subjectId: '555001',
                    subjectType: 1,
                    title: 'Hero Landscape Movie',
                    description: 'Sinopsis landscape',
                    releaseDate: '2025-02-01',
                    duration: 6000,
                    hasResource: true,
                    cover: { url: 'https://pbcdn.aoneroom.com/poster.jpg', width: 300, height: 450 },
                  },
                },
              ],
            },
          },
        ],
      },
    });

  let filterCalls = 0;
  filterResponder = () => makeValidFilterResponse(++filterCalls);

  const res = await movieBoxService.getHomepage();

  assert.ok(res.banner, 'banner harus ada');
  assert.equal(res.banner.items.length, 1);
  assert.equal(res.banner.items[0].id, '555001');
  assert.equal(res.banner.items[0].subjectId, '555001');
  assert.equal(res.banner.items[0].image.width, 1920);
  assert.equal(res.banner.items[0].image.height, 1080);
  assert.ok(res.banner.items[0].image.url.includes('w_1280'), 'banner url harus dinormalisasi dengan width 1280');

  assert.equal(res.operatingList[0].type, 'BANNER');
  assert.equal(res.operatingList[0].position, 0);
  assert.equal(res.operatingList[1].type, 'SUBJECTS_MOVIE');
  assert.equal(res.operatingList[1].position, 1);

  assert.ok(res.topPickList.length > 0, 'topPickList harus terisi dari katalog');
  assert.equal(res.topPickList[0].subjectId, '1001', 'topPickList harus berasal dari section filter pertama');
});

test('banner portrait, dewasa, non-media, atau tanpa subject diabaikan', async () => {
  homeResponder = () =>
    jsonResponse({
      code: 0,
      data: {
        operatingList: [
          {
            type: 'BANNER',
            title: 'BANNER',
            banner: {
              items: [
                {
                  id: '0',
                  title: 'Portrait Artwork (bukan landscape)',
                  image: { url: 'https://pbcdn.aoneroom.com/p.jpg', width: 1080, height: 1600 },
                  subject: { subjectId: '7001', subjectType: 1, title: 'Portrait Movie', hasResource: true },
                },
                {
                  id: '0',
                  title: 'Porn XXX Adult Content',
                  image: { url: 'https://pbcdn.aoneroom.com/adult.jpg', width: 1920, height: 1080 },
                  subject: { subjectId: '7002', subjectType: 1, title: 'Adult Movie', hasResource: true },
                },
                {
                  id: '0',
                  title: 'Unsupported Subject Type',
                  image: { url: 'https://pbcdn.aoneroom.com/other.jpg', width: 1920, height: 1080 },
                  subject: { subjectId: '7003', subjectType: 99, title: 'Game Content', hasResource: true },
                },
                {
                  id: '0',
                  title: 'Missing Subject',
                  image: { url: 'https://pbcdn.aoneroom.com/none.jpg', width: 1920, height: 1080 },
                  subject: null,
                },
              ],
            },
          },
        ],
      },
    });

  let filterCalls = 0;
  filterResponder = () => makeValidFilterResponse(++filterCalls);

  const res = await movieBoxService.getHomepage();

  assert.equal(res.banner, null, 'banner harus null bila semua item tidak lolos guard');
  assert.equal(res.operatingList[0].type, 'SUBJECTS_MOVIE', 'operatingList pertama harus section filter');
  assert.equal(res.operatingList[0].position, 0);
});

test('upstream /home gagal tidak menggagalkan katalog homepage', async () => {
  homeResponder = () => jsonResponse({ code: 500, message: 'Internal Server Error' }, 500);

  let filterCalls = 0;
  filterResponder = () => makeValidFilterResponse(++filterCalls);

  const res = await movieBoxService.getHomepage();

  assert.equal(res.banner, null);
  assert.ok(res.operatingList.length > 0);
  assert.equal(res.operatingList[0].type, 'SUBJECTS_MOVIE');
  assert.ok(res.topPickList.length > 0);
});
