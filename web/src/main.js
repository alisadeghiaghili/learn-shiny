/**
 * LearnShiny SPA entry — LGB-style mission + graph + command loop.
 */

import { LANGS, loadCurriculum, allLevels } from './curriculum.js';
import { loadState, saveState, markSolved } from './store.js';
import {
  cloneGraph,
  emptyGraph,
  applyCommand,
  runScript,
  graphToScript,
  pulseFrom,
} from './graph.js';
import { renderGraph } from './graph-view.js';
import { runChecks } from './checks.js';
import { inferWidgets, renderPreview } from './preview.js';
import { buildExport, downloadFile } from './export.js';

/** @typedef {import('./curriculum.js').Level} Level */

const LANG_LABEL = { r: 'R', python: 'Python' };

const app = {
  /** @type {'r'|'python'} */
  lang: 'python',
  /** @type {'concept'|'code'|'sandbox'} */
  mode: 'concept',
  /** @type {Level|null} */
  level: null,
  /** @type {{concept: Level[], code: Level[]}|null} */
  curriculum: null,
  /** @type {import('./graph.js').Graph} */
  graph: emptyGraph(),
  /** @type {import('./graph.js').Graph[]} */
  history: [],
  /** @type {number} */
  commandCount: 0,
  /** @type {string} */
  code: '',
  /** @type {ReturnType<typeof loadState>} */
  persisted: loadState(),
};

const el = {
  langPicker: /** @type {HTMLElement} */ (document.getElementById('lang-picker')),
  trackTabs: /** @type {HTMLElement} */ (document.getElementById('track-tabs')),
  levelList: /** @type {HTMLElement} */ (document.getElementById('level-list')),
  mission: /** @type {HTMLElement} */ (document.getElementById('mission')),
  stage: /** @type {HTMLElement} */ (document.getElementById('stage')),
  stageTabs: /** @type {HTMLElement} */ (document.getElementById('stage-tabs')),
  console: /** @type {HTMLTextAreaElement} */ (document.getElementById('console')),
  editor: /** @type {HTMLTextAreaElement} */ (document.getElementById('editor')),
  status: /** @type {HTMLElement} */ (document.getElementById('status')),
  golf: /** @type {HTMLElement} */ (document.getElementById('golf')),
  btnRun: /** @type {HTMLButtonElement} */ (document.getElementById('btn-run')),
  btnCheck: /** @type {HTMLButtonElement} */ (document.getElementById('btn-check')),
  btnUndo: /** @type {HTMLButtonElement} */ (document.getElementById('btn-undo')),
  btnReset: /** @type {HTMLButtonElement} */ (document.getElementById('btn-reset')),
  btnHint: /** @type {HTMLButtonElement} */ (document.getElementById('btn-hint')),
  btnSolution: /** @type {HTMLButtonElement} */ (document.getElementById('btn-solution')),
  btnExport: /** @type {HTMLButtonElement} */ (document.getElementById('btn-export')),
  btnSandbox: /** @type {HTMLButtonElement} */ (document.getElementById('btn-sandbox')),
};

boot();

async function boot() {
  bindChrome();
  await switchLanguage(app.persisted.lang || 'python');
}

function bindChrome() {
  el.btnRun.addEventListener('click', () => runConsole());
  el.btnCheck.addEventListener('click', () => checkLevel());
  el.btnUndo.addEventListener('click', () => undo());
  el.btnReset.addEventListener('click', () => resetLevel());
  el.btnHint.addEventListener('click', () => toggleHint());
  el.btnSolution.addEventListener('click', () => toggleSolution());
  el.btnExport.addEventListener('click', () => exportApp());
  el.btnSandbox.addEventListener('click', () => enterSandbox());

  el.console.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runConsole();
    }
  });

  el.editor.addEventListener('input', () => {
    app.code = el.editor.value;
    if (app.mode === 'code' || app.mode === 'sandbox') {
      renderPreviewStage();
      setStatus('Code changed — Check when ready.', 'idle');
    }
  });
}

/**
 * @param {'r'|'python'} lang
 */
async function switchLanguage(lang) {
  app.lang = lang;
  app.persisted = { ...app.persisted, lang };
  saveState(app.persisted);
  app.curriculum = await loadCurriculum(lang);
  renderLangPicker();
  renderTrackTabs();
  renderLevelList();
  const levels = levelsForMode(app.mode);
  if (levels.length) openLevel(levels[0]);
  else enterSandbox();
}

/**
 * @param {'concept'|'code'|'sandbox'} mode
 */
function levelsForMode(mode) {
  if (!app.curriculum) return [];
  if (mode === 'concept') return app.curriculum.concept;
  if (mode === 'code') return app.curriculum.code;
  return [];
}

function renderLangPicker() {
  el.langPicker.innerHTML = LANGS.map((lang) => {
    const active = lang === app.lang ? ' is-active' : '';
    return `<button type="button" class="lang-btn${active} lang-${lang}" data-lang="${lang}">${LANG_LABEL[lang]}</button>`;
  }).join('');
  el.langPicker.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = /** @type {'r'|'python'} */ (btn.getAttribute('data-lang'));
      if (lang !== app.lang) switchLanguage(lang);
    });
  });
}

function renderTrackTabs() {
  const tracks = /** @type {const} */ (['concept', 'code', 'sandbox']);
  const labels = { concept: 'Concept', code: 'Code', sandbox: 'Sandbox' };
  el.trackTabs.innerHTML = tracks
    .map((t) => {
      const active = t === app.mode ? ' is-active' : '';
      return `<button type="button" class="tab-btn${active}" data-track="${t}">${labels[t]}</button>`;
    })
    .join('');
  el.trackTabs.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const track = /** @type {'concept'|'code'|'sandbox'} */ (btn.getAttribute('data-track'));
      app.mode = track;
      renderTrackTabs();
      renderLevelList();
      if (track === 'sandbox') enterSandbox();
      else {
        const levels = levelsForMode(track);
        if (levels.length) openLevel(levels[0]);
      }
    });
  });
}

function renderLevelList() {
  if (app.mode === 'sandbox') {
    el.levelList.innerHTML = `<p class="level-note">Free build. Export when done.</p>`;
    return;
  }
  const levels = levelsForMode(app.mode);
  el.levelList.innerHTML = levels
    .map((lvl, i) => {
      const solved = app.persisted.solved[lvl.id];
      const active = app.level?.id === lvl.id ? ' is-active' : '';
      const mark = solved ? ' · ' + solved.commands + '/' + lvl.par : '';
      return `<button type="button" class="level-item${active}${solved ? ' is-solved' : ''}" data-id="${lvl.id}">
        <span class="level-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="level-title">${lvl.title}${mark}</span>
      </button>`;
    })
    .join('');
  el.levelList.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const level = levels.find((l) => l.id === id);
      if (level) openLevel(level);
    });
  });
}

/**
 * @param {Level} level
 */
function openLevel(level) {
  app.level = level;
  app.mode = /** @type {'concept'|'code'} */ (level.track);
  app.graph = cloneGraph(level.startGraph || emptyGraph());
  app.history = [cloneGraph(app.graph)];
  app.commandCount = 0;
  app.code = level.starterCode || '';
  el.editor.value = app.code;
  el.console.value = '';
  el.stage.dataset.view = level.track === 'concept' ? 'graph' : 'preview';
  renderTrackTabs();
  renderLevelList();
  renderMission();
  renderStage();
  updateGolf();
  setStatus(
    level.track === 'concept'
      ? 'Graph DSL ready. Type help for commands, then Check.'
      : 'Edit code on the right, then Check.',
    'idle',
  );
}

function enterSandbox() {
  app.mode = 'sandbox';
  app.level = null;
  app.graph = emptyGraph();
  app.history = [cloneGraph(app.graph)];
  app.commandCount = 0;
  app.code = app.lang === 'r' ? defaultSandboxR() : defaultSandboxPython();
  el.editor.value = app.code;
  el.console.value = '';
  renderTrackTabs();
  renderLevelList();
  renderMission();
  renderStage();
  updateGolf();
  setStatus('Sandbox. Build freely, then export app.R / app.py.', 'idle');
}

function renderMission() {
  if (app.mode === 'sandbox' || !app.level) {
    el.mission.innerHTML = `
      <p class="eyebrow">Sandbox · ${LANG_LABEL[app.lang]}</p>
      <h1 class="mission-title">Build anything</h1>
      <p class="mission-body">Use the graph console (concept DSL) or the code editor.
      There is no hidden target — export a real Shiny app when the shape is right.</p>`;
    return;
  }
  const lvl = app.level;
  const hintOpen = app.persisted.hintOpen[lvl.id];
  const solOpen = app.persisted.solutionOpen[lvl.id];
  el.mission.innerHTML = `
    <p class="eyebrow">${lvl.track} · ${LANG_LABEL[app.lang]} · par ${lvl.par}</p>
    <h1 class="mission-title">${lvl.title}</h1>
    <p class="mission-goal">${lvl.goal}</p>
    <p class="mission-body">${lvl.body.replaceAll('\n', '<br>')}</p>
    ${hintOpen ? `<div class="callout hint"><strong>Hint</strong><p>${lvl.hint}</p></div>` : ''}
    ${solOpen ? `<div class="callout sol"><strong>Solution</strong><pre>${escapeHtml(lvl.solution)}</pre>
      ${lvl.sample ? `<strong>Sample</strong><pre>${escapeHtml(lvl.sample)}</pre>` : ''}</div>` : ''}`;
}

function renderStage() {
  const defaultView = app.mode === 'concept' ? 'graph' : 'preview';
  const view = el.stage.dataset.view || defaultView;

  el.stageTabs.innerHTML = `
    <button type="button" class="tab-btn${view === 'graph' ? ' is-active' : ''}" data-view="graph">Graph</button>
    <button type="button" class="tab-btn${view === 'preview' ? ' is-active' : ''}" data-view="preview">UI preview</button>`;

  el.stageTabs.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      el.stage.dataset.view = btn.getAttribute('data-view') || 'graph';
      renderStage();
    });
  });

  if (view === 'graph') {
    const pulse = pulseFrom(app.graph, app.graph.nodes[0]?.id || '');
    el.stage.innerHTML = `<div id="graph-host" class="stage-host"></div>`;
    renderGraph(/** @type {HTMLElement} */ (document.getElementById('graph-host')), app.graph, {
      pulseNodes: pulse.nodes,
      pulseEdges: pulse.edges,
    });
  } else {
    el.stage.innerHTML = `<div id="preview-host" class="stage-host"></div>`;
    renderPreviewStage();
  }

  document.body.dataset.mode = app.mode;
}

function renderPreviewStage() {
  const host = document.getElementById('preview-host');
  if (!host) return;
  renderPreview(host, inferWidgets(app.code, app.lang));
}

function updateGolf() {
  const par = app.level?.par;
  el.golf.textContent = par != null ? `golf ${app.commandCount} / par ${par}` : `commands ${app.commandCount}`;
}

/**
 * @param {string} text
 * @param {'idle'|'ok'|'err'} kind
 */
function setStatus(text, kind) {
  el.status.textContent = text;
  el.status.dataset.kind = kind;
}

function runConsole() {
  const script = el.console.value;
  if (!script.trim()) {
    setStatus('Console is empty.', 'err');
    return;
  }
  // Apply line by line so errors stop the batch but prior lines stick
  const lines = script.split('\n');
  /** @type {string[]} */
  const leftovers = [];
  /** @type {string[]} */
  const errors = [];
  let ran = 0;

  for (const line of lines) {
    const cleaned = line.replace(/#.*$/, '').trim();
    if (!cleaned) {
      leftovers.push(line);
      continue;
    }
    const result = applyCommand(app.graph, cleaned);
    if (result.error) {
      errors.push(result.error);
      leftovers.push(line);
      continue;
    }
    if (result.graph) {
      app.history.push(cloneGraph(app.graph));
      app.graph = result.graph;
      app.commandCount += 1;
      ran += 1;
    }
    if (result.meta === 'undo') {
      undo();
    }
    if (result.meta === 'reset') {
      resetLevel();
    }
    if (result.meta === 'check') {
      checkLevel();
    }
    if (result.meta === 'help') {
      setStatus(
        'Commands: node <kind> <id> [label] · node-del <id> · edge <a> <b> · edge-del <a> <b> · clear · undo · reset · check · help',
        'idle',
      );
    }
    if (result.meta === 'levels') {
      setStatus('Pick a level in the left list, or open Sandbox.', 'idle');
    }
  }

  el.console.value = leftovers.join('\n');
  renderStage();
  updateGolf();
  if (errors.length) setStatus(errors[0], 'err');
  else setStatus(`Applied ${ran} command${ran === 1 ? '' : 's'}.`, 'ok');
}

function undo() {
  if (app.history.length <= 1) {
    setStatus('Nothing to undo.', 'idle');
    return;
  }
  app.history.pop();
  app.graph = cloneGraph(/** @type {typeof app.graph} */ (app.history[app.history.length - 1]));
  app.commandCount = Math.max(0, app.commandCount - 1);
  renderStage();
  updateGolf();
  setStatus('Undid last change.', 'idle');
}

function resetLevel() {
  if (app.level) {
    app.graph = cloneGraph(app.level.startGraph || emptyGraph());
    app.code = app.level.starterCode || '';
  } else {
    app.graph = emptyGraph();
    app.code = app.lang === 'r' ? defaultSandboxR() : defaultSandboxPython();
  }
  app.history = [cloneGraph(app.graph)];
  app.commandCount = 0;
  el.editor.value = app.code;
  el.console.value = '';
  renderStage();
  updateGolf();
  setStatus('Reset.', 'idle');
}

function checkLevel() {
  if (app.mode === 'sandbox' || !app.level) {
    setStatus('Sandbox has no target. Use Export instead.', 'idle');
    return;
  }
  const { ok, results } = runChecks(app.level.checks, { code: app.code, graph: app.graph });
  if (ok) {
    app.persisted = markSolved(app.persisted, app.level.id, app.commandCount || 1);
    renderLevelList();
    renderMission();
    setStatus(
      `Solved in ${app.commandCount || 1} (par ${app.level.par}). Circuit locked.`,
      'ok',
    );
    flashLockIn();
  } else {
    const failed = results.filter((r) => !r.pass).map((r) => r.message);
    setStatus(failed[0] || 'Not yet.', 'err');
  }
}

function flashLockIn() {
  el.stage.classList.add('is-lock');
  window.setTimeout(() => el.stage.classList.remove('is-lock'), 320);
}

function toggleHint() {
  if (!app.level) return;
  const id = app.level.id;
  app.persisted = {
    ...app.persisted,
    hintOpen: { ...app.persisted.hintOpen, [id]: !app.persisted.hintOpen[id] },
  };
  saveState(app.persisted);
  renderMission();
}

function toggleSolution() {
  if (!app.level) return;
  const id = app.level.id;
  app.persisted = {
    ...app.persisted,
    solutionOpen: { ...app.persisted.solutionOpen, [id]: !app.persisted.solutionOpen[id] },
  };
  saveState(app.persisted);
  renderMission();
}

function exportApp() {
  const file = buildExport(app.lang, app.code);
  downloadFile(file);
  setStatus(`Downloaded ${file.filename}.`, 'ok');
}

function defaultSandboxPython() {
  return `from shiny import App, ui, render\n\napp_ui = ui.page_sidebar(\n    ui.sidebar(\n        ui.input_slider(\"x\", \"X\", 0, 10, 1),\n    ),\n    ui.output_text(\"out\"),\n)\n\ndef server(input, output, session):\n    @output\n    @render.text\n    def out():\n        return f\"x is {input.x()}\"\n\napp = App(app_ui, server)\n`;
}

function defaultSandboxR() {
  return `library(shiny)\n\nui <- fluidPage(\n  sliderInput(\"x\", \"X\", 0, 10, 1),\n  textOutput(\"out\")\n)\n\nserver <- function(input, output, session) {\n  output$out <- renderText({\n    paste(\"x is\", input$x)\n  })\n}\n\nshinyApp(ui, server)\n`;
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
