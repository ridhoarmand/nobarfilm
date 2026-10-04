import crypto from 'crypto';
import { serverCache } from '../cache';
import { HOST, APP_VERSION, CLIENT_USER_AGENT, PACKAGE_NAME } from './config';
import { generateClientToken, generateSignature } from './crypto';

export const MASTER_TOKEN_KEY = 'auth:master_jwt';
export const GUEST_TOKEN_KEY = 'auth:guest_device_token';



export async function getGuestToken(): Promise<string> {
  const cachedGuest = serverCache.get<string>(GUEST_TOKEN_KEY);
  if (cachedGuest) {
    return cachedGuest;
  }

  const payload = {
    client_info: {
      timezone: 'Asia/Jakarta',
      lang: 'id',
      area: 'ID',
      mcc: '510',
    },
  };

  try {
    const data = await callMobileApi(
      'POST',
      '/wefeed-mobile-bff/user-api/device-sessions',
      {},
      payload,
      false,
      null
    );

    if (data && data.code === 0 && data.data?.token) {
      const guestToken = data.data.token;
      // Cache guest token selama 1 hari
      serverCache.set(GUEST_TOKEN_KEY, guestToken, 24 * 3600);
      console.log('[MovieBox SDK] Guest device session established successfully.');
      return guestToken;
    }
  } catch (err: any) {
    console.warn('[MovieBox SDK] Guest device-session request failed:', err.message);
  }

  // Konten berjalan tanpa token; kembalikan '' bila device-session gagal (master creds opsional).
  return '';
}

export async function getAccessToken(retry = 0): Promise<string> {
  const cachedFromStore = serverCache.get<string>(MASTER_TOKEN_KEY);
  if (cachedFromStore) {
    return cachedFromStore;
  }

  const email = process.env.MOVIEBOX_MASTER_EMAIL;
  const rawPassword = process.env.MOVIEBOX_MASTER_PASSWORD;

  if (!email || !rawPassword) {
    return '';
  }
  const md5Password = /^[a-f0-9]{32}$/i.test(rawPassword)
    ? rawPassword
    : crypto.createHash('md5').update(rawPassword).digest('hex');
  const payload = {
    authType: 1,
    mail: email,
    password: md5Password,
    package_name: PACKAGE_NAME,
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
        'User-Agent': CLIENT_USER_AGENT,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'lang': 'id',
        'locale': 'id_ID',
        'x-client-info': JSON.stringify({ timezone: 'Asia/Jakarta', lang: 'id' }),
        'X-Client-Type': 'android',
        'X-App-Version': APP_VERSION,
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

    serverCache.set(MASTER_TOKEN_KEY, token, Math.max(600, ttlSeconds));
    console.log(`[MovieBox SDK] Master authentication successful. Token cached with TTL ${ttlSeconds}s.`);
    return token;
  } catch (err: any) {
    console.error(`[MovieBox SDK] Master Login attempt failed:`, err.message);
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

  let token: string | null = null;
  if (clientToken) {
    token = clientToken;
  } else if (!noAuthPaths.includes(path)) {
    try {
      token = await getGuestToken();
    } catch (err: any) {
      console.warn(`[MovieBox SDK] Guest token retrieval failed for ${path}:`, err.message);
    }
  }

  const headers: Record<string, string> = {
    'Host': HOST,
    'User-Agent': CLIENT_USER_AGENT,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    'lang': 'id',
    'locale': 'id_ID',
    'x-client-info': JSON.stringify({ timezone: 'Asia/Jakarta', lang: 'id', area: 'ID', mcc: '510' }),
    'x-vip-restrict': '1',
    'X-Client-Type': 'android',
    'X-App-Version': APP_VERSION,
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
      const hasMasterCreds = Boolean(
        process.env.MOVIEBOX_MASTER_EMAIL && process.env.MOVIEBOX_MASTER_PASSWORD
      );
      if (!hasMasterCreds) {
        throw new Error(`Unauthorized (HTTP ${res.status})`);
      }
      console.log(`[MovieBox SDK] Request returned ${res.status}, retrying with Master Account token: ${path}`);
      serverCache.delete(GUEST_TOKEN_KEY);
      const masterToken = await getAccessToken();
      return callMobileApi(method, path, queryParams, body, false, masterToken, clientIp);
    }

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('Dynamic server usage')) {
      throw err;
    }
    console.warn(`[MovieBox SDK] callMobileApi Error for ${path}:`, err.message);
    throw err;
  }
}
