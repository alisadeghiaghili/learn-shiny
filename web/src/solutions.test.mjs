/**
 * Prove every concept-level solution script satisfies its checks.
 * Run: node web/src/solutions.test.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScript, emptyGraph, cloneGraph } from './graph.js';
import { runChecks } from './checks.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', 'curriculum');

let passed = 0;
let failed = 0;

/**
 * @param {string} name
 * @param {boolean} cond
 * @param {string} [detail]
 */
function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`ok  ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

for (const lang of readdirSync(root, { withFileTypes: true })) {
  if (!lang.isDirectory()) continue;
  for (const file of readdirSync(join(root, lang.name))) {
    if (!file.endsWith('.json')) continue;
    const bundle = JSON.parse(readFileSync(join(root, lang.name, file), 'utf8'));
    for (const level of bundle.levels) {
      const id = `${lang.name}/${file}#${level.id}`;
      if (level.track === 'concept' && level.solution) {
        const start = cloneGraph(level.startGraph || emptyGraph());
        const { graph, errors } = runScript(start, level.solution);
        const { ok, results } = runChecks(level.checks, {
          graph,
          code: level.sample || '',
        });
        const detail = results
          .filter((r) => !r.pass)
          .map((r) => r.message)
          .join('; ');
        assert(id, ok && errors.length === 0, [...errors, detail].filter(Boolean).join('; '));
      } else if (level.track === 'code' && level.solution) {
        const { ok, results } = runChecks(level.checks, { code: level.solution });
        const detail = results
          .filter((r) => !r.pass)
          .map((r) => r.message)
          .join('; ');
        assert(id, ok, detail);
      }
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
