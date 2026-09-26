/**
 * Persistent app state for LearnShiny.
 */

const STORAGE_KEY = 'learn-shiny:v1';

/**
 * @typedef {{
 *   lang: 'r'|'python',
 *   solved: Record<string, {commands: number}>,
 *   hintOpen: Record<string, boolean>,
 *   solutionOpen: Record<string, boolean>
 * }} PersistedState
 */

/**
 * @returns {PersistedState}
 */
function defaultState() {
  return {
    lang: 'python',
    solved: {},
    hintOpen: {},
    solutionOpen: {},
  };
}

/**
 * Load persisted state with graceful fallback.
 *
 * @returns {PersistedState}
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

/**
 * Persist state.
 *
 * @param {PersistedState} state
 */
export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Mark a level solved with a golf score.
 *
 * @param {PersistedState} state
 * @param {string} levelId
 * @param {number} commands
 * @returns {PersistedState}
 */
export function markSolved(state, levelId, commands) {
  const prev = state.solved[levelId];
  const best = prev ? Math.min(prev.commands, commands) : commands;
  const next = {
    ...state,
    solved: { ...state.solved, [levelId]: { commands: best } },
  };
  saveState(next);
  return next;
}
