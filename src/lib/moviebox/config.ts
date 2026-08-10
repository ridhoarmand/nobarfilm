export const GATEWAY_SECRET = '76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O';
export const keyBuffer = Buffer.from(GATEWAY_SECRET, 'base64');
export const HOST = 'api6.aoneroom.com';
// h5-api.aoneroom.com is the stable direct API (same content as lok-lok.cc but no SSL cert mismatch)
export const H5_UPSTREAM = 'https://h5-api.aoneroom.com/wefeed-h5api-bff';
export const ALLOWED_SUBJECT_TYPES = new Set([1, 2]);
