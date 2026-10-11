import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toWebVtt } from './subtitleCache';

test('normalizes SRT BOM, CRLF, and hour timestamps for browser tracks', () => {
  assert.equal(
    toWebVtt('\uFEFF1\r\n00:00:01,000 --> 00:00:03,000\r\nContoh subtitle\r\n'),
    'WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nContoh subtitle',
  );
});

test('converts minute timestamps without adding a second header', () => {
  assert.equal(toWebVtt('1\n01:02,500 --> 01:04,750\nTeks'), 'WEBVTT\n\n1\n00:01:02.500 --> 00:01:04.750\nTeks');
});

test('preserves WebVTT header, cue settings, and timing after whitespace normalization', () => {
  const vtt = 'WEBVTT Bahasa Indonesia\n\n00:01.000 --> 00:03.000 line:80%\nTeks';
  assert.equal(toWebVtt(`\uFEFF${vtt.replace(/\n/g, '\r\n')}\r\n`), vtt);
});
