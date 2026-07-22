/**
 * Build the plain-text representation of all logs for the history view.
 *
 * @param {Array} logs — G.logs array (most-recent-first)
 * @returns {string}
 */
export function buildLogHistoryText(logs) {
  return (logs && logs.length > 0)
    ? logs.slice().reverse().map(e => typeof e === 'string' ? e : (e.plainText || '')).join('\n')
    : 'No history yet.';
}
