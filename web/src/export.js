/**
 * Export sandbox / level code as a real Shiny app file.
 */

/**
 * @param {'r'|'python'} lang
 * @param {string} code
 * @returns {{filename: string, body: string}}
 */
export function buildExport(lang, code) {
  if (lang === 'r') {
    return {
      filename: 'app.R',
      body: ensureR(code),
    };
  }
  return {
    filename: 'app.py',
    body: ensurePython(code),
  };
}

/**
 * Trigger a browser download.
 *
 * @param {{filename: string, body: string}} file
 */
export function downloadFile(file) {
  const blob = new Blob([file.body], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {string} code
 * @returns {string}
 */
function ensureR(code) {
  const trimmed = code.trim();
  if (!trimmed) {
    return `library(shiny)\n\nui <- fluidPage(\n  titlePanel("LearnShiny export")\n)\n\nserver <- function(input, output, session) {}\n\nshinyApp(ui, server)\n`;
  }
  return trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`;
}

/**
 * @param {string} code
 * @returns {string}
 */
function ensurePython(code) {
  const trimmed = code.trim();
  if (!trimmed) {
    return `from shiny import App, ui\n\napp_ui = ui.page_fluid("LearnShiny export")\n\ndef server(input, output, session):\n    pass\n\napp = App(app_ui, server)\n`;
  }
  return trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`;
}
