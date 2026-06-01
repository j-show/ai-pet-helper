import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('readState defaults to idle; writeState merges patches', async t => {
  const home = await mkdtemp(join(tmpdir(), 'aipet-state-'));
  t.after(() => rm(home, { recursive: true, force: true }));

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;

  try {
    const { readState, writeState } = await import('../libs/state.mjs');

    assert.deepEqual(readState(), { phase: 'idle' });

    const next = writeState({ phase: 'working' });
    assert.equal(next.phase, 'working');
    assert.ok(typeof next.updatedAt === 'number');

    assert.equal(readState().phase, 'working');
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
