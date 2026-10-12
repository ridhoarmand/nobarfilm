import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLandscapeArtwork, selectHeroArtwork } from './heroArtwork';

test('a supplied backdrop takes precedence over the poster', () => {
  assert.equal(selectHeroArtwork('backdrop.jpg', 'poster.jpg', []), 'backdrop.jpg');
});

test('an absent, broken, or rejected backdrop falls back to the available poster', () => {
  assert.equal(selectHeroArtwork('', 'poster.jpg', []), 'poster.jpg');
  assert.equal(selectHeroArtwork('backdrop.jpg', 'poster.jpg', ['backdrop.jpg']), 'poster.jpg');
  assert.equal(selectHeroArtwork('portrait-banner.jpg', 'poster.jpg', ['portrait-banner.jpg']), 'poster.jpg');
});

test('missing and failed artwork does not produce a broken image or the SDK favicon placeholder', () => {
  assert.equal(selectHeroArtwork('', '', []), '');
  assert.equal(selectHeroArtwork('backdrop.jpg', 'poster.jpg', ['backdrop.jpg', 'poster.jpg']), '');
  assert.equal(selectHeroArtwork('same.jpg', 'same.jpg', ['same.jpg']), '');
  assert.equal(selectHeroArtwork('', 'https://h5.aoneroom.com/favicon.ico?x-oss-process=image/resize,w_300/format,webp', []), '');
});

test('a banner without a separate poster remains available for proportional rendering', () => {
  assert.equal(selectHeroArtwork('portrait-banner.jpg', '', []), 'portrait-banner.jpg');
});

test('landscape classification uses actual image proportions, not the synthetic cover metadata', () => {
  assert.equal(isLandscapeArtwork(300, 375), false);
  assert.equal(isLandscapeArtwork(300, 444), false);
  assert.equal(isLandscapeArtwork(300, 450), false);
  assert.equal(isLandscapeArtwork(800, 800), false);
  assert.equal(isLandscapeArtwork(1200, 800), true);
  assert.equal(isLandscapeArtwork(1920, 1080), true);
  assert.equal(isLandscapeArtwork(0, 0), false);
  assert.equal(isLandscapeArtwork(1920, 0), false);
});
