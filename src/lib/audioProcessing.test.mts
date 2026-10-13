import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAudioEnhanceParams, AUDIO_ENHANCE_PARAMS } from './audioProcessing.js';

function createMockAudioParam() {
  const calls: Array<{ value: number; startTime: number }> = [];
  return {
    calls,
    setValueAtTime(value: number, startTime: number) {
      calls.push({ value, startTime });
    },
  };
}

test('applyAudioEnhanceParams sets correct compression & gain when enabled', () => {
  const threshold = createMockAudioParam();
  const knee = createMockAudioParam();
  const ratio = createMockAudioParam();
  const attack = createMockAudioParam();
  const release = createMockAudioParam();
  const gain = createMockAudioParam();

  const ctx = { currentTime: 1.5 };
  const compressor = { threshold, knee, ratio, attack, release };
  const gainNode = { gain };

  applyAudioEnhanceParams(true, ctx, compressor, gainNode);

  assert.equal(threshold.calls[0].value, AUDIO_ENHANCE_PARAMS.enabled.threshold);
  assert.equal(knee.calls[0].value, AUDIO_ENHANCE_PARAMS.enabled.knee);
  assert.equal(ratio.calls[0].value, AUDIO_ENHANCE_PARAMS.enabled.ratio);
  assert.equal(attack.calls[0].value, AUDIO_ENHANCE_PARAMS.enabled.attack);
  assert.equal(release.calls[0].value, AUDIO_ENHANCE_PARAMS.enabled.release);
  assert.equal(gain.calls[0].value, AUDIO_ENHANCE_PARAMS.enabled.gain);
  assert.equal(gain.calls[0].startTime, 1.5);
});

test('applyAudioEnhanceParams sets neutral pass-through when disabled', () => {
  const threshold = createMockAudioParam();
  const knee = createMockAudioParam();
  const ratio = createMockAudioParam();
  const attack = createMockAudioParam();
  const release = createMockAudioParam();
  const gain = createMockAudioParam();

  const ctx = { currentTime: 2.0 };
  const compressor = { threshold, knee, ratio, attack, release };
  const gainNode = { gain };

  applyAudioEnhanceParams(false, ctx, compressor, gainNode);

  assert.equal(threshold.calls[0].value, AUDIO_ENHANCE_PARAMS.disabled.threshold);
  assert.equal(knee.calls[0].value, AUDIO_ENHANCE_PARAMS.disabled.knee);
  assert.equal(ratio.calls[0].value, AUDIO_ENHANCE_PARAMS.disabled.ratio);
  assert.equal(gain.calls[0].value, AUDIO_ENHANCE_PARAMS.disabled.gain);
  assert.equal(gain.calls[0].startTime, 2.0);
});
