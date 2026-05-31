import assert from 'node:assert/strict';
import { test } from 'node:test';

import { openAipet, openAipetSequence, sleep } from '../libs/aipet.mjs';

test('openAipet rejects non-aipet URLs', async () => {
  await assert.rejects(
    () => openAipet('https://example.com'),
    /Invalid aipet URL/
  );
  await assert.rejects(() => openAipet(''), /Invalid aipet URL/);
});

test('sleep resolves after the requested delay', async () => {
  const start = Date.now();
  await sleep(40);
  assert.ok(Date.now() - start >= 35);
});

test('openAipetSequence opens URLs in order via dev bridge', async () => {
  const seen = [];
  const original = globalThis.fetch;
  globalThis.fetch = async input => {
    const requestUrl = new URL(String(input));
    seen.push(requestUrl.searchParams.get('url'));
    return { ok: true };
  };

  try {
    await openAipetSequence(['aipet://base', 'aipet://waving?count=1'], 0);
  } finally {
    globalThis.fetch = original;
  }

  assert.deepEqual(seen, ['aipet://base', 'aipet://waving?count=1']);
});
