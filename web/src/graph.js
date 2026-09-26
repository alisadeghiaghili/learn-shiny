/**
 * Reactive graph model + tiny DSL for LearnShiny.
 *
 * Commands (sandbox and concept levels):
 *   node <kind> <id> [label]
 *   edge <from> <to>
 *   edge-del <from> <to>
 *   node-del <id>
 *   clear
 *   undo
 *   reset
 *   check
 *   help
 *   levels
 */

/** @typedef {import('./curriculum.js').Graph} Graph */
/** @typedef {import('./curriculum.js').GraphNode} GraphNode */
/** @typedef {import('./curriculum.js').GraphEdge} GraphEdge */

const NODE_KINDS = new Set(['input', 'reactive', 'observer', 'output', 'module']);

/**
 * Deep-clone a graph.
 *
 * @param {Graph} graph
 * @returns {Graph}
 */
export function cloneGraph(graph) {
  return {
    nodes: graph.nodes.map((n) => ({ ...n })),
    edges: graph.edges.map((e) => ({ ...e })),
  };
}

/**
 * Empty graph factory.
 *
 * @returns {Graph}
 */
export function emptyGraph() {
  return { nodes: [], edges: [] };
}

/**
 * Parse a multi-line command script into discrete commands.
 *
 * @param {string} script
 * @returns {string[]}
 */
export function parseScript(script) {
  return script
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

/**
 * Apply one command to a graph. Returns a new graph or null if the command
 * is meta (undo/reset/check/help/levels) and must be handled by the shell.
 *
 * @param {Graph} graph
 * @param {string} command
 * @returns {{graph: Graph|null, meta: string|null, error: string|null}}
 */
export function applyCommand(graph, command) {
  const parts = command.trim().split(/\s+/);
  const op = parts[0];

  if (op === 'undo' || op === 'reset' || op === 'check' || op === 'help' || op === 'levels') {
    return { graph: null, meta: op, error: null };
  }

  const next = cloneGraph(graph);

  if (op === 'clear') {
    return { graph: emptyGraph(), meta: null, error: null };
  }

  if (op === 'node') {
    const kind = parts[1];
    const id = parts[2];
    const label = parts.slice(3).join(' ') || id;
    if (!NODE_KINDS.has(kind)) {
      return { graph: null, meta: null, error: `Unknown node kind '${kind}'. Use input|reactive|observer|output|module.` };
    }
    if (!id) {
      return { graph: null, meta: null, error: 'Usage: node <kind> <id> [label]' };
    }
    if (next.nodes.some((n) => n.id === id)) {
      return { graph: null, meta: null, error: `Node '${id}' already exists.` };
    }
    next.nodes.push({ id, kind: /** @type {any} */ (kind), label });
    return { graph: next, meta: null, error: null };
  }

  if (op === 'node-del') {
    const id = parts[1];
    if (!next.nodes.some((n) => n.id === id)) {
      return { graph: null, meta: null, error: `Node '${id}' not found.` };
    }
    next.nodes = next.nodes.filter((n) => n.id !== id);
    next.edges = next.edges.filter((e) => e.from !== id && e.to !== id);
    return { graph: next, meta: null, error: null };
  }

  if (op === 'edge') {
    const from = parts[1];
    const to = parts[2];
    if (!from || !to) {
      return { graph: null, meta: null, error: 'Usage: edge <from> <to>' };
    }
    if (!next.nodes.some((n) => n.id === from) || !next.nodes.some((n) => n.id === to)) {
      return { graph: null, meta: null, error: `Both nodes must exist before connecting (${from} → ${to}).` };
    }
    if (next.edges.some((e) => e.from === from && e.to === to)) {
      return { graph: null, meta: null, error: `Edge ${from} → ${to} already exists.` };
    }
    next.edges.push({ from, to });
    return { graph: next, meta: null, error: null };
  }

  if (op === 'edge-del') {
    const from = parts[1];
    const to = parts[2];
    const before = next.edges.length;
    next.edges = next.edges.filter((e) => !(e.from === from && e.to === to));
    if (next.edges.length === before) {
      return { graph: null, meta: null, error: `Edge ${from} → ${to} not found.` };
    }
    return { graph: next, meta: null, error: null };
  }

  return { graph: null, meta: null, error: `Unknown command '${op}'. Type help.` };
}

/**
 * Serialize a graph back into DSL commands (for export / golf display).
 *
 * @param {Graph} graph
 * @returns {string}
 */
export function graphToScript(graph) {
  const lines = [
    ...graph.nodes.map((n) => `node ${n.kind} ${n.id}${n.label && n.label !== n.id ? ` ${n.label}` : ''}`),
    ...graph.edges.map((e) => `edge ${e.from} ${e.to}`),
  ];
  return lines.join('\n');
}

/**
 * Evaluate a multi-line script, collecting errors.
 *
 * @param {Graph} start
 * @param {string} script
 * @returns {{graph: Graph, commands: number, errors: string[]}}
 */
export function runScript(start, script) {
  let graph = cloneGraph(start);
  const commands = parseScript(script);
  /** @type {string[]} */
  const errors = [];
  let applied = 0;

  for (const cmd of commands) {
    const result = applyCommand(graph, cmd);
    if (result.error) {
      errors.push(result.error);
      continue;
    }
    if (result.graph) {
      graph = result.graph;
      applied += 1;
    }
  }
  return { graph, commands: applied, errors };
}

/**
 * Fire a pulse along edges reachable from `sourceId` (BFS).
 *
 * @param {Graph} graph
 * @param {string} sourceId
 * @returns {{nodes: Set<string>, edges: Set<string>}}
 */
export function pulseFrom(graph, sourceId) {
  /** @type {Set<string>} */
  const nodes = new Set([sourceId]);
  /** @type {Set<string>} */
  const edges = new Set();
  const queue = [sourceId];

  while (queue.length) {
    const current = /** @type {string} */ (queue.shift());
    for (const e of graph.edges) {
      if (e.from !== current) continue;
      const key = `${e.from}->${e.to}`;
      if (edges.has(key)) continue;
      edges.add(key);
      nodes.add(e.to);
      queue.push(e.to);
    }
  }
  return { nodes, edges };
}
