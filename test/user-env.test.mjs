import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { isTruthyEnvValue } from '../libs/user-env.mjs';

test('isTruthyEnvValue accepts true and 1 only', () => {
  assert.equal(isTruthyEnvValue('true'), true);
  assert.equal(isTruthyEnvValue('TRUE'), true);
  assert.equal(isTruthyEnvValue('1'), true);
  assert.equal(isTruthyEnvValue(1), true);
  assert.equal(isTruthyEnvValue('yes'), false);
  assert.equal(isTruthyEnvValue('false'), false);
});

test('isProtocolDebugEnabled reads AI_PET_DEBUG_PROTOCOL from ~/.ai-pet/.env', async t => {
  const home = await mkdtemp(join(tmpdir(), 'aipet-env-'));
  t.after(() => rm(home, { recursive: true, force: true }));

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;

  try {
    await mkdir(join(home, '.ai-pet'), { recursive: true });
    const envPath = join(home, '.ai-pet', '.env');
    await writeFile(envPath, 'AI_PET_DEBUG_PROTOCOL=true\n', 'utf8');

    const { isProtocolDebugEnabled, resetProtocolDebugCache } =
      await import('../libs/user-env.mjs');

    resetProtocolDebugCache();
    assert.equal(isProtocolDebugEnabled(), true);

    await writeFile(envPath, 'AI_PET_DEBUG_PROTOCOL=0\n', 'utf8');
    resetProtocolDebugCache();
    assert.equal(isProtocolDebugEnabled(), false);
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
