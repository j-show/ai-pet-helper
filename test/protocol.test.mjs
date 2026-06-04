import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildTextProtocolUrl } from '../libs/protocol.mjs';

test('buildTextProtocolUrl encodes sty and legacy stp alias', () => {
  const url = buildTextProtocolUrl({
    sty: 'cursor',
    sid: 'sess-1',
    title: '标题',
    text: '摘要',
    icon: 'error'
  });
  const parsed = new URL(url);

  assert.equal(parsed.protocol, 'aipet:');
  assert.equal(parsed.host, 'text');
  assert.equal(parsed.searchParams.get('sty'), 'cursor');
  assert.equal(parsed.searchParams.get('stp'), null);
  assert.equal(parsed.searchParams.get('sid'), 'sess-1');
  assert.equal(parsed.searchParams.get('tl'), '标题');
  assert.equal(parsed.searchParams.get('txt'), '摘要');
  assert.equal(parsed.searchParams.get('icon'), 'error');
});

test('buildTextProtocolUrl accepts stp as sty fallback', () => {
  const url = buildTextProtocolUrl({ stp: 'claude', sid: 's', text: 'x' });
  const parsed = new URL(url);

  assert.equal(parsed.searchParams.get('sty'), 'claude');
});

test('buildTextProtocolUrl omits icon and tl when txt is empty', () => {
  const url = buildTextProtocolUrl({
    sid: 'sess-1',
    title: '标题',
    icon: 'error'
  });
  const parsed = new URL(url);

  assert.equal(parsed.searchParams.get('txt'), null);
  assert.equal(parsed.searchParams.get('tl'), null);
  assert.equal(parsed.searchParams.get('icon'), null);
  assert.equal(parsed.searchParams.get('sid'), 'sess-1');
});
