/**
 * Mock UI preview for code levels and sandbox export preview.
 * Renders a simple widget chrome — not a live Shiny runtime.
 */

/**
 * Infer a minimal widget list from code text.
 *
 * @param {string} code
 * @param {'r'|'python'} lang
 * @returns {{kind: string, label: string, id: string}[]}
 */
export function inferWidgets(code, lang) {
  /** @type {{kind: string, label: string, id: string}[]} */
  const widgets = [];
  const text = code;

  /** @type {Array<[RegExp, string]>} */
  const patterns =
    lang === 'python'
      ? [
          [/input_slider\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g, 'slider'],
          [/input_text\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g, 'text'],
          [/input_numeric\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g, 'numeric'],
          [/input_action_button\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g, 'button'],
          [/output_text\(\s*["']([^"']+)["']/g, 'output'],
          [/output_plot\(\s*["']([^"']+)["']/g, 'plot'],
        ]
      : [
          [/sliderInput\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g, 'slider'],
          [/textInput\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g, 'text'],
          [/numericInput\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g, 'numeric'],
          [/actionButton\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g, 'button'],
          [/textOutput\(\s*["']([^"']+)["']/g, 'output'],
          [/plotOutput\(\s*["']([^"']+)["']/g, 'plot'],
        ];

  for (const [re, kind] of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const id = m[1];
      const label = m[2] || id;
      if (!widgets.some((w) => w.id === id)) {
        widgets.push({ kind, label, id });
      }
    }
  }
  return widgets;
}

/**
 * Render mock app chrome into a container.
 *
 * @param {HTMLElement} container
 * @param {{kind: string, label: string, id: string}[]} widgets
 */
export function renderPreview(container, widgets) {
  if (!widgets.length) {
    container.innerHTML = `<div class="preview-empty">No widgets detected yet.</div>`;
    return;
  }

  const controls = widgets.filter((w) => w.kind !== 'output' && w.kind !== 'plot');
  const outputs = widgets.filter((w) => w.kind === 'output' || w.kind === 'plot');

  const controlHtml = controls
    .map((w) => {
      if (w.kind === 'button') {
        return `<button type="button" class="pv-btn" disabled>${escape(w.label)}</button>`;
      }
      if (w.kind === 'slider' || w.kind === 'numeric') {
        return `<label class="pv-field"><span>${escape(w.label)}</span>
          <input type="range" disabled /><span class="pv-id">[${escape(w.id)}]</span></label>`;
      }
      return `<label class="pv-field"><span>${escape(w.label)}</span>
        <input type="text" disabled placeholder="…" /><span class="pv-id">[${escape(w.id)}]</span></label>`;
    })
    .join('');

  const outputHtml = outputs
    .map((w) => {
      if (w.kind === 'plot') {
        return `<div class="pv-plot"><span class="pv-id">[${escape(w.id)}]</span><em>plot</em></div>`;
      }
      return `<div class="pv-out"><span class="pv-id">[${escape(w.id)}]</span><em>text output</em></div>`;
    })
    .join('');

  container.innerHTML = `
    <div class="preview-app">
      <aside class="preview-side">${controlHtml || '<p class="preview-empty">No inputs</p>'}</aside>
      <main class="preview-main">${outputHtml || '<p class="preview-empty">No outputs</p>'}</main>
    </div>`;
}

/**
 * @param {string} text
 * @returns {string}
 */
function escape(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
