#!/usr/bin/env node
/**
 * Merge inbox/grok/*.json meme arrays into data/memes.json.
 * Validates schema, fails on duplicate ids, deletes successfully merged inbox files.
 */
import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inboxDir = join(root, 'inbox', 'grok');
const memesPath = join(root, 'data', 'memes.json');

const REQUIRED = [
  'id',
  'term',
  'meaning',
  'example',
  'firstSeen',
  'peak',
  'sourceCount',
  'tags',
  'status',
  'sensitivity',
  'visibilityDefault',
  'updatedAt',
];

const PLATFORMS = new Set(['x', 'instagram', 'tiktok', 'article', 'other']);

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exitCode = 1;
}

function warn(msg) {
  console.warn(`WARN: ${msg}`);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateSource(src, ctx) {
  if (!src || typeof src !== 'object' || Array.isArray(src)) {
    fail(`${ctx}: each source must be an object`);
    return;
  }
  if (!isNonEmptyString(src.label)) fail(`${ctx}: source.label required`);
  if (!isNonEmptyString(src.url)) fail(`${ctx}: source.url required`);
  if (src.platform !== undefined && !PLATFORMS.has(src.platform)) {
    fail(`${ctx}: source.platform must be one of ${[...PLATFORMS].join(', ')}`);
  }
}

function validateMeme(meme, ctx) {
  if (!meme || typeof meme !== 'object' || Array.isArray(meme)) {
    fail(`${ctx}: meme must be an object`);
    return null;
  }

  for (const key of REQUIRED) {
    if (!(key in meme) || meme[key] === undefined || meme[key] === null) {
      fail(`${ctx}: missing required field "${key}"`);
    }
  }

  if (!isNonEmptyString(meme.id)) fail(`${ctx}: id must be a non-empty string`);
  if (!isNonEmptyString(meme.term)) fail(`${ctx}: term must be a non-empty string`);
  if (!isNonEmptyString(meme.meaning)) fail(`${ctx}: meaning must be a non-empty string`);
  if (!isNonEmptyString(meme.example)) fail(`${ctx}: example must be a non-empty string`);
  if (!isNonEmptyString(meme.firstSeen)) fail(`${ctx}: firstSeen must be a non-empty string`);
  if (!isNonEmptyString(meme.peak)) fail(`${ctx}: peak must be a non-empty string`);
  if (!isNonEmptyString(meme.updatedAt)) fail(`${ctx}: updatedAt must be a non-empty string`);

  if (typeof meme.sourceCount !== 'number' || !Number.isFinite(meme.sourceCount)) {
    fail(`${ctx}: sourceCount must be a number`);
  }

  if (!Array.isArray(meme.tags) || !meme.tags.every((t) => typeof t === 'string')) {
    fail(`${ctx}: tags must be an array of strings`);
  }

  if (meme.status !== 'active' && meme.status !== 'faded') {
    fail(`${ctx}: status must be "active" or "faded"`);
  }

  if (meme.sensitivity !== 'safe' && meme.sensitivity !== 'sensitive') {
    fail(`${ctx}: sensitivity must be "safe" or "sensitive"`);
  }

  if (meme.visibilityDefault !== 'public' && meme.visibilityDefault !== 'hidden') {
    fail(`${ctx}: visibilityDefault must be "public" or "hidden"`);
  }

  const hasFade =
    meme.fade !== undefined &&
    meme.fade !== null &&
    !(typeof meme.fade === 'string' && meme.fade.trim() === '');

  if (hasFade && meme.status !== 'faded') {
    fail(`${ctx}: fade is only allowed when status === "faded" (got status="${meme.status}")`);
  }

  if (meme.status === 'faded' && !hasFade) {
    warn(`${ctx}: status is "faded" but fade week is missing`);
  }

  // Auto-fix: sensitive => visibilityDefault hidden
  let out = { ...meme };
  if (out.sensitivity === 'sensitive' && out.visibilityDefault !== 'hidden') {
    warn(
      `${ctx}: sensitivity is "sensitive" but visibilityDefault="${out.visibilityDefault}" — auto-fixing to "hidden"`,
    );
    out = { ...out, visibilityDefault: 'hidden' };
  }

  if (out.sources !== undefined) {
    if (!Array.isArray(out.sources)) {
      fail(`${ctx}: sources must be an array`);
    } else {
      out.sources.forEach((s, i) => validateSource(s, `${ctx}.sources[${i}]`));
    }
  }

  // Strip empty fade on active (after validation already rejected non-empty fade)
  if (out.status === 'active' && 'fade' in out) {
    const { fade: _fade, ...rest } = out;
    out = rest;
  }

  return out;
}

function listInboxJson() {
  if (!existsSync(inboxDir)) {
    console.log(`No inbox directory at ${inboxDir}; nothing to merge.`);
    return [];
  }
  return readdirSync(inboxDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => join(inboxDir, name))
    .sort();
}

function main() {
  const files = listInboxJson();
  if (files.length === 0) {
    console.log('No inbox/grok/*.json files to merge.');
    return;
  }

  let memes;
  try {
    memes = JSON.parse(readFileSync(memesPath, 'utf8'));
  } catch (e) {
    fail(`Failed to load ${memesPath}: ${e.message}`);
    return;
  }
  if (!Array.isArray(memes)) {
    fail('data/memes.json must be a JSON array');
    return;
  }

  const existingIds = new Set(memes.map((m) => m.id));
  const batchIds = new Set();
  const toAppend = [];
  const mergedFiles = [];

  for (const file of files) {
    let raw;
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      fail(`${file}: invalid JSON — ${e.message}`);
      continue;
    }
    if (!Array.isArray(raw)) {
      fail(`${file}: root must be a JSON array of meme objects`);
      continue;
    }

    const fileMemes = [];
    let fileOk = true;
    raw.forEach((item, i) => {
      const ctx = `${file}[${i}]`;
      const validated = validateMeme(item, ctx);
      if (process.exitCode) {
        fileOk = false;
        return;
      }
      if (!validated) {
        fileOk = false;
        return;
      }
      if (existingIds.has(validated.id) || batchIds.has(validated.id)) {
        fail(`${ctx}: duplicate id "${validated.id}"`);
        fileOk = false;
        return;
      }
      batchIds.add(validated.id);
      fileMemes.push(validated);
    });

    if (fileOk && !process.exitCode) {
      toAppend.push(...fileMemes);
      mergedFiles.push(file);
    }
  }

  if (process.exitCode) {
    console.error('Validation failed; memes.json was not updated; inbox files left in place.');
    process.exit(1);
  }

  if (toAppend.length === 0) {
    console.log('Nothing to append.');
    return;
  }

  const updated = [...memes, ...toAppend];
  writeFileSync(memesPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  console.log(`Appended ${toAppend.length} meme(s) → ${memesPath}`);

  for (const file of mergedFiles) {
    unlinkSync(file);
    console.log(`Deleted ${file}`);
  }

  console.log(`Done. Total memes: ${updated.length}`);
}

main();
