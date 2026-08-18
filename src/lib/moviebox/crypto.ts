import crypto from 'crypto';
import { keyBuffer } from './config';

export function generateSignature(
  method: string,
  path: string,
  queryParams: Record<string, string>,
  bodyStr: string | null,
  timestamp: number
): string {
  const methodUpper = method.toUpperCase();
  const accept = 'application/json, text/plain, */*';
  const contentType = bodyStr ? 'application/json' : '';
  const contentLength = bodyStr ? Buffer.byteLength(bodyStr).toString() : '';
  const contentMd5 = bodyStr ? crypto.createHash('md5').update(bodyStr).digest('hex') : '';

  let pathAndQuery = path;
  if (queryParams && Object.keys(queryParams).length > 0) {
    const sortedKeys = Object.keys(queryParams).sort();
    const sortedParams = sortedKeys.map((k) => `${k}=${queryParams[k]}`).join('&');
    pathAndQuery += '?' + sortedParams;
  }

  const stringToSign = [
    methodUpper,
    accept,
    contentType,
    contentLength,
    timestamp.toString(),
    contentMd5,
    pathAndQuery,
  ].join('\n');

  const hmac = crypto.createHmac('md5', keyBuffer);
  hmac.update(stringToSign);
  return `${timestamp}|2|${hmac.digest('base64')}`;
}

export function generateClientToken(timestamp: number): string {
  const md5_1 = crypto.createHash('md5').update(timestamp.toString()).digest('hex');
  const md5_2 = crypto.createHash('md5').update(md5_1).digest('hex');
  return `${timestamp},${md5_2}`;
}


