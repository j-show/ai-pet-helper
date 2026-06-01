#!/usr/bin/env node
/**
 * Run all `test/*.test.mjs` files (shell-independent; avoids glob expansion issues).
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = readdirSync(path.join(root, 'test'))
  .filter(name => name.endsWith('.test.mjs'))
  .map(name => path.join('test', name));

if (files.length === 0) {
  console.error('No test files found in test/');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: root,
  stdio: 'inherit'
});

process.exit(result.status === null ? 1 : result.status);
