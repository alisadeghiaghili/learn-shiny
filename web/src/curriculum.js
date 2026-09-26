/**
 * Shared curriculum registry for LearnShiny.
 *
 * Bundles live as JSON under curriculum/{lang}/{track}.json.
 * This module is the single browser entry point.
 */

/** @typedef {{id: string, label: string, kind: 'input'|'reactive'|'observer'|'output'|'module'}} GraphNode */
/** @typedef {{from: string, to: string}} GraphEdge */
/** @typedef {{nodes: GraphNode[], edges: GraphEdge[]}} Graph */
/** @typedef {{type: string, value: any}} Check */
/** @typedef {{
 *   id: string,
 *   track: 'concept'|'code',
 *   title: string,
 *   goal: string,
 *   body: string,
 *   hint: string,
 *   par: number,
 *   startGraph: Graph,
 *   targetGraph: Graph,
 *   starterCode: string,
 *   checks: Check[],
 *   solution: string,
 *   sample?: string
 * }} Level */

const LANGS = /** @type {const} */ (['r', 'python']);

/**
 * Resolve curriculum JSON in local (`web/src/`) and flattened Pages layouts.
 *
 * @param {string} lang
 * @param {string} track
 * @returns {Promise<{levels: Level[]}>}
 */
async function loadBundleJson(lang, track) {
  const file = `${lang}/${track}.json`;
  const candidates = [
    new URL(`../../curriculum/${file}`, import.meta.url),
    new URL(`../curriculum/${file}`, import.meta.url),
    new URL(`./curriculum/${file}`, import.meta.url),
  ];
  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // try next layout
    }
  }
  throw new Error(`Failed to load curriculum bundle ${file}`);
}

/**
 * Load every level bundle for a language.
 *
 * @param {string} lang
 * @returns {Promise<{concept: Level[], code: Level[]}>}
 */
export async function loadCurriculum(lang) {
  if (!LANGS.includes(/** @type {any} */ (lang))) {
    throw new Error(`Unknown language: ${lang}`);
  }
  const [conceptJson, codeJson] = await Promise.all([
    loadBundleJson(lang, 'concept'),
    loadBundleJson(lang, 'code'),
  ]);
  return { concept: conceptJson.levels, code: codeJson.levels };
}

/**
 * Flatten tracks in teaching order.
 *
 * @param {{concept: Level[], code: Level[]}} curriculum
 * @returns {Level[]}
 */
export function allLevels(curriculum) {
  return [...curriculum.concept, ...curriculum.code];
}

export { LANGS };
