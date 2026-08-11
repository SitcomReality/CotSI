/**
 * lineDiff.js — Zero-dependency line diff for the save-review modal.
 *
 * Longest-common-subsequence diff between two texts, rendered as aligned
 * side-by-side rows. Descriptor files are a few hundred lines, so the O(n·m)
 * DP is comfortably fast here — no imports, no DOM, pure data.
 *
 * Each row: `{ type: 'same' | 'del' | 'add', left?, right? }` — `same` rows
 * carry both sides, `del` only the left (removed) line, `add` only the right
 * (added) line. Equal lines stay aligned so the eye can follow what moved.
 */

/**
 * Diff `aText` against `bText` line by line.
 * @param {string} aText - the before (current on-disk) source
 * @param {string} bText - the after (what a save would write) source
 * @returns {Array<{type: string, left?: string, right?: string}>}
 */
export function diffLines(aText, bText) {
  const a = aText.split('\n');
  const b = bText.split('\n');
  const n = a.length;
  const m = b.length;

  // LCS table (dp[i][j] = LCS length of a[i..] vs b[j..]).
  const dp = new Array(n + 1);
  for (let i = 0; i <= n; i += 1) dp[i] = new Array(m + 1).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Walk the table back to a shortest edit script.
  const rows = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: 'same', left: a[i], right: b[j] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: 'del', left: a[i] });
      i += 1;
    } else {
      rows.push({ type: 'add', right: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    rows.push({ type: 'del', left: a[i] });
    i += 1;
  }
  while (j < m) {
    rows.push({ type: 'add', right: b[j] });
    j += 1;
  }
  return rows;
}
