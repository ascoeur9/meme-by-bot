import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatIsoWeekKo, hasFade, maskTerm, needsUnlock, platformLabel, type Meme } from '../src/lib/meme.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const memes = JSON.parse(readFileSync(join(root, 'data/memes.json'), 'utf8')) as Meme[];

test('formatIsoWeekKo matches YYYY년 M월 N째 주 for a known ISO week', () => {
  assert.equal(formatIsoWeekKo('2025-W18'), '2025년 5월 1째 주');
});

test('formatIsoWeekKo formats every firstSeen/peak in data/memes.json', () => {
  const weekKo = /^\d{4}년 \d{1,2}월 \d+째 주$/;
  assert.ok(memes.length > 0);
  for (const meme of memes) {
    assert.match(formatIsoWeekKo(meme.firstSeen), weekKo, meme.id);
    assert.match(formatIsoWeekKo(meme.peak), weekKo, meme.id);
    if (hasFade(meme.fade)) {
      assert.match(formatIsoWeekKo(meme.fade as string), weekKo, meme.id);
    }
  }
});

test('hasFade is false when fade is missing or empty', () => {
  const yareu = memes.find((m) => m.id === 'yareu');
  assert.ok(yareu, 'expected yareu row in data/memes.json');
  assert.equal(hasFade(yareu.fade), false);
  assert.equal(hasFade(undefined), false);
  assert.equal(hasFade(null), false);
  assert.equal(hasFade(''), false);
  assert.equal(hasFade('   '), false);
});

test('hasFade is true for a non-empty week string', () => {
  assert.equal(hasFade('2026-W40'), true);
});

test('needsUnlock is true for sensitive or hidden rows', () => {
  const polyester = memes.find((m) => m.id === 'polyester');
  const shagal = memes.find((m) => m.id === 'shagal');
  const yareu = memes.find((m) => m.id === 'yareu');
  assert.ok(polyester && shagal && yareu);
  assert.equal(polyester.sensitivity, 'sensitive');
  assert.equal(polyester.visibilityDefault, 'hidden');
  assert.equal(needsUnlock(polyester), true);
  assert.equal(shagal.sensitivity, 'sensitive');
  assert.equal(needsUnlock(shagal), true);
  assert.equal(yareu.sensitivity, 'safe');
  assert.equal(yareu.visibilityDefault, 'public');
  assert.equal(needsUnlock(yareu), false);
});

test('maskTerm is a fold label and does not leak the term', () => {
  const polyester = memes.find((m) => m.id === 'polyester');
  assert.ok(polyester);
  assert.equal(maskTerm(polyester.term), '접혀 있음');
  assert.equal(maskTerm(polyester.term).includes(polyester.term), false);
});

test('platformLabel maps optional source platforms and skips missing ones', () => {
  assert.equal(platformLabel(undefined), null);
  assert.equal(platformLabel('x'), 'X');
  assert.equal(platformLabel('instagram'), 'Instagram');
  assert.equal(platformLabel('tiktok'), 'TikTok');
  assert.equal(platformLabel('article'), '기사');
  assert.equal(platformLabel('other'), '기타');
});
