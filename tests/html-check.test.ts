import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatIsoWeekKo, hasFade, needsUnlock, type Meme } from '../src/lib/meme.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const memes = JSON.parse(readFileSync(join(root, 'data/memes.json'), 'utf8')) as Meme[];

function readDist(rel: string): string {
  const path = join(dist, rel);
  assert.ok(existsSync(path), `missing built file: ${rel}`);
  return readFileSync(path, 'utf8');
}

function articleHtml(pageHtml: string, id: string): string {
  const re = new RegExp(
    `<article\\b[^>]*data-meme-id="${id}"[^>]*>[\\s\\S]*?</article>`,
    'i',
  );
  const m = pageHtml.match(re);
  assert.ok(m, `article ${id} missing from HTML`);
  return m[0];
}

function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}

function visibleText(html: string): string {
  return stripScripts(html)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function payloadJson(article: string): string {
  const m = article.match(
    /<script\b[^>]*type="application\/json"[^>]*data-unlock-payload[^>]*>([\s\S]*?)<\/script>/i,
  );
  return m ? m[1] : '';
}

test('wrangler still ships assets.directory = ./dist', () => {
  const toml = readFileSync(join(root, 'wrangler.toml'), 'utf8');
  assert.match(toml, /directory\s*=\s*"\.\/dist"/);
});

test('dist contains home, about, and per-id detail HTML', () => {
  assert.ok(existsSync(join(dist, 'index.html')));
  assert.ok(existsSync(join(dist, 'about/index.html')));
  for (const meme of memes) {
    assert.ok(existsSync(join(dist, `memes/${meme.id}/index.html`)), meme.id);
  }
});

test('locked default HTML has no term/meaning/example text nodes', () => {
  const home = readDist('index.html');
  for (const meme of memes.filter((m) => needsUnlock(m))) {
    const detail = readDist(`memes/${meme.id}/index.html`);
    for (const [label, html] of [
      ['home', home],
      ['detail', detail],
    ] as const) {
      const article = articleHtml(html, meme.id);
      const visible = visibleText(article);
      const payload = payloadJson(article);
      assert.equal(visible.includes(meme.term), false, `${label} ${meme.id} leaked term`);
      assert.equal(visible.includes(meme.meaning), false, `${label} ${meme.id} leaked meaning`);
      assert.equal(visible.includes(meme.example), false, `${label} ${meme.id} leaked example`);
      assert.ok(payload.length > 0, `${label} ${meme.id} missing unlock JSON`);
      assert.ok(payload.includes(meme.term), `${label} ${meme.id} payload missing term`);
      assert.ok(payload.includes(meme.meaning), `${label} ${meme.id} payload missing meaning`);
      assert.ok(payload.includes(meme.example), `${label} ${meme.id} payload missing example`);
      const lockedDom = stripScripts(article);
      for (const src of meme.sources ?? []) {
        assert.equal(
          lockedDom.includes(`href="${src.url}"`),
          false,
          `${label} ${meme.id} source link visible while locked`,
        );
      }
    }
  }
});

test('folded cards use calm fold copy and no alarmist badges', () => {
  const home = readDist('index.html');
  for (const meme of memes.filter((m) => needsUnlock(m))) {
    const detail = readDist(`memes/${meme.id}/index.html`);
    for (const html of [articleHtml(home, meme.id), articleHtml(detail, meme.id)]) {
      const visible = visibleText(html);
      assert.ok(visible.includes('접혀 있음'), meme.id);
      assert.ok(visible.includes('주의하고 열어보기'), meme.id);
      assert.equal(html.includes('class="badge'), false, `${meme.id} badge class`);
      assert.equal(visible.includes('경고'), false, `${meme.id} 경고`);
      assert.equal(visible.includes('위험'), false, `${meme.id} 위험`);
      assert.equal(visible.includes('평가·갈등'), false, `${meme.id} 평가·갈등`);
    }
  }
});

test('public cards include source links and Korean week labels', () => {
  const home = readDist('index.html');
  for (const meme of memes.filter((m) => !needsUnlock(m))) {
    const article = articleHtml(home, meme.id);
    const detail = readDist(`memes/${meme.id}/index.html`);
    const visible = visibleText(article);
    assert.ok(visible.includes(meme.term), meme.id);
    assert.ok(visible.includes(formatIsoWeekKo(meme.firstSeen)), meme.id);
    assert.ok(visible.includes(formatIsoWeekKo(meme.peak)), meme.id);
    for (const src of meme.sources ?? []) {
      assert.ok(article.includes(`href="${src.url}"`), `${meme.id} home ${src.url}`);
      assert.ok(detail.includes(`href="${src.url}"`), `${meme.id} detail ${src.url}`);
    }
  }
});

test('active cards have no fade week row', () => {
  const home = readDist('index.html');
  for (const meme of memes) {
    const article = articleHtml(home, meme.id);
    const detail = readDist(`memes/${meme.id}/index.html`);
    if (meme.status === 'active' || !hasFade(meme.fade)) {
      assert.equal(article.includes('data-field="fade"'), false, `${meme.id} home fade`);
      assert.equal(detail.includes('data-field="fade"'), false, `${meme.id} detail fade`);
    }
  }
});

test('list and unlock markup keep optional source platform labels', () => {
  const entry = readFileSync(join(root, 'src/components/MemeEntry.astro'), 'utf8');
  const vis = readFileSync(join(root, 'src/scripts/visibility.ts'), 'utf8');
  assert.ok(entry.includes('platformLabel'));
  assert.equal((entry.match(/source-platform/g) ?? []).length >= 2, true);
  assert.ok(vis.includes('platformLabel'));
  assert.ok(vis.includes('source-platform'));
  const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');
  assert.ok(css.includes('.source-platform'));
});

test('home and about state the bot-ops experiment', () => {
  const home = visibleText(readDist('index.html'));
  const about = visibleText(readDist('about/index.html'));
  for (const [label, text] of [
    ['home', home],
    ['about', about],
  ] as const) {
    assert.ok(text.includes('수집 → 선정 → 가드 → 배포 요청'), `${label} pipeline`);
    assert.ok(text.includes('Hare'), `${label} Hare`);
    assert.ok(text.includes('정책'), `${label} 정책`);
    assert.ok(text.includes('외부 게시'), `${label} 외부 게시`);
    assert.ok(text.includes('유료'), `${label} 유료`);
    assert.ok(text.includes('도메인'), `${label} 도메인`);
    assert.ok(text.includes('큰 기능'), `${label} 큰 기능`);
    assert.ok(text.includes('장기 봇 운영 실험'), `${label} experiment`);
  }
});
