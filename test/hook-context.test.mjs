import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('persistHookContext stores transcript_path for later Stop hooks', async t => {
  const home = await mkdtemp(join(tmpdir(), 'aipet-ctx-'));
  t.after(() => rm(home, { recursive: true, force: true }));

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;

  try {
    const { persistHookContext } = await import('../libs/hook-context.mjs');
    const { readState } = await import('../libs/state.mjs');

    persistHookContext({
      session_id: 'sess-1',
      transcript_path: join(home, 'session.jsonl')
    });

    const state = readState();
    assert.equal(state.sessionId, 'sess-1');
    assert.equal(state.transcriptPath, join(home, 'session.jsonl'));
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

test('persistHookContext discovers transcript when stdin is empty', async t => {
  const home = await mkdtemp(join(tmpdir(), 'aipet-ctx-discover-'));
  t.after(() => rm(home, { recursive: true, force: true }));

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;

  const sessionUuid = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
  const cwd = join(home, 'github', 'jshow', 'ai-pet-helper');
  const transcriptPath = join(
    home,
    '.cursor',
    'projects',
    'd-github-jshow-ai-pet-helper',
    'agent-transcripts',
    sessionUuid,
    `${sessionUuid}.jsonl`
  );

  try {
    await mkdir(
      join(
        home,
        '.cursor',
        'projects',
        'd-github-jshow-ai-pet-helper',
        'agent-transcripts',
        sessionUuid
      ),
      { recursive: true }
    );
    await mkdir(cwd, { recursive: true });
    await writeFile(transcriptPath, '', 'utf8');

    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      const { persistHookContext } = await import('../libs/hook-context.mjs');
      const state = persistHookContext(null);

      assert.equal(state.sessionId, sessionUuid);
      assert.ok(state.transcriptPath?.includes(sessionUuid));
    } finally {
      process.chdir(originalCwd);
    }
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
