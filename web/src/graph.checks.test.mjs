/**
 * Node test runner for LearnShiny graph + checks (no browser required).
 * Run: node web/src/graph.checks.test.mjs
 */

import { applyCommand, runScript, cloneGraph, emptyGraph, pulseFrom, graphToScript } from './graph.js';
import { runChecks, normalizeCode } from './checks.js';

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

// graph DSL
{
  let g = emptyGraph();
  g = /** @type {any} */ (applyCommand(g, 'node input x').graph);
  g = /** @type {any} */ (applyCommand(g, 'node output out').graph);
  g = /** @type {any} */ (applyCommand(g, 'edge x out').graph);
  assert('build input→output', g.nodes.length === 2 && g.edges.length === 1);
  assert('unknown op errors', applyCommand(g, 'foo').error !== null);
  assert('dup node errors', applyCommand(g, 'node input x').error !== null);
  const del = applyCommand(g, 'edge-del x out');
  assert('edge-del works', del.graph?.edges.length === 0);
}

{
  const { graph, commands, errors } = runScript(
    emptyGraph(),
    `# comment\nnode input x\nnode reactive y\nnode output out\nedge x y\nedge y out\n`,
  );
  assert('runScript counts', commands === 5 && errors.length === 0);
  assert('runScript chain', graph.edges.length === 2);
  const script = graphToScript(graph);
  assert('graphToScript roundtrip nodes', script.includes('node input x') && script.includes('edge y out'));
}

{
  const g = {
    nodes: [
      { id: 'x', kind: 'input', label: 'x' },
      { id: 'y', kind: 'reactive', label: 'y' },
      { id: 'out', kind: 'output', label: 'out' },
    ],
    edges: [
      { from: 'x', to: 'y' },
      { from: 'y', to: 'out' },
    ],
  };
  const pulse = pulseFrom(g, 'x');
  assert('pulse reaches out', pulse.nodes.has('out') && pulse.edges.has('x->y'));
}

// checks
{
  const code = 'from shiny import App, ui, render\napp = App(app_ui, server)\n';
  const r = runChecks(
    [
      { type: 'contains', value: 'App(' },
      { type: 'notContains', value: 'req(' },
      { type: 'regex', value: 'from shiny' },
    ],
    { code },
  );
  assert('code checks pass', r.ok);
  const bad = runChecks([{ type: 'contains', value: 'missing_token' }], { code });
  assert('contains fails', !bad.ok);
}

{
  const graph = {
    nodes: [
      { id: 'x', kind: 'input', label: 'x' },
      { id: 'out', kind: 'output', label: 'out' },
    ],
    edges: [{ from: 'x', to: 'out' }],
  };
  const ok = runChecks(
    [
      {
        type: 'graphMatch',
        value: {
          nodes: [
            { id: 'x', kind: 'input' },
            { id: 'out', kind: 'output' },
          ],
          edges: [{ from: 'x', to: 'out' }],
        },
      },
      { type: 'graphNoEdge', value: { from: 'out', to: 'x' } },
    ],
    { graph },
  );
  assert('graphMatch + noEdge', ok.ok);
  const missing = runChecks(
    [
      {
        type: 'graphMatch',
        value: {
          nodes: [{ id: 'y', kind: 'reactive' }],
          edges: [{ from: 'y', to: 'out' }],
        },
      },
    ],
    { graph },
  );
  assert('graphMatch detects missing', !missing.ok);
}

{
  assert('normalizeCode collapses space', normalizeCode('a   b\n  c') === 'a b\nc');
  const cloned = cloneGraph(emptyGraph());
  assert('clone empty', cloned.nodes.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
