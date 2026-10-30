// Shared by client (subtitleCache) and server routes; keep free of 'use client'.
export function toWebVtt(text: string): string {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  if (normalized.startsWith('WEBVTT')) return normalized;
  const cues = normalized
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .replace(/(\d{2}:\d{2}),(\d{3})/g, '00:$1.$2');
  return `WEBVTT\n\n${cues}`;
}

export function vttToSrt(vttContent: string): string {
  const cleanContent = vttContent.replace(/^\uFEFF/, '').replace(/^WEBVTT/i, '').replace(/\r\n/g, '\n').trim();
  return cleanContent.replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, '$1,$2');
}
