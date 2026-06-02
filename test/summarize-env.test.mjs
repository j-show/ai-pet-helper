import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('summarize constants respect ~/.ai-pet/.env overrides', async t => {
  const home = await mkdtemp(join(tmpdir(), 'aipet-summarize-env-'));
  t.after(() => rm(home, { recursive: true, force: true }));

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;

  try {
    await mkdir(join(home, '.ai-pet'), { recursive: true });
    await writeFile(
      join(home, '.ai-pet', '.env'),
      ['AI_PET_SUMMARY_MAX_TITLE=7', 'AI_PET_SUMMARY_MAX_TEXT=89'].join('\n'),
      'utf8'
    );

    // Import with a unique specifier to avoid ESM module cache.
    const summarize = await import(`../libs/summarize.mjs?ts=${Date.now()}`);
    assert.equal(summarize.SUMMARY_MAX_TITLE, 7);
    assert.equal(summarize.SUMMARY_MAX_TEXT, 89);
  } finally {
    if (typeof previousHome === 'string') {
      process.env.HOME = previousHome;
    } else {
      delete process.env.HOME;
    }
    if (typeof previousUserProfile === 'string') {
      process.env.USERPROFILE = previousUserProfile;
    } else {
      delete process.env.USERPROFILE;
    }
  }
});

