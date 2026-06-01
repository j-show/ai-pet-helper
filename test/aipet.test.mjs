import assert from 'node:assert/strict';
import { test } from 'node:test';

import { openAipet } from '../libs/aipet.mjs';

test('openAipet rejects non-aipet URLs', async () => {
  await assert.rejects(
    () => openAipet('https://example.com'),
    /Invalid aipet URL/
  );
  await assert.rejects(() => openAipet(''), /Invalid aipet URL/);
});
