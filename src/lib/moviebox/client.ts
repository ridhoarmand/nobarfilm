import crypto from 'crypto';
import { serverCache } from '../cache';
import { HOST } from './config';
import { generateClientToken, generateSignature } from './crypto';

export const MASTER_TOKEN_KEY = 'auth:master_jwt';
export const GUEST_TOKEN_KEY = 'auth:guest_device_token';
let cachedJwtToken: string | null = null;

export async function getGuestSessionToken(): Promise<string> {
  const cached = serverCache.get<string>(GUEST_TOKEN_KEY);
  if (cached) return cached;

  try {
    const res = await callMobileApi(
      'POST',
      '/wefeed-mobile-bff/user-api/device-sessions',
      { host: HOST, lang: 'id', locale: 'id_ID' },
      { package_name: 'com.moviebox.android' },
      false,
      null
    );

    if (res && res.code === 0 && res.data?.token) {
      const token = res.data.token;
      const expireTime = typeof res.data.expireTime === 'number' ? res.data.expireTime : 0;
      const nowSec = Math.floor(Date.now() / 1000);
      const ttl = expireTime > nowSec ? expireTime - nowSec - 300 : 24 * 3600;
      serverCache.set(GUEST_TOKEN_KEY, token, Math.max(300, ttl));
      console.log(`[MovieBox SDK] Guest device session token cached (TTL: ${ttl}s).`);
      return token;
    }
  } catch (err: any) {
    console.warn(`[MovieBox SDK] Failed to get guest device session token:`, err.message);
  }

  return '';
}

export async function getAccessToken(retry = 0): Promise<string> {
  const cachedFromStore = serverCache.get<string>(MASTER_TOKEN_KEY);
  if (cachedFromStore) {
    cachedJwtToken = cachedFromStore;
    return cachedFromStore;
  }
  if (cachedJwtToken) return cachedJwtToken;

  const email = process.env.MOVIEBOX_MASTER_EMAIL || 'armandhodrb@gmail.com';
  const rawPassword = process.env.MOVIEBOX_MASTER_PASSWORD || 'Armandho1234567890';
  const md5Password = /^[a-f0-9]{32}$/i.test(rawPassword)
    ? rawPassword
    : crypto.createHash('md5').update(rawPassword).digest('hex');
  const payload = {
    authType: 1,
    mail: email,
    password: md5Password,
    package_name: 'com.moviebox.android',
  };

  const bodyStr = JSON.stringify(payload);
  const timestamp = Date.now();
  const clientToken = generateClientToken(timestamp);
  const path = '/wefeed-mobile-bff/user-api/login';
  const queryParams = { host: HOST, lang: 'id', locale: 'id_ID' };
  const signature = generateSignature('POST', path, queryParams, bodyStr, timestamp);

  const url = `https://${HOST}${path}?host=${HOST}&lang=id&locale=id_ID`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Host': HOST,
        'User-Agent': 'okhttp/4.12.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'lang': 'id',
        'locale': 'id_ID',
        'x-client-info': JSON.stringify({ timezone: 'Asia/Jakarta', lang: 'id' }),
        'X-Client-Type': 'android',
        'X-App-Version': '3.0.15',
        'X-Client-Token': clientToken,
        'x-tr-signature': signature,
        'x-tr-signature-method': 'HmacMD5',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr).toString(),
      },
      body: bodyStr,
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      throw new Error(`Login HTTP error ${res.status}: ${errTxt}`);
    }

    const data: any = await res.json();
    if (data.code !== 0 || !data.data?.token) {
      throw new Error(`Login API error: ${data.message || 'unknown error'}`);
    }

    const token = data.data.token;
    const expireTime = typeof data.data.expireTime === 'number' ? data.data.expireTime : 0;
    const nowSec = Math.floor(Date.now() / 1000);
    const ttlSeconds = expireTime > nowSec ? expireTime - nowSec - 600 : 7 * 24 * 3600;

    cachedJwtToken = token;
    serverCache.set(MASTER_TOKEN_KEY, token, Math.max(600, ttlSeconds));
    console.log(`[MovieBox SDK] Authentication successful. Token cached with TTL ${ttlSeconds}s.`);
    return token;
  } catch (err: any) {
    console.error(`[MovieBox SDK] Login attempt failed:`, err.message);
    if (retry < 2) {
      console.log(`[MovieBox SDK] Retrying login in 2 seconds... (attempt ${retry + 1})`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return getAccessToken(retry + 1);
    }
    throw err;
  }
}

export async function callMobileApi(
  method: string,
  path: string,
  queryParams: Record<string, string> = {},
  body: any = null,
  retryOn401 = true,
  clientToken?: string | null,
  clientIp?: string | null
): Promise<any> {
  const timestamp = Date.now();
  const trClientToken = generateClientToken(timestamp);
  const bodyStr = body ? JSON.stringify(body) : null;
  const finalQueryParams: Record<string, string> = {
    lang: 'id',
    locale: 'id_ID',
    area: 'ID',
    ...queryParams,
  };

  const signature = generateSignature(method, path, finalQueryParams, bodyStr, timestamp);

  let fullPathWithQuery = path;
  if (finalQueryParams && Object.keys(finalQueryParams).length > 0) {
    const qs = Object.entries(finalQueryParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    fullPathWithQuery += '?' + qs;
  }

  const url = `https://${HOST}${fullPathWithQuery}`;

  const noAuthPaths = [
    '/wefeed-mobile-bff/user-api/device-sessions',
    '/wefeed-mobile-bff/user-api/login',
    '/wefeed-mobile-bff/user-api/register',
    '/wefeed-mobile-bff/user-api/get-sms-code',
    '/wefeed-mobile-bff/user-api/check-sms-code',
    '/wefeed-mobile-bff/user-api/check-mail-account',
    '/wefeed-mobile-bff/user-api/check-phone-account',
  ];

  const guestAuthPaths = [
    '/wefeed-mobile-bff/subject-api/get-ext-captions',
    '/wefeed-mobile-bff/subject-api/get-stream-captions',
    '/wefeed-mobile-bff/subject-api/get',
    '/wefeed-mobile-bff/subject-api/season-info',
    '/wefeed-mobile-bff/subject-api/search/v2',
    '/wefeed-mobile-bff/subject-api/search-suggest',
    '/wefeed-mobile-bff/subject-api/list',
    '/wefeed-mobile-bff/tab-operating',
  ];

  let token: string | null = null;
  if (clientToken) {
    token = clientToken;
  } else if (!noAuthPaths.includes(path)) {
    try {
      token = await getAccessToken();
    } catch (err: any) {
      console.warn(`[MovieBox SDK] Master token retrieval failed for ${path}:`, err.message);
    }
  }

  const headers: Record<string, string> = {
    'Host': HOST,
    'User-Agent': 'okhttp/4.12.0',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    'lang': 'id',
    'locale': 'id_ID',
    'x-client-info': JSON.stringify({ timezone: 'Asia/Jakarta', lang: 'id', area: 'ID', mcc: '510' }),
    'x-vip-restrict': '1',
    'X-Client-Type': 'android',
    'X-App-Version': '3.0.15',
    'X-Client-Token': trClientToken,
    'x-tr-signature': signature,
    'x-tr-signature-method': 'HmacMD5',
  };

  if (clientIp) {
    headers['X-Forwarded-For'] = clientIp;
    headers['X-Real-IP'] = clientIp;
  }

  if (bodyStr) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: bodyStr ? bodyStr : undefined,
      cache: 'no-store',
    });

    if ((res.status === 401 || res.status === 441) && retryOn401) {
      if (clientToken) {
        throw new Error(`Unauthorized (HTTP ${res.status})`);
      }
      console.log(`[MovieBox SDK] Request returned ${res.status}, retrying with Master Account token: ${path}`);
      cachedJwtToken = null;
      serverCache.delete(GUEST_TOKEN_KEY);
      const masterToken = await getAccessToken();
      return callMobileApi(method, path, queryParams, body, false, masterToken, clientIp);
    }

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`[MovieBox SDK] callMobileApi Error for ${path}:`, err.message);
    throw err;
  }
}
