/**
 * Level check engine for LearnShiny.
 */

/** @typedef {import('./curriculum.js').Check} Check */
/** @typedef {import('./curriculum.js').Graph} Graph */

/**
 * Normalize code for substring checks (stable whitespace).
 *
 * @param {string} code
 * @returns {string}
 */
export function normalizeCode(code) {
  return code.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
}

/**
 * @typedef {{type: string, value: any, pass: boolean, message: string}} CheckResult
 */

/**
 * Run all checks against code and/or graph.
 *
 * @param {Check[]} checks
 * @param {{code?: string, graph?: Graph}} context
 * @returns {{ok: boolean, results: CheckResult[]}}
 */
export function runChecks(checks, context) {
  const code = normalizeCode(context.code ?? '');
  const graph = context.graph ?? { nodes: [], edges: [] };

  /** @type {CheckResult[]} */
  const results = checks.map((check) => evaluateCheck(check, code, graph));
  return { ok: results.every((r) => r.pass), results };
}

/**
 * @param {Check} check
 * @param {string} code
 * @param {Graph} graph
 * @returns {CheckResult}
 */
function evaluateCheck(check, code, graph) {
  switch (check.type) {
    case 'contains': {
      const pass = code.includes(normalizeCode(String(check.value)));
      return {
        type: check.type,
        value: check.value,
        pass,
        message: pass ? `Found: ${check.value}` : `Missing: ${check.value}`,
      };
    }
    case 'notContains': {
      const pass = !code.includes(normalizeCode(String(check.value)));
      return {
        type: check.type,
        value: check.value,
        pass,
        message: pass ? `Absent as required: ${check.value}` : `Should not include: ${check.value}`,
      };
    }
    case 'regex': {
      const re = new RegExp(String(check.value), 'm');
      const pass = re.test(code);
      return {
        type: check.type,
        value: check.value,
        pass,
        message: pass ? 'Pattern matched' : `No match for /${check.value}/`,
      };
    }
    case 'graphHasNode': {
      const spec = check.value;
      const node = graph.nodes.find((n) => n.id === spec.id);
      const pass = !!node && (!spec.kind || node.kind === spec.kind);
      return {
        type: check.type,
        value: check.value,
        pass,
        message: pass
          ? `Node ${spec.id}${spec.kind ? ` (${spec.kind})` : ''} present`
          : `Need node ${spec.id}${spec.kind ? ` (${spec.kind})` : ''}`,
      };
    }
    case 'graphHasEdge':
    case 'graphNoEdge': {
      const spec = check.value;
      const exists = graph.edges.some((e) => e.from === spec.from && e.to === spec.to);
      const pass = check.type === 'graphHasEdge' ? exists : !exists;
      return {
        type: check.type,
        value: check.value,
        pass,
        message: pass
          ? `${spec.from} → ${spec.to} ${check.type === 'graphHasEdge' ? 'present' : 'absent'}`
          : `${spec.from} → ${spec.to} ${check.type === 'graphHasEdge' ? 'missing' : 'must be removed'}`,
      };
    }
    case 'graphMatch': {
      /** @type {Graph} */
      const target = check.value;
      const missingNodes = target.nodes.filter(
        (n) => !graph.nodes.some((g) => g.id === n.id && (!n.kind || g.kind === n.kind)),
      );
      const missingEdges = target.edges.filter(
        (e) => !graph.edges.some((g) => g.from === e.from && g.to === e.to),
      );
      const pass = missingNodes.length === 0 && missingEdges.length === 0;
      const parts = [];
      if (missingNodes.length) {
        parts.push(`nodes ${missingNodes.map((n) => n.id).join(', ')}`);
      }
      if (missingEdges.length) {
        parts.push(`edges ${missingEdges.map((e) => `${e.from}→${e.to}`).join(', ')}`);
      }
      return {
        type: check.type,
        value: check.value,
        pass,
        message: pass ? 'Graph matches target' : `Still need ${parts.join('; ')}`,
      };
    }
    default:
      return {
        type: check.type,
        value: check.value,
        pass: false,
        message: `Unknown check type '${check.type}'`,
      };
  }
}
