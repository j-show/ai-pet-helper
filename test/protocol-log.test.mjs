import assert from 'node:assert/strict';
import { readFile, rm, mkdir, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('logProtocolActivation writes to <sessionId>.log', async t => {
  const home = await mkdtemp(join(tmpdir(), 'aipet-log-'));
  t.after(() => rm(home, { recursive: true, force: true }));

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;

  const sessionUuid = '00893aaf-19fa-41d2-8238-13269b9b3ca0';

  try {
    await mkdir(join(home, '.ai-pet'), { recursive: true });
    await writeFile(
      join(home, '.ai-pet', '.env'),
      'AI_PET_DEBUG_PROTOCOL=1\n',
      'utf8'
    );

    const { resetProtocolDebugCache } = await import('../libs/user-env.mjs');
    const { openAipet } = await import('../libs/aipet.mjs');

    resetProtocolDebugCache();

    await openAipet('aipet://waiting', { sessionId: sessionUuid });

    const logPath = join(home, '.ai-pet', 'logs', `${sessionUuid}.log`);
    const content = await readFile(logPath, 'utf8');
    assert.match(content, /protocol=aipet:\/\/waiting/);
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

test('runHook resolves session id from transcript_path basename', async t => {
  const home = await mkdtemp(join(tmpdir(), 'aipet-log-'));
  t.after(() => rm(home, { recursive: true, force: true }));

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;

  const sessionUuid = '11111111-2222-4333-8444-555555555555';
  const transcriptPath = join(
    home,
    '.claude',
    'projects',
    'demo',
    `${sessionUuid}.jsonl`
  );

  try {
    await mkdir(join(home, '.ai-pet'), { recursive: true });
    await writeFile(
      join(home, '.ai-pet', '.env'),
      'AI_PET_DEBUG_PROTOCOL=true\n',
      'utf8'
    );
    await mkdir(join(home, '.claude', 'projects', 'demo'), {
      recursive: true
    });
    await writeFile(transcriptPath, '', 'utf8');

    const { resetProtocolDebugCache } = await import('../libs/user-env.mjs');
    const { spawn } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');

    resetProtocolDebugCache();

    const script = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../utils/on-session-start.mjs'
    );

    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [script], {
        env: { ...process.env, HOME: home, USERPROFILE: home },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      child.stdin.write(
        JSON.stringify({
          hook_event_name: 'SessionStart',
          transcript_path: transcriptPath
        })
      );
      child.stdin.end();
      child.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`hook exited ${code}`));
        }
      });
    });

    const logPath = join(home, '.ai-pet', 'logs', `${sessionUuid}.log`);
    const content = await readFile(logPath, 'utf8');
    assert.match(content, /hook=on-session-start/);
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
