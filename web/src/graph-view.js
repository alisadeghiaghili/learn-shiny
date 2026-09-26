/**
 * SVG renderer for Shiny reactive graphs.
 */

/** @typedef {import('./curriculum.js').Graph} Graph */

const KIND_COLOR = {
  input: 'var(--py)',
  reactive: 'var(--pulse)',
  observer: 'var(--muted)',
  output: 'var(--ok)',
  module: 'var(--r)',
};

/**
 * Render graph into a container element.
 *
 * @param {HTMLElement} container
 * @param {Graph} graph
 * @param {{pulseNodes?: Set<string>, pulseEdges?: Set<string>, highlightNodes?: Set<string>}} [fx]
 */
export function renderGraph(container, graph, fx = {}) {
  const width = 720;
  const height = 360;
  const layout = layoutGraph(graph, width, height);

  /** @type {Map<string, {x: number, y: number}>} */
  const pos = new Map(layout.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));

  const edgeSvg = graph.edges
    .map((e) => {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) return '';
      const key = `${e.from}->${e.to}`;
      const live = fx.pulseEdges?.has(key);
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
        class="g-edge${live ? ' is-live' : ''}"
        marker-end="url(#arrow)" />`;
    })
    .join('');

  const nodeSvg = layout.nodes
    .map((n) => {
      const live = fx.pulseNodes?.has(n.id);
      const hi = fx.highlightNodes?.has(n.id);
      const color = KIND_COLOR[n.kind] || 'var(--muted)';
      return `<g class="g-node${live ? ' is-live' : ''}${hi ? ' is-hi' : ''}" transform="translate(${n.x},${n.y})">
        <circle r="18" fill="var(--surface-2)" stroke="${color}" stroke-width="${live || hi ? 2.5 : 1.5}" />
        <text y="4" text-anchor="middle" class="g-label">${escapeText(n.label || n.id)}</text>
        <text y="34" text-anchor="middle" class="g-kind">${n.kind}</text>
      </g>`;
    })
    .join('');

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" class="graph-svg" role="img" aria-label="Reactive graph">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
      </marker>
    </defs>
    ${edgeSvg}
    ${nodeSvg}
  </svg>`;

  if (!graph.nodes.length) {
    container.innerHTML = `<div class="graph-empty">Graph is empty. Add nodes with <code>node input x</code></div>`;
  }
}

/**
 * Column-by-column layered layout (inputs left, outputs right).
 *
 * @param {Graph} graph
 * @param {number} width
 * @param {number} height
 * @returns {{nodes: Array<{id: string, kind: string, label: string, x: number, y: number}>}}
 */
function layoutGraph(graph, width, height) {
  const depth = new Map();
  const indeg = new Map();
  for (const n of graph.nodes) {
    depth.set(n.id, 0);
    indeg.set(n.id, 0);
  }
  for (const e of graph.edges) {
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
  }

  // longest-path layering
  let changed = true;
  let guard = 0;
  while (changed && guard < 32) {
    changed = false;
    guard += 1;
    for (const e of graph.edges) {
      const next = (depth.get(e.from) || 0) + 1;
      if (next > (depth.get(e.to) || 0)) {
        depth.set(e.to, next);
        changed = true;
      }
    }
  }

  /** @type {Map<number, string[]>} */
  const layers = new Map();
  for (const n of graph.nodes) {
    const d = depth.get(n.id) || 0;
    if (!layers.has(d)) layers.set(d, []);
    /** @type {string[]} */ (layers.get(d)).push(n.id);
  }

  const maxLayer = Math.max(0, ...layers.keys());
  const paddingX = 70;
  const paddingY = 50;
  const layerWidth = (width - paddingX * 2) / Math.max(1, maxLayer + 1);

  /** @type {Array<{id: string, kind: string, label: string, x: number, y: number}>} */
  const nodes = [];
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  for (const [d, ids] of layers) {
    ids.forEach((id, i) => {
      const n = /** @type {NonNullable<typeof byId extends Map<string, infer T> ? T : never>} */ (byId.get(id));
      const x = paddingX + d * layerWidth;
      const y = paddingY + ((height - paddingY * 2) * (i + 0.5)) / ids.length;
      nodes.push({ id: n.id, kind: n.kind, label: n.label || n.id, x, y });
    });
  }
  return { nodes };
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeText(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
