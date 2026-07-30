/**
 * seedStepper.js — Seed string parsing and stepping utilities.
 *
 * Pure string manipulation: no DOM, no state, no side effects.
 */

/**
 * Parse the numeric suffix from a seed string (e.g. "glut-42" → prefix "glut-", width 2, value 42).
 * Returns null if the seed has no trailing number.
 */
export function parseSeed(value) {
  const match = value.trim().match(/^(.*?)(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], digits: match[2], width: match[2].length, value: parseInt(match[2], 10) };
}

/**
 * Compute the next seed value by delta, preserving zero-padding.
 *
 * - "glut-42" +1 → { value: "glut-43" }
 * - "glut-009" +1 → { value: "glut-010" }  (padding preserved)
 * - "glut-0" -1  → { value: "glut-0" }     (floored at 0)
 * - "hello" +1   → { value: "hello-1" }    (appends -1 for non-numeric seeds)
 * - "hello" -1   → null                     (no numeric component to decrement)
 *
 * @param {string} seedText - Current seed text
 * @param {number} delta    - Step delta (+1 for next, -1 for prev)
 * @returns {{ text: string, changed: boolean }|null}
 *   null when backward step is impossible (non-numeric seed),
 *   { text, changed } otherwise (text is the new seed, changed=false if clamped at 0)
 */
export function computeStep(seedText, delta) {
  const parsed = parseSeed(seedText);
  if (!parsed) {
    // Non-numeric seed: only step forward (append -1), backward does nothing
    if (delta > 0) {
      return { text: seedText ? `${seedText}-1` : 'seed-1', changed: true };
    }
    return null;
  }

  const { prefix, width } = parsed;
  const next = Math.max(0, parsed.value + delta);
  const changed = next !== parsed.value;
  return { text: prefix + String(next).padStart(width, '0'), changed };
}
