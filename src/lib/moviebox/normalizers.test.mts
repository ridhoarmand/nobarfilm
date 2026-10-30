import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAdultContent } from './normalizers';

// Real H5 (lang=id) search rows, trimmed to the fields the filter reads.
test('blocks porn-tagged genres in Indonesian and English', () => {
  assert.equal(isAdultContent({ title: 'Desi Sexy Bhabhi', genre: 'Erotis,Panas,Percintaan', imdbRatingCount: 0 }), true);
  assert.equal(isAdultContent({ title: 'Sugar Baby', genre: 'Adult,Erotis', imdbRatingCount: 552 }), true);
  assert.equal(isAdultContent({ title: 'Healing Mate', genre: 'Adult,Drama,Percintaan', imdbRatingCount: 10 }), true);
  assert.equal(isAdultContent({ title: 'X', genre: 'Hot,Romance' }), true);
});

test('blocks obscure Erotis titles but keeps mainstream erotic films', () => {
  assert.equal(isAdultContent({ title: 'Hot Receptionist', genre: 'Drama,Erotis', imdbRatingCount: 0 }), true);
  assert.equal(isAdultContent({ title: 'Home Service', genre: 'Drama,Erotis', imdbRatingCount: 96 }), true);
  assert.equal(isAdultContent({ title: 'Fifty Shades of Grey [Hindi]', genre: 'Erotis', imdbRatingCount: 353356 }), false);
  assert.equal(isAdultContent({ title: 'Crash [Indonesian]', genre: 'Erotis', imdbRatingCount: 71816 }), false);
});

test('blocks obscure suspect titles but keeps popular or local theatrical ones', () => {
  assert.equal(isAdultContent({ title: 'Tharki Halwai', genre: 'Drama', imdbRatingCount: 20 }), true);
  assert.equal(isAdultContent({ title: 'Sex Trip', genre: 'Drama', imdbRatingCount: 0 }), true);
  assert.equal(isAdultContent({ title: 'Bhabhi And Dever F*cked On Holi', genre: 'Drama' }), true);
  assert.equal(isAdultContent({ title: 'VMX Kama Sutra', genre: 'Dokumenter', imdbRatingCount: 30 }), true);
  assert.equal(isAdultContent({ title: 'Sex Education', genre: 'Komedi,Drama', imdbRatingCount: 360000 }), false);
  assert.equal(isAdultContent({ title: 'Gowok: Javanese Kamasutra', genre: 'Drama,Sejarah,Percintaan', imdbRatingCount: 358 }), false);
  assert.equal(isAdultContent({ title: 'The Wrong Stepmother', genre: 'Drama', imdbRatingCount: 470 }), false);
});

test('keeps regular titles', () => {
  assert.equal(isAdultContent({ title: 'Basic Instinct', genre: 'Drama,Misteri,Percintaan', imdbRatingCount: 0 }), false);
  assert.equal(isAdultContent({ title: 'Squid Game S2', genre: 'Tindakan,Kejahatan,Drama', imdbRatingCount: 0 }), false);
});
